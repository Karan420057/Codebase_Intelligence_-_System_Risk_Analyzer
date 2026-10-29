import { analyzeCode, CodeAnalysisError } from './codeAnalysis.js';
import { fetchGithubFile, fetchGithubRepository } from './github.js';
import { buildDependencyGraph } from './dependencyGraph.js';
import { depthFirstSearch, breadthFirstSearch } from './graphTraversal.js';
import { detectCycles } from './cycleDetection.js';

const sourceExtensions = new Set([
  '.js', '.jsx', '.mjs', '.cjs',
  '.ts', '.tsx', '.mts', '.cts',
]);

const maximumFiles = 150;
const concurrency = 5;

function isSupportedSource(path) {
  const segments = path.toLowerCase().split('/');
  const filename = segments.at(-1);
  const extension = filename.slice(filename.lastIndexOf('.'));

  return sourceExtensions.has(extension)
    && !segments.some((part) =>
      ['node_modules', 'dist', 'build', '.git', 'coverage'].includes(part)
    )
    && !filename.includes('.min.')
    && !filename.includes('.generated.');
}

export async function analyzeRepositoryDependencies(
  owner,
  repo,
  requestedStart,
) {
  const repository = await fetchGithubRepository(owner, repo);
  const sourceFiles = repository.files
    .filter((file) => isSupportedSource(file.path))
    .slice(0, maximumFiles);

  const analyses = [];
  const fileErrors = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < sourceFiles.length) {
      const file = sourceFiles[nextIndex++];
      try {
        const result = await fetchGithubFile(
          owner,
          repo,
          file.path,
          repository.repository.defaultBranch,
        );

        if (result.isBinary || typeof result.content !== 'string') {
          continue;
        }

        try {
          const analysis = analyzeCode(result.content, file.path);
          analyses.push({
            path: file.path,
            imports: analysis.imports,
          });
        } catch (error) {
          if (!(error instanceof CodeAnalysisError)) throw error;

          fileErrors.push({
            path: file.path,
            error: error.message,
          });
        }
      } catch (error) {
        fileErrors.push({
          path: file.path,
          error: error.message || 'Unable to fetch this file.',
        });
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, sourceFiles.length) },
      () => worker(),
    ),
  );

  analyses.sort((a, b) => a.path.localeCompare(b.path));

  const result = buildDependencyGraph(analyses);
  const start = result.graph.has(requestedStart)
    ? requestedStart
    : analyses[0]?.path;

  const dfs = start
    ? depthFirstSearch(result.graph, start)
    : { order: [], visited: [] };

  const bfs = start
    ? breadthFirstSearch(result.graph, start)
    : { order: [], visited: [], distances: {} };

  const cycleResult = detectCycles(result.graph);

  return {
    repository: repository.repository.fullName,
    branch: repository.repository.defaultBranch,
    languages: repository.languages || [],
    summary: {
      analyzedFiles: result.fileCount,
      dependencyEdges: result.edgeCount,
      unresolvedImports: result.unresolved.length,
      circularDependencies: cycleResult.cycleCount,
      cycleDetectionTruncated: cycleResult.truncated,
      fileErrors: fileErrors.length,
      filesTruncated: sourceFiles.length < repository.files.filter(
        (file) => isSupportedSource(file.path),
      ).length,
    },
    files: result.files,
    unresolvedImports: result.unresolved,
    cycles: cycleResult.cycles,
    traversals: {
      startFile: start || null,
      dfs: dfs.order,
      bfs: bfs.order,
      bfsDistances: bfs.distances,
    },
    fileErrors,
  };
}
