const loopTypes = new Set([
  'ForStatement', 'ForInStatement', 'ForOfStatement',
  'WhileStatement', 'DoWhileStatement',
])
const functionTypes = new Set([
  'ArrowFunctionExpression', 'ClassMethod', 'ClassPrivateMethod',
  'FunctionDeclaration', 'FunctionExpression', 'ObjectMethod',
])
const skippedKeys = new Set([
  'loc', 'start', 'end', 'extra', 'comments', 'tokens',
  'leadingComments', 'trailingComments', 'innerComments',
])
const logicalOperators = new Set(['&&', '||', '??'])

function countCodeLines(source) {
  if (!source) return 0
  return source.split(/\r\n|\n|\r/).filter((line) => line.trim() !== '').length
}


export function measureCodeStructure(program, source) {
  let maxNestingDepth = 0
  let deepestNestingLine = null
  let maxFunctionNesting = 0
  let controlStructureCount = 0
  let decisionPoints = 0

  const stack = [{ node: program, parent: null, key: null, depth: 0, functionDepth: 0 }]

  while (stack.length > 0) {
    const { node, parent, key, depth, functionDepth } = stack.pop()
    let childDepth = depth
    let childFunctionDepth = functionDepth

    const isControl = node.type === 'IfStatement'
      || loopTypes.has(node.type)
      || node.type === 'SwitchStatement'
      || node.type === 'TryStatement'
    // "else if" continues the same level instead of nesting deeper.
    const isElseIf = node.type === 'IfStatement'
      && parent?.type === 'IfStatement'
      && key === 'alternate'

    if (isControl) {
      controlStructureCount += 1
      if (!isElseIf) {
        childDepth = depth + 1
        if (childDepth > maxNestingDepth) {
          maxNestingDepth = childDepth
          deepestNestingLine = node.loc?.start.line ?? null
        }
      }
    }

    if (functionTypes.has(node.type)) {
      childFunctionDepth = functionDepth + 1
      maxFunctionNesting = Math.max(maxFunctionNesting, childFunctionDepth)
    }

    if (
      node.type === 'IfStatement'
      || loopTypes.has(node.type)
      || node.type === 'ConditionalExpression'
      || node.type === 'CatchClause'
      || (node.type === 'SwitchCase' && node.test)
      || (node.type === 'LogicalExpression' && logicalOperators.has(node.operator))
    ) {
      decisionPoints += 1
    }

    for (const [childKey, value] of Object.entries(node)) {
      if (skippedKeys.has(childKey)) continue
      const children = Array.isArray(value) ? value : [value]
      for (const child of children) {
        if (child && typeof child.type === 'string') {
          stack.push({
            node: child,
            parent: node,
            key: childKey,
            depth: childDepth,
            functionDepth: childFunctionDepth,
          })
        }
      }
    }
  }

  return {
    linesOfCode: countCodeLines(source),
    maxNestingDepth,
    deepestNestingLine,
    maxFunctionNesting,
    controlStructureCount,
    cyclomaticComplexity: decisionPoints + 1,
  }
}