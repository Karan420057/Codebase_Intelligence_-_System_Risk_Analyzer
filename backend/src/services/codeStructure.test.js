import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeCode } from './codeAnalysis.js'
import { buildDependencyGraph } from './dependencyGraph.js'
import { detectCycles } from './cycleDetection.js'
import { buildGraphModel } from './dependencyGraphModel.js'

test('measures nesting depth and treats else-if as the same level', () => {
  const source = [
    'function run(items) {',
    '  for (const item of items) {',
    '    if (item.a) {',
    '      while (item.b) {',
    '        item.b -= 1',
    '      }',
    '    } else if (item.c) {',
    '      return 1',
    '    }',
    '  }',
    '}',
  ].join('\n')
  const { structure } = analyzeCode(source, 'src/a.js')

  assert.equal(structure.maxNestingDepth, 3)
  assert.equal(structure.deepestNestingLine, 4)
  assert.equal(structure.controlStructureCount, 4)
  assert.equal(structure.cyclomaticComplexity, 5)
})

test('extracts import, require, export-from and dynamic import references', () => {
  const source = [
    "import a from './a.js'",
    "const b = require('./b')",
    "export * from './c'",
    "const d = () => import('./d')",
    "const e = require('react')",
  ].join('\n')
  const result = analyzeCode(source, 'src/index.js')

  assert.deepEqual(
    result.moduleReferences.map((item) => item.source),
    ['./a.js', './b', './c', './d', 'react'],
  )
  assert.equal(result.importCount, 1)
})

test('builds nodes, edges, cycle flags and external packages', () => {
  const analyses = [
    { path: 'src/a.js', imports: [{ source: './b' }, { source: 'react' }] },
    { path: 'src/b.js', imports: [{ source: './a' }] },
  ]
  const graph = buildDependencyGraph(analyses)
  const cycles = detectCycles(graph.graph)
  const model = buildGraphModel(graph, analyses, cycles.cycles)

  assert.equal(model.edges.length, 2)
  assert.deepEqual(model.externalDependencies.map((item) => item.name), ['react'])
  assert.ok(model.nodes.every((node) => node.inCycle))
})