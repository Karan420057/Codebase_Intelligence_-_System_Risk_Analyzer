import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Focus,
  Maximize,
  Minus,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import "@xyflow/react/dist/style.css";

const GROUPS = [
  { name: "Entry Points", color: "#818cf8" },
  { name: "Routes", color: "#38bdf8" },
  { name: "Controllers", color: "#c084fc" },
  { name: "Middleware", color: "#fbbf24" },
  { name: "Models", color: "#34d399" },
  { name: "Utilities", color: "#94a3b8" },
  { name: "Other", color: "#a1a1aa" },
];

const FILE_TYPE_COLORS = {
  ".js": "#f0c674",
  ".jsx": "#61c7dd",
  ".ts": "#6b9cff",
  ".tsx": "#818cf8",
  ".py": "#45b789",
  ".css": "#c084fc",
  ".html": "#fb923c",
  ".json": "#a1a1aa",
};

const FILE_NODE_WIDTH = 224;
const FILE_NODE_HEIGHT = 88;
const MIN_GRAPH_ZOOM = 0.12;
const MAX_GRAPH_ZOOM = 2.5;
const GRAPH_ZOOM_FACTOR = 1.3;
const WHEEL_ZOOM_SENSITIVITY = 0.004;

function getGroup(path) {
  const normalized = path.toLowerCase().replaceAll("\\", "/");

  if (/(^|\/)(routes?|routing|api)\//.test(normalized)) return "Routes";
  if (/(^|\/)controllers?\//.test(normalized)) return "Controllers";
  if (/(^|\/)middleware\//.test(normalized)) return "Middleware";
  if (/(^|\/)(models?|schemas?|entities)\//.test(normalized)) return "Models";
  if (/(^|\/)(utils?|utilities|helpers?|lib)\//.test(normalized)) {
    return "Utilities";
  }
  if (/(^|\/)(bin|entrypoints?)\//.test(normalized)) {
    return "Entry Points";
  }
  if (
    /^(?:(?:backend|frontend)\/)?(?:src\/)?(?:main|index|app|server|cli)\.[^.]+$/.test(
      normalized,
    )
  ) {
    return "Entry Points";
  }
  return "Other";
}

function getFileType(path) {
  const name = path.split(/[\\/]/).pop() || path;
  const extension = name.includes(".") ? name.split(".").pop() : "";
  return extension ? `.${extension.toLowerCase()}` : "No extension";
}

function getFileTypeColor(path) {
  return FILE_TYPE_COLORS[getFileType(path)] || "#94a3b8";
}

function getTypeColor(type) {
  return FILE_TYPE_COLORS[type] || "#94a3b8";
}

function getRiskScore(file) {
  const value = file.riskScore ?? file.risk?.score;
  const score = Number(value);
  return value == null || !Number.isFinite(score) ? null : score;
}

function isHighRisk(file) {
  const score = getRiskScore(file);
  const label = String(file.riskLevel ?? file.risk?.level ?? "").toLowerCase();
  return score >= 70 || label === "high" || label === "critical";
}

function FileNode({ data, selected }) {
  const targetPosition = data.architectureMode ? Position.Top : Position.Left;
  const sourcePosition = data.architectureMode
    ? Position.Bottom
    : Position.Right;

  return (
    <div
      title={data.path}
      className={`w-56 rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-all duration-150 ${
        selected
          ? "border-primary ring-2 ring-primary/25"
          : data.highRisk
            ? "border-amber-500/60"
            : "border-border/80 hover:border-primary/50"
      }`}
      style={{ borderLeftWidth: 3, borderLeftColor: data.color }}
    >
      <Handle
        type="target"
        position={targetPosition}
        className="!size-2 !border-0 !bg-muted-foreground/70"
      />
      <div className="flex items-center gap-2">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: data.color }}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {data.name}
        </span>
        {data.highRisk && (
          <AlertTriangle
            className="size-3.5 shrink-0 text-amber-400"
            aria-label="High risk"
          />
        )}
      </div>
      <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
        {data.path}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span>{data.group}</span>
        <span className="tabular-nums">
          {data.dependencyCount} imports · {data.dependentCount} dependents
        </span>
      </div>
      <Handle
        type="source"
        position={sourcePosition}
        className="!size-2 !border-0 !bg-muted-foreground/70"
      />
    </div>
  );
}

const nodeTypes = { file: FileNode };

function getFocusPaths(selectedPath, depth, files, dependentsByPath) {
  if (!selectedPath) return new Set();
  if (depth === "all") return new Set(files.map((file) => file.path));

  const fileByPath = new Map(files.map((file) => [file.path, file]));
  const distances = new Map([[selectedPath, 0]]);
  const queue = [selectedPath];

  for (let index = 0; index < queue.length; index += 1) {
    const path = queue[index];
    const distance = distances.get(path);
    if (distance >= Number(depth)) continue;

    const file = fileByPath.get(path);
    const neighbors = [
      ...(file?.dependencies || []),
      ...(dependentsByPath.get(path) || []),
    ];

    neighbors.forEach((neighbor) => {
      if (!distances.has(neighbor)) {
        distances.set(neighbor, distance + 1);
        queue.push(neighbor);
      }
    });
  }

  return new Set(distances.keys());
}

function InspectorList({ title, paths, onSelectFile }) {
  return (
    <section className="mt-5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title} <span className="tabular-nums">({paths.length})</span>
      </h4>
      {paths.length ? (
        <ul className="mt-2 space-y-1">
          {paths.map((path) => (
            <li key={path}>
              <button
                type="button"
                title={path}
                onClick={() => onSelectFile(path)}
                className="w-full truncate rounded-md px-2 py-1.5 text-left font-mono text-xs text-foreground/90 hover:bg-muted"
              >
                {path}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">None found.</p>
      )}
    </section>
  );
}

function DependencyInspector({
  file,
  dependents,
  cyclic,
  onSelectFile,
  onClose,
}) {
  if (!file) return null;
  const score = getRiskScore(file);

  return (
    <aside
      className="flex min-h-0 flex-col overflow-y-auto rounded-xl border bg-card p-4"
      aria-label="Dependency inspector"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            Selected file
          </p>
          <h3 className="mt-1 break-all font-mono text-sm font-semibold">
            {file.path.split(/[\\/]/).pop()}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dependency inspector"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="mt-3 break-all font-mono text-[11px] leading-5 text-muted-foreground">
        {file.path}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Dependencies</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {file.dependencies.length}
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Dependents</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {dependents.length}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {score != null && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs ${
              score >= 70
                ? "bg-amber-500/15 text-amber-300"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Risk score {score}
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
            cyclic
              ? "bg-amber-500/15 text-amber-300"
              : "bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {cyclic ? (
            <AlertTriangle className="size-3" />
          ) : (
            <Check className="size-3" />
          )}
          {cyclic ? "Circular dependency" : "No detected cycle"}
        </span>
      </div>
      <InspectorList
        title="Direct imports"
        paths={file.dependencies}
        onSelectFile={onSelectFile}
      />
      <InspectorList
        title="Reverse dependencies"
        paths={dependents}
        onSelectFile={onSelectFile}
      />
    </aside>
  );
}

function GraphCanvas({
  files,
  edges,
  focusPaths,
  selectedFile,
  architectureMode,
  layoutVersion,
  onSelectFile,
  onLayoutError,
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [reactFlowEdges, setEdges, onEdgesChange] = useEdgesState([]);
  const [expanded, setExpanded] = useState(false);
  const { fitView, getZoom, zoomTo } = useReactFlow();
  const graphViewportRef = useRef(null);
  const nodeIds = nodes.map((node) => node.id).join("\u0000");

  const changeZoom = (direction) => {
    const zoom =
      direction === "in"
        ? getZoom() * GRAPH_ZOOM_FACTOR
        : getZoom() / GRAPH_ZOOM_FACTOR;
    zoomTo(
      Math.min(MAX_GRAPH_ZOOM, Math.max(MIN_GRAPH_ZOOM, zoom)),
      { duration: 50 },
    );
  };

  useEffect(() => {
    const graphElement = graphViewportRef.current?.querySelector(".react-flow");
    if (!graphElement) return undefined;

    const handleWheelZoom = (event) => {
      if (!event.cancelable) return;

      event.preventDefault();
      event.stopPropagation();
      const delta =
        event.deltaMode === 1
          ? event.deltaY * 16
          : event.deltaMode === 2
            ? event.deltaY * window.innerHeight
            : event.deltaY;
      const zoom = getZoom() * Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY);
      zoomTo(Math.min(MAX_GRAPH_ZOOM, Math.max(MIN_GRAPH_ZOOM, zoom)));
    };
    const wheelOptions = { passive: false, capture: true };

    graphElement.addEventListener("wheel", handleWheelZoom, wheelOptions);
    return () =>
      graphElement.removeEventListener("wheel", handleWheelZoom, wheelOptions);
  }, [getZoom, zoomTo]);

  useEffect(() => {
    if (!expanded) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") setExpanded(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expanded]);

  useEffect(() => {
    let active = true;

    async function layoutGraph() {
      const partitions = new Map(GROUPS.map((group, index) => [group.name, index]));
      const { default: ELKLayout } = await import("elkjs/lib/elk.bundled.js");
      const elk = new ELKLayout();
      const elkGraph = {
        id: "dependency-graph",
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": architectureMode ? "DOWN" : "RIGHT",
          "elk.edgeRouting": "ORTHOGONAL",
          "elk.spacing.nodeNode": "40",
          "elk.layered.spacing.nodeNodeBetweenLayers": "112",
          "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
          "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
          ...(architectureMode
            ? { "elk.partitioning.activate": "true" }
            : {}),
        },
        children: files.map((file) => ({
          id: file.path,
          width: FILE_NODE_WIDTH,
          height: FILE_NODE_HEIGHT,
          layoutOptions: architectureMode
            ? {
                "elk.partitioning.partition": String(
                  partitions.get(file.group) ?? GROUPS.length - 1,
                ),
              }
            : {},
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        })),
      };

      try {
        const result = await elk.layout(elkGraph);
        if (!active) return;

        const positionedNodes = (result.children || []).map((node) => {
          const file = files.find((item) => item.path === node.id);
          return {
            id: node.id,
            type: "file",
            position: { x: node.x || 0, y: node.y || 0 },
            width: FILE_NODE_WIDTH,
            height: FILE_NODE_HEIGHT,
            data: {
              ...file,
              name: file.path.split(/[\\/]/).pop(),
              color: getFileTypeColor(file.path),
              dependencyCount: file.dependencies.length,
              dependentCount: file.dependentPaths.length,
              highRisk: isHighRisk(file),
              architectureMode,
            },
          };
        });
        const visiblePaths = new Set(files.map((file) => file.path));
        const positionedEdges = edges
          .filter(
            (edge) =>
              visiblePaths.has(edge.source) && visiblePaths.has(edge.target),
          )
          .map((edge) => {
            return {
              ...edge,
              type: "smoothstep",
              markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
              style: {
                stroke: "var(--xy-edge-stroke, #7c8798)",
                strokeWidth: 1.5,
                opacity: 0.75,
              },
            };
          });

        setNodes(positionedNodes);
        setEdges(positionedEdges);
        requestAnimationFrame(() =>
          fitView({ padding: 0.16, duration: 220, maxZoom: 1.25 }),
        );
        onLayoutError("");
      } catch (error) {
        if (!active) return;
        onLayoutError(
          `Unable to arrange the dependency graph: ${error.message || "unknown layout error"}`,
        );
      }
    }

    layoutGraph();
    return () => {
      active = false;
    };
  }, [
    architectureMode,
    edges,
    files,
    fitView,
    layoutVersion,
    onLayoutError,
    setEdges,
    setNodes,
  ]);

  useEffect(() => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        selected: node.id === selectedFile,
        style: {
          ...node.style,
          opacity:
            focusPaths.size === 0 || focusPaths.has(node.id) ? 1 : 0.22,
        },
      })),
    );
    setEdges((current) =>
      current.map((edge) => {
        const related =
          focusPaths.size === 0 ||
          (focusPaths.has(edge.source) && focusPaths.has(edge.target));
        return {
          ...edge,
          animated: related && focusPaths.size > 0,
          style: {
            ...edge.style,
            opacity: related ? 0.75 : 0.11,
            strokeWidth: related ? 1.5 : 1,
          },
        };
      }),
    );
  }, [
    architectureMode,
    focusPaths,
    layoutVersion,
    nodeIds,
    selectedFile,
    setEdges,
    setNodes,
  ]);

  const onNodeClick = useCallback(
    (_, node) => onSelectFile(node.id),
    [onSelectFile],
  );

  if (files.length === 0) {
    return (
      <div className="flex h-full min-h-80 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        No files match the current graph filters.
      </div>
    );
  }

  return (
    <div
      className={
        expanded
          ? "fixed inset-0 z-[100] flex flex-col bg-background p-3 sm:p-5"
          : "relative h-full min-h-80 overflow-hidden rounded-xl border bg-background"
      }
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded ? "true" : undefined}
      aria-label={expanded ? "Full-screen dependency graph" : undefined}
    >
      {expanded && (
        <header className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Dependency graph</h2>
            <p className="text-xs text-muted-foreground">
              {files.length} files · {edges.length} dependency edges
            </p>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Close full-screen graph"
            className="rounded-lg border p-2 hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </header>
      )}
      <div
        ref={graphViewportRef}
        className={`relative overflow-hidden bg-background ${
          expanded
            ? "min-h-0 flex-1 rounded-xl border"
            : "h-full min-h-80 rounded-xl border"
        }`}
      >
        <div className="absolute right-3 top-3 z-10 flex gap-1 rounded-lg border bg-card/95 p-1 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={() => changeZoom("out")}
            aria-label="Zoom out"
            title="Zoom out"
            className="rounded-md p-2 hover:bg-muted"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => changeZoom("in")}
            aria-label="Zoom in"
            title="Zoom in"
            className="rounded-md p-2 hover:bg-muted"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              fitView({ padding: 0.16, duration: 220, maxZoom: 1.25 })
            }
            aria-label="Zoom to fit"
            title="Zoom to fit"
            className="rounded-md p-2 hover:bg-muted"
          >
            <Focus className="size-4" />
          </button>
          {!expanded && (
            <button
              type="button"
              onClick={() => {
                setExpanded(true);
                requestAnimationFrame(() =>
                  fitView({ padding: 0.12, duration: 220, maxZoom: 1.25 }),
                );
              }}
              aria-label="Maximize graph"
              title="Open full-screen graph"
              className="rounded-md p-2 hover:bg-muted"
            >
              <Maximize className="size-4" />
            </button>
          )}
        </div>
        <ReactFlow
          nodes={nodes}
          edges={reactFlowEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={() => onSelectFile("")}
          fitView
          zoomOnScroll={false}
          preventScrolling
          minZoom={MIN_GRAPH_ZOOM}
          maxZoom={MAX_GRAPH_ZOOM}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
          aria-label="Repository dependency graph"
        >
          <Background color="#64748b" gap={22} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}

function DependencyGraphContent({ files, cycles = [], selectedFile, onSelectFile }) {
  const [search, setSearch] = useState("");
  const [fileType, setFileType] = useState("all");
  const [mode, setMode] = useState("dependency");
  const [depth, setDepth] = useState("1");
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [layoutError, setLayoutError] = useState("");
  const reportLayoutError = useCallback((message) => setLayoutError(message), []);

  const graph = useMemo(() => {
    const validFiles = files.filter((file) => typeof file.path === "string");
    const pathSet = new Set(validFiles.map((file) => file.path));
    const dependentsByPath = new Map(
      validFiles.map((file) => [file.path, []]),
    );
    const normalizedFiles = validFiles.map((file) => ({
      ...file,
      group: getGroup(file.path),
      dependencies: [
        ...new Set(Array.isArray(file.dependencies) ? file.dependencies : []),
      ].filter((path) => pathSet.has(path)),
    }));
    const normalizedByPath = new Map(
      normalizedFiles.map((file) => [file.path, file]),
    );
    const edges = [];

    normalizedFiles.forEach((file) => {
      file.dependencies.forEach((dependency) => {
        dependentsByPath.get(dependency).push(file.path);
        edges.push({
          id: `${file.path}->${dependency}`,
          source: file.path,
          target: dependency,
        });
      });
    });
    normalizedFiles.forEach((file) => {
      file.dependentPaths = dependentsByPath.get(file.path);
    });

    return {
      files: normalizedFiles,
      fileByPath: normalizedByPath,
      dependentsByPath,
      edges,
    };
  }, [files]);

  const types = useMemo(
    () => [...new Set(graph.files.map((file) => getFileType(file.path)))].sort(),
    [graph.files],
  );
  const cyclicPaths = useMemo(() => new Set(cycles.flat()), [cycles]);
  const focusPaths = useMemo(
    () =>
      getFocusPaths(
        selectedFile,
        depth,
        graph.files,
        graph.dependentsByPath,
      ),
    [depth, graph.dependentsByPath, graph.files, selectedFile],
  );
  const visibleFiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return graph.files.filter(
      (file) =>
        (fileType === "all" || getFileType(file.path) === fileType) &&
        !collapsedGroups.has(file.group) &&
        (!query || file.path.toLowerCase().includes(query)),
    );
  }, [collapsedGroups, fileType, graph.files, search]);
  const visiblePaths = useMemo(
    () => new Set(visibleFiles.map((file) => file.path)),
    [visibleFiles],
  );
  const visibleEdges = useMemo(
    () =>
      graph.edges.filter(
        (edge) =>
          visiblePaths.has(edge.source) && visiblePaths.has(edge.target),
      ),
    [graph.edges, visiblePaths],
  );
  const selected = graph.fileByPath.get(selectedFile);
  const selectedDependents = graph.dependentsByPath.get(selectedFile) || [];

  const toggleGroup = (groupName) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  const exportGraph = () => {
    const payload = {
      nodes: graph.files.map((file) => ({
        path: file.path,
        group: file.group,
        dependencies: file.dependencies,
        dependencyCount: file.dependencies.length,
        dependentCount: file.dependentPaths.length,
      })),
      edges: graph.edges.map(({ source, target }) => ({
        from: source,
        to: target,
      })),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "dependency-graph.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-44 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search files..."
            aria-label="Search graph files"
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </label>
        <label className="sr-only" htmlFor="dependency-graph-file-type">
          Filter by file type
        </label>
        <select
          id="dependency-graph-file-type"
          value={fileType}
          onChange={(event) => setFileType(event.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All file types</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <div
          role="group"
          aria-label="Graph layout mode"
          className="inline-flex rounded-lg border bg-muted/40 p-0.5"
        >
          {[
            ["dependency", "Dependency"],
            ["architecture", "Architecture"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                mode === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground">
          <Focus className="size-3.5" />
          <span>Depth</span>
          <select
            value={depth}
            onChange={(event) => setDepth(event.target.value)}
            aria-label="Dependency focus depth"
            className="bg-transparent text-foreground outline-none"
          >
            <option value="1">1 Level</option>
            <option value="2">2 Levels</option>
            <option value="all">All</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => setLayoutVersion((version) => version + 1)}
          className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs hover:bg-muted"
          title="Recalculate node positions"
        >
          <RotateCcw className="size-3.5" />
          Reset layout
        </button>
        <button
          type="button"
          onClick={exportGraph}
          className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs hover:bg-muted"
        >
          <Download className="size-3.5" />
          Export
        </button>
        {selectedFile && (
          <button
            type="button"
            onClick={() => onSelectFile("")}
            className="rounded-lg border px-2.5 py-2 text-xs hover:bg-muted"
          >
            Show full graph
          </button>
        )}
      </div>

      {mode === "architecture" && (
        <div
          role="group"
          className="flex flex-wrap items-center gap-1.5"
          aria-label="Architectural groups"
        >
          <span className="mr-1 text-xs text-muted-foreground">Groups</span>
          {GROUPS.map((group) => {
            const count = graph.files.filter(
              (file) => file.group === group.name,
            ).length;
            const collapsed = collapsedGroups.has(group.name);
            return (
              <button
                type="button"
                key={group.name}
                onClick={() => toggleGroup(group.name)}
                aria-expanded={!collapsed}
                title={`${collapsed ? "Expand" : "Collapse"} ${group.name}`}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] transition-colors ${
                  collapsed
                    ? "border-border/60 text-muted-foreground opacity-60"
                    : "border-border bg-muted/30 text-foreground"
                }`}
              >
                {collapsed ? (
                  <ChevronRight className="size-3" />
                ) : (
                  <ChevronDown className="size-3" />
                )}
                <span style={{ color: group.color }}>{group.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {layoutError && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">
          {layoutError}
        </p>
      )}

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {visibleFiles.length} of {graph.files.length} files ·{" "}
              {graph.edges.length} dependency edges
            </span>
            <span>Arrows point from importer to dependency</span>
          </div>
          <div className="h-[min(68vh,680px)] min-h-[440px]">
            <GraphCanvas
              files={visibleFiles}
              edges={visibleEdges}
              focusPaths={focusPaths}
              selectedFile={selectedFile}
              architectureMode={mode === "architecture"}
              layoutVersion={layoutVersion}
              onSelectFile={onSelectFile}
              onLayoutError={reportLayoutError}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {types.map((type) => (
              <span key={type} className="inline-flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: getTypeColor(type) }}
                />
                {type}
              </span>
            ))}
            <span className="ml-auto">Drag to pan · scroll to zoom</span>
          </div>
        </div>
        {selected ? (
          <DependencyInspector
            file={selected}
            dependents={selectedDependents}
            cyclic={cyclicPaths.has(selected.path)}
            onSelectFile={onSelectFile}
            onClose={() => onSelectFile("")}
          />
        ) : (
          <aside className="flex min-h-36 items-center justify-center rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            Select a file node to inspect its imports and dependents.
          </aside>
        )}
      </div>
    </div>
  );
}

export default function DependencyGraph(props) {
  return (
    <ReactFlowProvider>
      <DependencyGraphContent {...props} />
    </ReactFlowProvider>
  );
}
