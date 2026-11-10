import { analyzeCode, CodeAnalysisError } from './codeAnalysis.js';
import { fetchGithubFile, fetchGithubRepository } from './github.js';
import { buildDependencyGraph } from './dependencyGraph.js';
import { depthFirstSearch, breadthFirstSearch } from './graphTraversal.js';
import { detectCycles } from './cycleDetection.js';
import { analyzeCodeStructure } from './codeStructureAnalyzer.js';
import { extractImportDependencies } from './importDependencyExtractor.js';

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
  // const repository = await fetchGithubRepository(owner, repo);
  // const sourceFiles = repository.files
  //   .filter((file) => isSupportedSource(file.path))
  //   .slice(0, maximumFiles);

  const repository = await fetchGithubRepository(owner, repo);

  const allSourceFiles = repository.files.filter(
    (file) => isSupportedSource(file.path)
  );

  const sourceFiles = allSourceFiles.slice(0, maximumFiles);

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
          // const analysis = analyzeCode(result.content, file.path);
          // analyses.push({
          //   path: file.path,
          //   imports: analysis.imports,
          //   linesOfCode: analysis.linesOfCode,
          //   nodeCount: analysis.nodeCount,
          //   functionCount: analysis.functionCount,
          //   classCount: analysis.classCount,
          //   importCount: analysis.importCount,
          //   callCount: analysis.callCount,
          // });

          const analysis = analyzeCode(result.content, file.path);

          const structure = analyzeCodeStructure(
            result.content,
            file.path,
          );

          analyses.push({
            path: file.path,
            imports: analysis.imports,
            linesOfCode: analysis.linesOfCode,
            nodeCount: analysis.nodeCount,
            functionCount: analysis.functionCount,
            classCount: analysis.classCount,
            importCount: analysis.importCount,
            callCount: analysis.callCount,
            variableDeclarationCount: analysis.variableDeclarationCount,
            structure,
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

  // analyses.sort((a, b) => a.path.localeCompare(b.path));

  // const result = buildDependencyGraph(analyses);

  analyses.sort((a, b) => a.path.localeCompare(b.path));
  const extracted = extractImportDependencies(analyses);
  const result = buildDependencyGraph(
    analyses,
    extracted,
  );

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

  const structureSummary = analyses.reduce((summary, analysis) => {
    const structure = analysis.structure;

    summary.maxNestingDepth = Math.max(
      summary.maxNestingDepth,
      structure.maxNestingDepth,
    );

    summary.maxFunctionNestingDepth = Math.max(
      summary.maxFunctionNestingDepth,
      structure.maxFunctionNestingDepth,
    );

    for (const key of [
      'conditionalCount',
      'loopCount',
      'switchCount',
      'tryCatchCount',
      'returnCount',
      'throwCount',
      'blockCount',
    ]) {
      summary[key] += structure[key];
    }

    return summary;
  }, {
    maxNestingDepth: 0,
    maxFunctionNestingDepth: 0,
    conditionalCount: 0,
    loopCount: 0,
    switchCount: 0,
    tryCatchCount: 0,
    returnCount: 0,
    throwCount: 0,
    blockCount: 0,
  });

  // const astSummary = analyses.reduce((summary, analysis) => ({
  //   astNodes: summary.astNodes + analysis.nodeCount,
  //   functionCount: summary.functionCount + analysis.functionCount,
  //   classCount: summary.classCount + analysis.classCount,
  //   importCount: summary.importCount + analysis.importCount,
  //   callCount: summary.callCount + analysis.callCount,
  // }), {
  //   astNodes: 0,
  //   functionCount: 0,
  //   classCount: 0,
  //   importCount: 0,
  //   callCount: 0,
  // });

  const astSummary = analyses.reduce((summary, analysis) => ({
    astNodes: summary.astNodes + analysis.nodeCount,
    functionCount: summary.functionCount + analysis.functionCount,
    classCount: summary.classCount + analysis.classCount,
    importCount: summary.importCount + analysis.importCount,
    callCount: summary.callCount + analysis.callCount,
    variableDeclarationCount:
      summary.variableDeclarationCount + analysis.variableDeclarationCount,
  }), {
    astNodes: 0,
    functionCount: 0,
    classCount: 0,
    importCount: 0,
    callCount: 0,
    variableDeclarationCount: 0,
  });

  const graphFiles = result.files.map((file) => {
    const analysis = analyses.find(
      (item) => item.path === file.path,
    );

    return {
      ...file,
      linesOfCode: analysis?.linesOfCode ?? 0,
      nodeCount: analysis?.nodeCount ?? 0,
      functionCount: analysis?.functionCount ?? 0,
      classCount: analysis?.classCount ?? 0,
      importCount: analysis?.importCount ?? 0,
      callCount: analysis?.callCount ?? 0,
      variableDeclarationCount:
        analysis?.variableDeclarationCount ?? 0,
      structure: analysis?.structure ?? null,
    };
  });

  return {
    repository: repository.repository.fullName,
    branch: repository.repository.defaultBranch,
    languages: repository.languages || [],
    // summary: {
    //   analyzedFiles: result.fileCount,
    //   linesOfCode: repository.loc,
    //   ...astSummary,
    //   dependencyEdges: result.edgeCount,
    //   unresolvedImports: result.unresolved.length,
    //   circularDependencies: cycleResult.cycleCount,
    //   cycleDetectionTruncated: cycleResult.truncated,
    //   fileErrors: fileErrors.length,
    //   filesTruncated: sourceFiles.length < repository.files.filter(
    //     (file) => isSupportedSource(file.path),
    //   ).length,
    // },
    // files: result.files,
    // unresolvedImports: result.unresolved,

    summary: {
      analyzedFiles: result.fileCount,
      linesOfCode: repository.loc,
      ...astSummary,
      ...structureSummary,
      dependencyEdges: result.edgeCount,
      internalImports: result.internalImportCount,
      externalImports: result.external.length,
      unresolvedImports: result.unresolved.length,
      circularDependencies: cycleResult.cycleCount,
      cycleDetectionTruncated: cycleResult.truncated,
      fileErrors: fileErrors.length,
      filesTruncated: sourceFiles.length < allSourceFiles.length,
    },
    files: graphFiles,
    unresolvedImports: result.unresolved,
    externalImports: result.external,
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
