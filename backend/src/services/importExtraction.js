const maximumReferences = 500
const skippedKeys = new Set([
  'loc', 'start', 'end', 'extra', 'comments', 'tokens',
  'leadingComments', 'trailingComments', 'innerComments',
])

function literalValue(node) {
  if (node?.type === 'StringLiteral') return node.value
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? null
  }
  return null
}

export function extractModuleReferences(program) {
  const references = new Map()

  function add(source, kind, node, typeOnly = false) {
    if (typeof source !== 'string' || !source) return
    const key = `${kind}:${source}`
    if (references.has(key) || references.size >= maximumReferences) return
    references.set(key, { source, kind, typeOnly, line: node.loc?.start.line ?? null })
  }

  const stack = [program]
  while (stack.length > 0) {
    const node = stack.pop()

    switch (node.type) {
      case 'ImportDeclaration':
        add(node.source.value, 'import', node, node.importKind === 'type')
        break
      case 'ExportNamedDeclaration':
      case 'ExportAllDeclaration':
        if (node.source) add(node.source.value, 'export-from', node, node.exportKind === 'type')
        break
      case 'TSImportEqualsDeclaration':
        if (node.moduleReference?.type === 'TSExternalModuleReference') {
          add(literalValue(node.moduleReference.expression), 'import-equals', node)
        }
        break
      case 'CallExpression':
        if (node.callee?.type === 'Identifier' && node.callee.name === 'require') {
          add(literalValue(node.arguments[0]), 'require', node)
        } else if (node.callee?.type === 'Import') {
          add(literalValue(node.arguments[0]), 'dynamic-import', node)
        }
        break
      case 'ImportExpression':
        add(literalValue(node.source), 'dynamic-import', node)
        break
      default:
        break
    }

    for (const [key, value] of Object.entries(node)) {
      if (skippedKeys.has(key)) continue
      const children = Array.isArray(value) ? value : [value]
      for (const child of children) {
        if (child && typeof child.type === 'string') stack.push(child)
      }
    }
  }

  return [...references.values()].sort((a, b) => (a.line ?? 0) - (b.line ?? 0))
}