import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeCode, CodeAnalysisError } from './codeAnalysis.js'

test('analyzes JavaScript AST structure and declarations', () => {
  const result = analyzeCode(
    'import value from "value"; export class Example { run(input) { const output = input; return output; } }',
    'src/example.js',
  )

  assert.equal(result.language, 'JavaScript')
  assert.equal(result.classCount, 1)
  assert.equal(result.functionCount, 1)
  assert.equal(result.variableDeclarationCount, 1)
  assert.equal(result.importCount, 1)
  assert.equal(result.imports[0].source, 'value')
})

test('reports total import count when import details are truncated', () => {
  const source = Array.from({ length: 101 }, (_, index) => `import "module-${index}";`).join('\n')
  const result = analyzeCode(source, 'src/imports.js')

  assert.equal(result.importCount, 101)
  assert.equal(result.imports.length, 100)
  assert.equal(result.detailsTruncated, true)
})

test('parses TypeScript JSX files', () => {
  const result = analyzeCode(
    'const Component = (props: { label: string }) => <h1>{props.label}</h1>',
    'src/Component.tsx',
  )

  assert.equal(result.language, 'TypeScript')
  assert.equal(result.functionCount, 1)
})

test('labels named and context-aware functions without changing AST function counts', () => {
  const path = 'src/routes.js'
  const result = analyzeCode(
    [
      'function declared() {}',
      'const expression = function internal() {};',
      'const arrow = () => {};',
      'items.map(value => value);',
      'app.get("/health", (req, res) => res.send("ok"));',
      'button.addEventListener("click", function() {});',
      'setTimeout(() => {}, 0);',
      'run(() => {});',
    ].join('\n'),
    path,
  )

  assert.equal(result.functionCount, 8)
  const functionsInSourceOrder = result.functions.slice().sort((first, second) => first.line - second.line)
  assert.deepEqual(
    functionsInSourceOrder.map(({ label }) => label),
    [
      'declared',
      'internal',
      'arrow',
      'Array Mapping Callback',
      'Express Route Handler',
      'Event Handler',
      'Timer Callback',
      'Inline Function (Line 8)',
    ],
  )
  assert.ok(functionsInSourceOrder.every((item) => item.path === path))
  assert.ok(functionsInSourceOrder.every((item) => Number.isInteger(item.line)))
  assert.equal(functionsInSourceOrder[0].type, 'FunctionDeclaration')
  assert.equal(functionsInSourceOrder[1].type, 'FunctionExpression')
  assert.equal(functionsInSourceOrder[2].type, 'ArrowFunctionExpression')
})

test('labels JSX callbacks as event handlers and uses line fallback for unrelated callbacks', () => {
  const result = analyzeCode(
    'const View = () => <button onClick={() => {}} />',
    'src/View.jsx',
  )

  assert.deepEqual(
    result.functions
      .slice()
      .sort((first, second) => first.line - second.line)
      .map(({ label }) => label),
    ['View', 'Event Handler'],
  )
})

test('reports syntax errors with source positions', () => {
  assert.throws(
    () => analyzeCode('const = ;', 'src/broken.js'),
    (error) => error instanceof CodeAnalysisError
      && error.status === 422
      && error.message.includes('line 1'),
  )
})

test('rejects files outside supported languages and oversized files', () => {
  assert.throws(
    () => analyzeCode('contents', 'README.md'),
    (error) => error instanceof CodeAnalysisError && error.status === 415,
  )
  assert.throws(
    () => analyzeCode('x'.repeat(1024 * 1024 + 1), 'src/large.js'),
    (error) => error instanceof CodeAnalysisError && error.status === 413,
  )
})
