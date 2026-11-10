const extensions = [
  '.js', '.jsx', '.mjs', '.cjs',
  '.ts', '.tsx', '.mts', '.cts',
]

function normalizePath(path) {
  const parts = []

  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue

    if (part === '..') {
      parts.pop()
    } else {
      parts.push(part)
    }
  }

  return parts.join('/')
}

function hasExtension(path) {
  const filename = path.split('/').at(-1)
  return /\.[a-z0-9]+$/i.test(filename)
}

function resolveLocalImport(importer, source, files) {
  const directory = importer.includes('/')
    ? importer.slice(0, importer.lastIndexOf('/'))
    : ''

  const base = normalizePath(`${directory}/${source}`)
  const candidates = [base]

  if (!hasExtension(base)) {
    for (const extension of extensions) {
      candidates.push(`${base}${extension}`)
    }
  }

  for (const extension of extensions) {
    candidates.push(`${base}/index${extension}`)
  }

  return candidates.find((candidate) => files.has(candidate)) || null
}

export function extractImportDependencies(analyses) {
  const filePaths = new Set(analyses.map((item) => item.path))

  const imports = []
  const unresolved = []
  const external = []

  for (const analysis of analyses) {
    for (const item of analysis.imports || []) {
      const source = item.source

      if (typeof source !== 'string') continue

      if (!source.startsWith('.')) {
        external.push({
          file: analysis.path,
          source,
          specifiers: item.specifiers || [],
        })
        continue
      }

      const resolved = resolveLocalImport(
        analysis.path,
        source,
        filePaths,
      )

      if (resolved) {
        imports.push({
          file: analysis.path,
          source,
          resolved,
          specifiers: item.specifiers || [],
        })
      } else {
        unresolved.push({
          file: analysis.path,
          source,
          specifiers: item.specifiers || [],
        })
      }
    }
  }

  return {
    imports,
    unresolved,
    external,
  }
}
