import { parse } from '@babel/parser'

const functionTypes = new Set([
  'ArrowFunctionExpression',
  'FunctionDeclaration',
  'FunctionExpression',
  'ObjectMethod',
  'ClassMethod',
  'ClassPrivateMethod',
])

const loopTypes = new Set([
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
])

const nestingTypes = new Set([
  'IfStatement',
  ...loopTypes,
  'SwitchStatement',
  'TryStatement',
  'CatchClause',
  'ConditionalExpression',
])

const ignoredKeys = new Set([
  'loc',
  'start',
  'end',
  'extra',
  'comments',
  'tokens',
])

function parserPlugins(path) {
  const extension = path.split('.').pop()?.toLowerCase()

  if (['ts', 'mts', 'cts'].includes(extension)) {
    return ['typescript']
  }

  if (extension === 'tsx') {
    return [['typescript', { allExtensions: true, isTSX: true }], 'jsx']
  }

  return ['jsx']
}

export function analyzeCodeStructure(source, path) {
  const ast = parse(source, {
    sourceType: 'unambiguous',
    plugins: parserPlugins(path),
  })

  const metrics = {
    maxNestingDepth: 0,
    maxFunctionNestingDepth: 0,
    conditionalCount: 0,
    loopCount: 0,
    switchCount: 0,
    tryCatchCount: 0,
    returnCount: 0,
    throwCount: 0,
    functionCount: 0,
    classCount: 0,
    blockCount: 0,
  }

  const stack = [{
    node: ast.program,
    nestingDepth: 0,
    functionDepth: 0,
  }]

  while (stack.length > 0) {
    const current = stack.pop()
    const { node, nestingDepth, functionDepth } = current

    if (!node || typeof node.type !== 'string') continue

    const isFunction = functionTypes.has(node.type)
    const isNesting = nestingTypes.has(node.type)

    let nextNestingDepth = nestingDepth
    let nextFunctionDepth = functionDepth

    if (isNesting) {
      nextNestingDepth += 1
      metrics.maxNestingDepth = Math.max(
        metrics.maxNestingDepth,
        nextNestingDepth,
      )
    }

    if (isFunction) {
      nextFunctionDepth += 1
      metrics.functionCount += 1
      metrics.maxFunctionNestingDepth = Math.max(
        metrics.maxFunctionNestingDepth,
        nextFunctionDepth,
      )
    }

    if (node.type === 'IfStatement' || node.type === 'ConditionalExpression') {
      metrics.conditionalCount += 1
    }

    if (loopTypes.has(node.type)) {
      metrics.loopCount += 1
    }

    if (node.type === 'SwitchStatement') {
      metrics.switchCount += 1
    }

    if (node.type === 'TryStatement' || node.type === 'CatchClause') {
      metrics.tryCatchCount += 1
    }

    if (node.type === 'ReturnStatement') {
      metrics.returnCount += 1
    }

    if (node.type === 'ThrowStatement') {
      metrics.throwCount += 1
    }

    if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
      metrics.classCount += 1
    }

    if (node.type === 'BlockStatement') {
      metrics.blockCount += 1
    }

    for (const [key, value] of Object.entries(node)) {
      if (ignoredKeys.has(key)) continue

      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child === 'object') {
            stack.push({
              node: child,
              nestingDepth: nextNestingDepth,
              functionDepth: nextFunctionDepth,
            })
          }
        }
      } else if (value && typeof value === 'object') {
        stack.push({
          node: value,
          nestingDepth: nextNestingDepth,
          functionDepth: nextFunctionDepth,
        })
      }
    }
  }

  return metrics
}
