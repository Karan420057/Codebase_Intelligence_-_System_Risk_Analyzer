import { builtinModules } from 'node:module'

const builtins = new Set(builtinModules)
const maximumExternalPackages = 50
const maximumUsersListed = 20

function getPackageName(source) {
  if (typeof source !== 'string' || !source) return null
  if (source.startsWith('.') || source.startsWith('node:')) return null
  if (/^(@\/|~\/|#|\/)/.test(source)) return null // path aliases, not npm packages
  const parts = source.split('/')
  const name = source.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
  return builtins.has(name) ? null : name
}

function getHotspotThreshold(values) {
  if (values.length === 0) return 5
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  return Math.max(5, Math.ceil(mean + Math.sqrt(variance)))
}

export function buildGraphModel(graphResult, analyses, cycles = []) {
  const analysisByPath = new Map(analyses.map((item) => [item.path, item]))
  const filesInCycles = new Set(cycles.flat())
  const connectionCounts = graphResult.files.map(
    (file) => file.dependencyCount + file.dependentCount,
  )
  const hotspotThreshold = getHotspotThreshold(connectionCounts)

  const nodes = graphResult.files.map((file) => {
    const connections = file.dependencyCount + file.dependentCount
    const structure = analysisByPath.get(file.path)?.structure
    return {
      id: file.path,
      label: file.path.split('/').at(-1),
      directory: file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : '',
      fanIn: file.dependentCount,
      fanOut: file.dependencyCount,
      connections,
      instability: connections === 0
        ? 0
        : Number((file.dependencyCount / connections).toFixed(2)),
      isHotspot: connections >= hotspotThreshold,
      inCycle: filesInCycles.has(file.path),
      linesOfCode: structure?.linesOfCode ?? null,
      maxNestingDepth: structure?.maxNestingDepth ?? null,
      cyclomaticComplexity: structure?.cyclomaticComplexity ?? null,
    }
  })

  const edges = graphResult.files.flatMap((file) =>
    file.dependencies.map((target) => ({ source: file.path, target })),
  )

  const packages = new Map()
  for (const analysis of analyses) {
    for (const reference of analysis.imports) {
      const name = getPackageName(reference.source)
      if (!name) continue
      if (!packages.has(name)) packages.set(name, new Set())
      packages.get(name).add(analysis.path)
    }
  }
  const externalDependencies = [...packages.entries()]
    .map(([name, users]) => ({
      name,
      usedByCount: users.size,
      usedBy: [...users].sort().slice(0, maximumUsersListed),
    }))
    .sort((a, b) => b.usedByCount - a.usedByCount || a.name.localeCompare(b.name))
    .slice(0, maximumExternalPackages)

  const hotspots = nodes
    .filter((node) => node.isHotspot)
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 10)
    .map((node) => node.id)

  return {
    nodes,
    edges,
    hotspots,
    externalDependencies,
    stats: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      hotspotThreshold,
      hotspotCount: nodes.filter((node) => node.isHotspot).length,
      filesInCycles: filesInCycles.size,
    },
  }
}