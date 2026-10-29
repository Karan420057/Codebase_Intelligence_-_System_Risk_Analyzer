import { parse } from '@babel/parser'

const supportedExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts'])
const maximumSourceBytes = 1024 * 1024
const maximumDetails = 100
const functionNodeTypes = new Set([
  'ArrowFunctionExpression',
  'ClassMethod',
  'ClassPrivateMethod',
  'FunctionDeclaration',
  'FunctionExpression',
  'ObjectMethod',
])

export class CodeAnalysisError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'CodeAnalysisError'
    this.status = status
  }
}

function getExtension(path) {
  const filename = path.split('/').at(-1).toLowerCase()
  const extension = filename.slice(filename.lastIndexOf('.'))
  return supportedExtensions.has(extension) ? extension : null
}

function getFunctionName(node, parent) {
  if (node.id?.name) return node.id.name
  if (parent?.type === 'VariableDeclarator' && parent.id?.name) return parent.id.name
  if (parent?.type === 'AssignmentExpression') {
    if (parent.left?.type === 'Identifier') return parent.left.name
    if (parent.left?.type === 'MemberExpression') {
      return parent.left.property?.name || parent.left.property?.value || null
    }
  }
  if (node.key?.name || node.key?.value) return node.key.name || node.key.value
  if (parent?.type === 'ObjectProperty') return parent.key?.name || parent.key?.value || null
  return null
}

function getCallName(call) {
  if (call?.type !== 'CallExpression') return null
  if (call.callee?.type === 'Identifier') return call.callee.name
  if (call.callee?.type === 'MemberExpression') {
    return call.callee.property?.name || call.callee.property?.value || null
  }
  return null
}

function isLiteralRoutePath(node) {
  return node?.type === 'StringLiteral'
    || node?.type === 'TemplateLiteral' && node.expressions.length === 0
}

function getContextLabel(node, parent, key, ancestors) {
  if (parent?.type === 'CallExpression' && key === 'arguments') {
    const callName = getCallName(parent)
    const argumentIndex = parent.arguments.indexOf(node)

    if (['setTimeout', 'setInterval', 'setImmediate'].includes(callName) && argumentIndex === 0) {
      return 'Timer Callback'
    }

    if (callName === 'map' && argumentIndex >= 0) {
      return 'Array Mapping Callback'
    }

    if (
      ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'all'].includes(callName)
      && parent.arguments.length > 1
      && isLiteralRoutePath(parent.arguments[0])
      && argumentIndex > 0
    ) {
      return 'Express Route Handler'
    }

    if (
      ['addEventListener', 'on', 'once'].includes(callName)
      && argumentIndex === 1
      && parent.arguments[0]?.type === 'StringLiteral'
    ) {
      return 'Event Handler'
    }
  }

  if (parent?.type === 'JSXExpressionContainer' && key === 'expression') {
    const jsxAttribute = ancestors.at(-2)
    const attributeName = jsxAttribute?.type === 'JSXAttribute'
      ? jsxAttribute.name?.name
      : null
    if (typeof attributeName === 'string' && /^on[A-Z]/.test(attributeName)) {
      return 'Event Handler'
    }
  }

  return null
}

function getFunctionLabel(name, contextLabel, line) {
  if (name) return name
  if (contextLabel) return contextLabel
  return `Inline Function (Line ${line ?? '?'})`
}

function getParserPlugins(extension) {
  if (extension === '.ts' || extension === '.mts' || extension === '.cts') {
    return ['typescript']
  }
  if (extension === '.tsx') {
    return [['typescript', { allExtensions: true, isTSX: true }], 'jsx']
  }
  return ['jsx']
}

export function analyzeCode(source, path) {
  const extension = getExtension(path)
  if (!extension) {
    throw new CodeAnalysisError('Babel analysis supports JavaScript and TypeScript files only.', 415)
  }
  if (typeof source !== 'string' || Buffer.byteLength(source, 'utf8') > maximumSourceBytes) {
    throw new CodeAnalysisError('Files must be 1 MB or smaller to analyze.', 413)
  }

  let ast
  try {
    ast = parse(source, {
      sourceType: 'unambiguous',
      plugins: getParserPlugins(extension),
      errorRecovery: false,
    })
  } catch (error) {
    const location = error.loc
    const position = location ? ` at line ${location.line}, column ${location.column + 1}` : ''
    throw new CodeAnalysisError(`Unable to parse this file${position}: ${error.message}`, 422)
  }

  let nodeCount = 0
  let functionCount = 0
  let classCount = 0
  let variableDeclarationCount = 0
  let importCount = 0
  const functions = []
  const classes = []
  const imports = []
  const stack = ast.program.body.map((node) => ({
    node,
    parent: ast.program,
    key: 'body',
    ancestors: [ast.program],
  }))

  while (stack.length > 0) {
    const { node, parent, key, ancestors } = stack.pop()
    if (!node || typeof node !== 'object' || typeof node.type !== 'string') continue

    nodeCount += 1

    if (functionNodeTypes.has(node.type)) {
      functionCount += 1
      if (functions.length < maximumDetails) {
        const name = getFunctionName(node, parent)
        const line = node.loc?.start.line ?? null
        functions.push({
          name,
          label: getFunctionLabel(name, getContextLabel(node, parent, key, ancestors), line),
          type: node.type,
          path,
          line,
          parameters: node.params?.length ?? 0,
        })
      }
    }

    if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
      classCount += 1
      if (classes.length < maximumDetails) {
        classes.push({
          name: node.id?.name || 'anonymous',
          line: node.loc?.start.line ?? null,
        })
      }
    }

    if (node.type === 'VariableDeclaration') variableDeclarationCount += 1
    if (node.type === 'ImportDeclaration') {
      importCount += 1
      if (imports.length < maximumDetails) {
        imports.push({
          source: node.source.value,
          specifiers: node.specifiers.map((specifier) => specifier.local.name),
        })
      }
    }

    for (const [childKey, value] of Object.entries(node)) {
      if (childKey === 'loc' || childKey === 'start' || childKey === 'end' || childKey === 'extra' || childKey === 'comments' || childKey === 'tokens') continue
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child === 'object') {
            stack.push({
              node: child,
              parent: node,
              key: childKey,
              ancestors: [...ancestors.slice(-1), node],
            })
          }
        }
      } else if (value && typeof value === 'object') {
        stack.push({
          node: value,
          parent: node,
          key: childKey,
          ancestors: [...ancestors.slice(-1), node],
        })
      }
    }
  }

  return {
    language: extension.includes('ts') ? 'TypeScript' : 'JavaScript',
    nodeCount,
    functionCount,
    classCount,
    variableDeclarationCount,
    importCount,
    functions,
    classes,
    imports,
    topLevelNodeTypes: ast.program.body.map((node) => node.type),
    detailsTruncated: functionCount > functions.length || classCount > classes.length || importCount > imports.length,
  }
}
