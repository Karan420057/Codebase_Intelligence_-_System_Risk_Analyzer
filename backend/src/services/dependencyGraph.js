const extensions = [
  '.js', '.jsx', '.mjs', '.cjs',
  '.ts', '.tsx', '.mts', '.cts',
];

function normalizePath(path) {
  const parts = [];

  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue;

    if (part === '..') {
      parts.pop();
    } else {
      parts.push(part);
    }
  }

  return parts.join('/');
}

function resolveImport(importer, source, files) {
  if (typeof source !== 'string' || !source.startsWith('.')) {
    return null;
  }

  const directory = importer.includes('/')
    ? importer.slice(0, importer.lastIndexOf('/'))
    : '';

  const base = normalizePath(`${directory}/${source}`);

  const candidates = [
    base,
    ...extensions.map((extension) => base + extension),
    ...extensions.map((extension) => `${base}/index${extension}`),
  ];

  return candidates.find((candidate) => files.has(candidate)) || null;
}

export function buildDependencyGraph(analyses) {
  const fileSet = new Set(analyses.map((item) => item.path));
  const graph = new Map();
  const unresolved = [];
  const importCounts = new Map();

  for (const analysis of analyses) {
    graph.set(analysis.path, new Set());
    importCounts.set(analysis.path, analysis.imports.length);
  }

  for (const analysis of analyses) {
    const dependencies = graph.get(analysis.path);

    for (const item of analysis.imports) {
      const resolved = resolveImport(
        analysis.path,
        item.source,
        fileSet,
      );

      if (resolved) {
        dependencies.add(resolved);
      } else {
        unresolved.push({
          file: analysis.path,
          source: item.source,
        });
      }
    }
  }

  const incoming = new Map(
    [...graph.keys()].map((path) => [path, 0]),
  );

  for (const dependencies of graph.values()) {
    for (const dependency of dependencies) {
      incoming.set(dependency, incoming.get(dependency) + 1);
    }
  }

  const files = [...graph.entries()].map(([path, dependencies]) => ({
    path,
    dependencyCount: dependencies.size,
    importDeclarationCount: importCounts.get(path) || 0,
    dependentCount: incoming.get(path) || 0,
    dependencies: [...dependencies].sort(),
  }));

  return {
    graph,
    files,
    fileCount: graph.size,
    edgeCount: files.reduce(
      (total, file) => total + file.dependencyCount,
      0,
    ),
    unresolved,
  };
}
