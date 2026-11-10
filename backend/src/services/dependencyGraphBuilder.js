export function buildDependencyGraph(analyses, extractedDependencies) {
  const graph = new Map()
  const importCounts = new Map()

  for (const analysis of analyses) {
    graph.set(analysis.path, new Set())
    importCounts.set(analysis.path, analysis.imports?.length || 0)
  }

  for (const item of extractedDependencies.imports) {
    graph.get(item.file)?.add(item.resolved)
  }

  const incoming = new Map(
    [...graph.keys()].map((path) => [path, 0]),
  )

  for (const dependencies of graph.values()) {
    for (const dependency of dependencies) {
      incoming.set(
        dependency,
        (incoming.get(dependency) || 0) + 1,
      )
    }
  }

  const files = [...graph.entries()].map(([path, dependencies]) => ({
    path,
    dependencyCount: dependencies.size,
    importDeclarationCount: importCounts.get(path) || 0,
    dependentCount: incoming.get(path) || 0,
    dependencies: [...dependencies].sort(),
  }))

  return {
    graph,
    files,
    fileCount: graph.size,
    edgeCount: files.reduce(
      (total, file) => total + file.dependencyCount,
      0,
    ),
    unresolved: extractedDependencies.unresolved,
    external: extractedDependencies.external,
    internalImportCount: extractedDependencies.imports.length,
  }
}
