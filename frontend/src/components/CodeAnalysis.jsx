import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, GitBranch, GitFork, RefreshCw, Search, Network, FileCode2, ChartNoAxesCombined } from "lucide-react";
import { apiRequest } from "../lib/api";

const COLORS = [
  "#6366f1",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
  "#ef4444",
];

const MAX_GRAPH_NODES = 24;
const MAX_FLOW_NODES = 12;

function Metric({ label, value, icon: Icon, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl border bg-card p-4 text-left transition-colors ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:border-primary/60 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      }`}
      aria-label={`${label}: ${value ?? 0}${disabled ? ". No details available" : ". Click to view details"}`}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 shrink-0" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value ?? 0}</p>
      {!disabled && (
        <p className="mt-1 text-xs text-muted-foreground">View details →</p>
      )}
    </button>
  );
}

function Panel({ id, title, description, icon: Icon, action, children }) {
  return (
    <section id={id} className="min-w-0 rounded-xl border bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
              <Icon className="size-4" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold">{title}</h3>
            {description && (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function shortPath(path, max = 28) {
  if (!path || path.length <= max) return path || "";
  return `…${path.slice(-(max - 1))}`;
}

function getLanguage(path) {
  const filename = path.split("/").pop() || "";
  const match = filename.match(/\.([^.]+)$/);

  if (!match) return "Other";

  const extension = match[1].toLowerCase();

  const languages = {
    js: "JavaScript",
    jsx: "JavaScript",
    mjs: "JavaScript",
    cjs: "JavaScript",
    ts: "TypeScript",
    tsx: "TypeScript",
    mts: "TypeScript",
    cts: "TypeScript",
    py: "Python",
    java: "Java",
    go: "Go",
    rs: "Rust",
    css: "CSS",
    scss: "CSS",
    html: "HTML",
    json: "JSON",
    vue: "Vue",
    php: "PHP",
    rb: "Ruby",
    cpp: "C++",
    cc: "C++",
    c: "C",
    cs: "C#",
    swift: "Swift",
    kt: "Kotlin",
    sql: "SQL",
    md: "Markdown",
  };

  return languages[extension] || "Other";
}

function LanguageDonut({ languages = [] }) {
  const entries = useMemo(() => {
    const totalBytes = languages.reduce(
      (sum, language) => sum + (Number(language.bytes) || 0),
      0,
    );

    return [...languages]
      .filter((language) => Number(language.bytes) > 0)
      .sort((a, b) => b.bytes - a.bytes)
      .map((language) => ({
        ...language,
        percentage: totalBytes
          ? (Number(language.bytes) / totalBytes) * 100
          : 0,
      }));
  }, [languages]);

  const totalBytes = entries.reduce(
    (sum, language) => sum + Number(language.bytes),
    0,
  );
  const radius = 39;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Panel
      title="Languages"
      description="Repository-wide language distribution reported by GitHub."
      icon={ChartNoAxesCombined}
    >
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          GitHub has not reported language statistics for this repository.
        </p>
      ) : (
        <div className="grid items-center gap-4 sm:grid-cols-[112px_minmax(0,1fr)]">
          <svg
            viewBox="0 0 100 100"
            role="img"
            aria-label="Repository language distribution"
            className="mx-auto w-28 max-w-full"
          >
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeWidth="11"
            />
            {entries.map((language, index) => {
              const segment = (language.percentage / 100) * circumference;
              const circle = (
                <circle
                  key={language.name}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth="11"
                  strokeDasharray={`${segment} ${circumference - segment}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 50 50)"
                />
              );

              offset += segment;
              return circle;
            })}
            <text
              x="50"
              y="48"
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="currentColor"
            >
              {entries.length}
            </text>
            <text
              x="50"
              y="59"
              textAnchor="middle"
              fontSize="6"
              fill="currentColor"
              opacity="0.7"
            >
              languages
            </text>
          </svg>

          <div className="min-w-0 space-y-3">
            {entries.map((language, index) => (
              <div key={language.name}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2 font-medium">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                    <span className="truncate">{language.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {language.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${language.percentage}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Percentages are calculated from GitHub's reported language bytes, not
        the number of files.
      </p>
    </Panel>
  );
}

function DependencyGraph({ files, selectedFile, onSelectFile }) {
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [hoveredEdge, setHoveredEdge] = useState(null);

  const graph = useMemo(() => {
    const paths = files.map((file) => file.path);
    const pathSet = new Set(paths);
    const edges = [];

    files.forEach((file) => {
      (file.dependencies || []).forEach((dependency) => {
        if (pathSet.has(dependency)) {
          edges.push({ from: file.path, to: dependency });
        }
      });
    });

    return {
      paths,
      edges,
      selected: pathSet.has(selectedFile) ? selectedFile : paths[0],
    };
  }, [files, selectedFile]);

  useEffect(() => {
    if (!expanded) setZoom(1);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") setExpanded(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  const width = 1200;
  const nodeWidth = 184;
  const nodeHeight = 48;
  const columnGap = 92;
  const rowGap = 104;
  const columns = Math.min(4, Math.max(1, graph.paths.length));
  const rows = Math.ceil(graph.paths.length / columns);
  const height = Math.max(280, rows * rowGap + 70);
  const positions = new Map();

  graph.paths.forEach((path, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const usableWidth = width - nodeWidth;
    positions.set(path, {
      x: nodeWidth / 2 + column * (usableWidth / Math.max(columns - 1, 1)),
      y: 40 + row * rowGap,
    });
  });

  function clippedEdge(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    if (dx === 0 && dy === 0) return null;

    const scaleFrom =
      1 /
      Math.max(Math.abs(dx) / (nodeWidth / 2), Math.abs(dy) / (nodeHeight / 2));
    const scaleTo =
      1 /
      Math.max(Math.abs(dx) / (nodeWidth / 2), Math.abs(dy) / (nodeHeight / 2));

    return {
      x1: from.x + dx * scaleFrom,
      y1: from.y + dy * scaleFrom,
      x2: to.x - dx * scaleTo,
      y2: to.y - dy * scaleTo,
    };
  }

  function renderGraph(isExpanded) {
    const visiblePaths = isExpanded
      ? graph.paths
      : graph.paths.slice(0, MAX_GRAPH_NODES);

    const visibleSet = new Set(visiblePaths);
    const visibleEdges = graph.edges.filter(
      (edge) => visibleSet.has(edge.from) && visibleSet.has(edge.to),
    );

    const svgHeight = Math.max(
      280,
      Math.ceil(visiblePaths.length / columns) * rowGap + 70,
    );

    return (
      <div
        className="overflow-auto rounded-lg border bg-muted/10"
        onWheel={(event) => {
          if (!event.ctrlKey) return;
          event.preventDefault();
          setZoom((current) =>
            Math.min(
              2.5,
              Math.max(0.5, current + (event.deltaY < 0 ? 0.1 : -0.1)),
            ),
          );
        }}
        onClick={(event) => {
          // Keep graph interactions inside the graph panel.
          event.stopPropagation();
        }}
      >
        <div style={{ width: `${100 * zoom}%`, minWidth: 600 }}>
          <svg
            viewBox={`0 0 ${width} ${svgHeight}`}
            role="img"
            aria-label="Repository dependency graph. Arrows point from importer to dependency."
            className="block w-full"
            style={{ minWidth: 600 }}
          >
            <defs>
              <marker
                id={
                  isExpanded
                    ? "dependency-arrow-large"
                    : "dependency-arrow-small"
                }
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
              </marker>

              <marker
                id={
                  isExpanded
                    ? "dependency-arrow-hover-large"
                    : "dependency-arrow-hover-small"
                }
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#a78bfa" />
              </marker>
            </defs>

            {visibleEdges.map((edge, index) => {
              const from = positions.get(edge.from);
              const to = positions.get(edge.to);

              if (!from || !to) return null;

              const clipped = clippedEdge(from, to);
              if (!clipped) return null;

              const edgeId = `${edge.from}->${edge.to}`;
              const isHovered = hoveredEdge === edgeId;

              const path = `M ${clipped.x1} ${clipped.y1} L ${clipped.x2} ${clipped.y2}`;

              return (
                <g key={`${edgeId}-${index}`}>
                  {/* Wide invisible path makes the connection easier to hover. */}
                  <path
                    d={path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="14"
                    pointerEvents="stroke"
                    onMouseEnter={() => setHoveredEdge(edgeId)}
                    onMouseLeave={() => setHoveredEdge(null)}
                  />

                  {/* Visible connection. */}
                  <path
                    d={path}
                    fill="none"
                    stroke={isHovered ? "#a78bfa" : "#94a3b8"}
                    strokeOpacity={isHovered ? 1 : 0.85}
                    strokeWidth={isHovered ? 3 : 1.5}
                    markerEnd={`url(#${
                      isHovered
                        ? isExpanded
                          ? "dependency-arrow-hover-large"
                          : "dependency-arrow-hover-small"
                        : isExpanded
                          ? "dependency-arrow-large"
                          : "dependency-arrow-small"
                    })`}
                    pointerEvents="none"
                  >
                    <title>{`${edge.from} → ${edge.to}`}</title>
                  </path>
                </g>
              );
            })}

            {visiblePaths.map((path) => {
              const position = positions.get(path);
              const selected = path === graph.selected;

              return (
                <g
                  key={path}
                  role="button"
                  tabIndex="0"
                  aria-label={`Select ${path}`}
                  onClick={() => onSelectFile(path)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectFile(path);
                    }
                  }}
                  className="cursor-pointer"
                >
                  <rect
                    x={position.x - nodeWidth / 2}
                    y={position.y - nodeHeight / 2}
                    width={nodeWidth}
                    height={nodeHeight}
                    rx="9"
                    fill={selected ? "#6366f1" : "hsl(var(--card))"}
                    fillOpacity={1}
                    stroke={
                      selected ? "#818cf8" : hoveredEdge ? "#94a3b8" : "#64748b"
                    }
                    strokeWidth={selected ? 2 : 1}
                  />
                  <title>{path}</title>
                  <text
                    x={position.x}
                    y={position.y + 4}
                    textAnchor="middle"
                    fontSize="11"
                    fill={selected ? "#ffffff" : "currentColor"}
                  >
                    {shortPath(path, 27)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  }

  if (graph.paths.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No analyzed files are available to draw the dependency graph.
      </p>
    );
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Arrows point from the importing file to its dependency.
        </p>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setExpanded(true);
          }}
          className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          View All
        </button>
      </div>

      {renderGraph(false)}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Showing {Math.min(graph.paths.length, MAX_GRAPH_NODES)} of{" "}
          {graph.paths.length} files
        </span>
        <span>Ctrl + scroll to zoom</span>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-3 backdrop-blur-md sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setExpanded(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="expanded-dependency-title"
            className="flex max-h-[94dvh] w-full max-w-375 flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl"
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5">
              <div>
                <h2 id="expanded-dependency-title" className="font-semibold">
                  Full dependency graph
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {graph.paths.length} analyzed files · {graph.edges.length}{" "}
                  dependency edges
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => setZoom((value) => Math.max(0.5, value - 0.1))}
                >
                  −
                </button>
                <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => setZoom((value) => Math.min(2.5, value + 0.1))}
                >
                  +
                </button>
                <button
                  type="button"
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => setZoom(1)}
                >
                  Reset
                </button>
                <button
                  type="button"
                  aria-label="Close dependency graph"
                  className="flex size-9 items-center justify-center rounded-lg border text-lg hover:bg-muted"
                  onClick={() => setExpanded(false)}
                >
                  ×
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
              {renderGraph(true)}
              <p className="mt-3 text-xs text-muted-foreground">
                Hold Ctrl and scroll to zoom. Use the horizontal and vertical
                scrollbars to explore large graphs.
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function TraversalFlow({ title, description, paths, distances }) {
  const visible = paths.slice(0, MAX_FLOW_NODES);

  return (
    <Panel title={title} description={description} icon={GitBranch}>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No traversal nodes are available.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((path, index) => (
            <div key={`${path}-${index}`} className="flex items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-semibold">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2">
                <p className="break-all font-mono text-xs" title={path}>
                  {path}
                </p>
                {distances && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Distance from start: {distances[path] ?? "unknown"}
                  </p>
                )}
              </div>
            </div>
          ))}
          {visible.length > 1 && (
            <p className="pl-9 text-xs text-muted-foreground">
              Ordered traversal: node {visible.length > 1 ? "1 → " : ""}
              {visible.length}
            </p>
          )}
          {paths.length > MAX_FLOW_NODES && (
            <p className="text-xs text-muted-foreground">
              Showing the first {MAX_FLOW_NODES} of {paths.length} traversal
              nodes.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}

export default function CodeAnalysis({ owner, repo, branch }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState("");

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  useEffect(() => {
    let active = true;

    async function loadAnalysis() {
      setLoading(true);
      setError("");
      setData(null);
      setSelectedFile("");

      try {
        const result = await apiRequest(
          `/api/github/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/analysis`,
        );

        if (active) {
          setData(result);
          setSelectedFile(
            result.traversals?.startFile || result.files?.[0]?.path || "",
          );
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Unable to analyze dependencies.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (owner && repo) {
      loadAnalysis();
    } else {
      setLoading(false);
      setError("Select a repository to analyze.");
    }

    return () => {
      active = false;
    };
  }, [owner, repo, branch]);

  const files = data?.files || [];
  const summary = data?.summary || {};
  const traversals = data?.traversals || {};

  const matchingFiles = files.filter((file) =>
    file.path.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const currentFile = files.find((file) => file.path === selectedFile);
  const dfs = traversals.dfs || [];
  const bfs = traversals.bfs || [];

  if (loading) {
    return (
      <section
        className="overflow-hidden rounded-xl border bg-card p-5 sm:p-7"
        aria-live="polite"
        aria-busy="true"
      >
        <style>{`
        @keyframes analysis-pulse {
        0%, 100% { opacity: .35; transform: scale(.94); }
        50% { opacity: 1; transform: scale(1); }
        }
        @keyframes analysis-scan {
        0% { transform: translateX(-110%); }
        100% { transform: translateX(360%); }
        }
        @keyframes analysis-flow {
        to { stroke-dashoffset: -24; }
        }
        @media (prefers-reduced-motion: reduce) {
        .analysis-motion, .analysis-flow {
            animation: none !important;
        }
        }
    `}</style>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Codebase Intelligence
            </p>
            <h3 className="mt-2 text-xl font-semibold">
              Mapping your codebase
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Inspecting source files and resolving internal dependencies.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs text-muted-foreground">
            <RefreshCw className="size-3.5 animate-spin" />
            Analysis in progress
          </div>
        </div>

        <div className="relative mt-6 overflow-hidden rounded-xl border bg-muted/20 p-4 sm:p-6">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-primary/10 to-transparent analysis-motion"
            style={{ animation: "analysis-scan 2.8s ease-in-out infinite" }}
          />

          <svg
            viewBox="0 0 600 235"
            role="img"
            aria-label="Animated illustration of files being connected during analysis"
            className="relative mx-auto w-full max-w-3xl"
          >
            <defs>
              <linearGradient id="analysis-line" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>

            {[
              [110, 48, 300, 82],
              [300, 82, 490, 48],
              [110, 48, 110, 158],
              [300, 82, 300, 178],
              [490, 48, 490, 158],
              [110, 158, 300, 178],
              [300, 178, 490, 158],
            ].map(([x1, y1, x2, y2], index) => (
              <line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="url(#analysis-line)"
                strokeWidth="2"
                strokeDasharray="5 7"
                className="analysis-flow"
                style={{ animation: `analysis-flow 1.6s linear infinite` }}
                opacity=".8"
              />
            ))}

            {[
              [110, 48, "Source files"],
              [300, 82, "Dependencies"],
              [490, 48, "Imports"],
              [110, 158, "Parsing"],
              [300, 178, "Graph scan"],
              [490, 158, "Risk checks"],
            ].map(([x, y, label], index) => (
              <g key={label}>
                <circle
                  cx={x}
                  cy={y}
                  r="23"
                  fill="#6366f1"
                  fillOpacity=".12"
                  stroke="#818cf8"
                  strokeWidth="1.5"
                  className="analysis-motion"
                  style={{
                    animation: `analysis-pulse 1.8s ease-in-out ${index * 0.18}s infinite`,
                    transformBox: "fill-box",
                    transformOrigin: "center",
                  }}
                />
                <circle cx={x} cy={y} r="5" fill="#818cf8" />
                <text
                  x={x}
                  y={y + 38}
                  fontSize="11"
                  textAnchor="middle"
                  fill="currentColor"
                  opacity=".85"
                >
                  {label}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            "Reading source files",
            "Building dependency graph",
            "Checking circular imports",
          ].map((label, index) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <span
                className="size-2 shrink-0 rounded-full bg-primary analysis-motion"
                style={{
                  animation: `analysis-pulse 1.5s ease-in-out ${index * 0.3}s infinite`,
                }}
              />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border p-5">
        <h2 className="font-semibold">Code Analysis</h2>
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
        <button
          type="button"
          className="mt-3 rounded-md border px-3 py-2 text-sm"
          onClick={() => window.location.reload()}
        >
          Reload page
        </button>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Repository intelligence
          </p>
          <h2 className="mt-1 wrap-break-word text-xl font-semibold">
            {data.repository || `${owner}/${repo}`}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Dependency structure, traversal paths, language mix, and circular
            dependency detection.
            {data.branch && ` Branch: ${data.branch}`}
          </p>
        </div>
        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          {summary.analyzedFiles ?? files.length} files analyzed
        </span>
      </header>

      {summary.filesTruncated && (
        <div
          className="flex items-start gap-2 rounded-lg border p-3 text-sm"
          role="status"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            Analysis is limited to a subset of repository source files.
            Dependency counts and cycle results may not cover the entire
            repository.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric
          label="Analyzed files"
          value={summary.analyzedFiles}
          icon={Activity}
          onClick={() => scrollToSection("explore-analyzed-files")}
          disabled={!files.length}
        />

        <Metric
          label="Dependency edges"
          value={summary.dependencyEdges}
          icon={GitBranch}
          onClick={() => scrollToSection("dependency-graph")}
          disabled={!Number(summary.dependencyEdges)}
        />

        <Metric
          label="Circular dependencies"
          value={summary.circularDependencies}
          icon={RefreshCw}
          onClick={() => scrollToSection("circular-dependencies")}
          disabled={!Number(summary.circularDependencies)}
        />

        <Metric
          label="Unresolved imports"
          value={summary.unresolvedImports}
          icon={GitFork}
          onClick={() => scrollToSection("unresolved-imports")}
          disabled={!data.unresolvedImports?.length}
        />
      </div>

      <div className="space-y-5">
        <LanguageDonut languages={data.languages || []} />

        <Panel
          id="dependency-graph"
          title="Dependency graph"
          description="Internal imports between analyzed files. Select a node to inspect its dependencies."
          icon={Network}
        >
          <DependencyGraph
            files={files}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <TraversalFlow
          title="DFS traversal"
          description={`Depth-first search starting at ${traversals.startFile || "no available file"}.`}
          paths={dfs}
        />
        <TraversalFlow
          title="BFS traversal"
          description="Breadth-first search. Distance counts dependency edges from the start file."
          paths={bfs}
          distances={traversals.bfsDistances || {}}
        />
      </div>

      <Panel
        id="explore-analyzed-files"
        title="Explore analyzed files"
        description="Search the analyzed files and select one to inspect its incoming and outgoing dependencies."
        icon={FileCode2}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search analyzed files…"
            aria-label="Search analyzed files"
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>

        <div className="mt-3 max-h-80 overflow-auto rounded-lg border">
          {matchingFiles.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No matching files.
            </p>
          ) : (
            matchingFiles.map((file) => (
              <button
                type="button"
                key={file.path}
                onClick={() => setSelectedFile(file.path)}
                className={`flex w-full items-start justify-between gap-4 border-b p-3 text-left text-sm last:border-0 hover:bg-muted/50 ${
                  selectedFile === file.path ? "bg-muted" : ""
                }`}
              >
                <span className="min-w-0 break-all font-mono text-xs">
                  {file.path}
                </span>
                <span className="shrink-0 text-right text-xs text-muted-foreground">
                  {file.dependencyCount} outgoing · {file.dependentCount}{" "}
                  incoming
                </span>
              </button>
            ))
          )}
        </div>

        {currentFile && (
          <div className="mt-4 rounded-lg border p-4">
            <h4 className="break-all font-mono text-sm font-medium">
              {currentFile.path}
            </h4>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <p>
                Outgoing dependencies:{" "}
                <strong>{currentFile.dependencyCount}</strong>
              </p>
              <p>
                Incoming dependents:{" "}
                <strong>{currentFile.dependentCount}</strong>
              </p>
              <p>
                Import declarations:{" "}
                <strong>{currentFile.importDeclarationCount}</strong>
              </p>
            </div>

            <p className="mt-4 text-xs font-medium text-muted-foreground">
              Resolved internal dependencies
            </p>
            {currentFile.dependencies?.length ? (
              <ul className="mt-2 space-y-1">
                {currentFile.dependencies.map((dependency) => (
                  <li key={dependency} className="break-all font-mono text-xs">
                    {dependency}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                No resolved internal dependencies.
              </p>
            )}
          </div>
        )}
      </Panel>

      <Panel
        id="circular-dependencies"
        title="Circular dependencies"
        description="Cycles detected in the analyzed dependency graph."
        icon={RefreshCw}
      >
        {(data.cycles || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No circular dependencies were detected in the analyzed graph.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.cycles.map((cycle, index) => (
              <li
                key={`${cycle.join("-")}-${index}`}
                className="rounded-lg bg-muted/50 p-3"
              >
                <p className="text-xs font-medium">Cycle {index + 1}</p>
                <p className="mt-1 break-all font-mono text-xs">
                  {cycle.join(" → ")}
                </p>
              </li>
            ))}
          </ul>
        )}

        {summary.cycleDetectionTruncated && (
          <p className="mt-3 text-xs text-muted-foreground">
            The cycle display limit was reached; additional cycles may exist.
          </p>
        )}
      </Panel>

      {(data.unresolvedImports || []).length > 0 && (
        <details
          id="unresolved-imports"
          className="rounded-xl border bg-card p-4"
        >
          <summary className="cursor-pointer text-sm font-semibold">
            Unresolved imports ({data.unresolvedImports.length})
          </summary>

          <div className="mt-3 max-h-96 overflow-y-auto overscroll-contain pr-2">
            <ul className="space-y-2">
              {data.unresolvedImports.map((item, index) => (
                <li
                  key={`${item.path || "file"}-${item.source || "import"}-${index}`}
                  className="rounded-lg bg-muted/40 p-3 text-xs"
                >
                  <p className="break-all font-mono">
                    {item.path || item.file || "Unknown file"}
                  </p>
                  <p className="mt-1 break-all text-muted-foreground">
                    {item.source ||
                      item.specifier ||
                      item.importPath ||
                      "Unresolved import"}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}

      {(data.fileErrors || []).length > 0 && (
        <details id="file-errors" className="rounded-xl border bg-card p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            Files that could not be analyzed ({data.fileErrors.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {data.fileErrors.map((item, index) => (
              <li key={`${item.path}-${index}`} className="text-xs">
                <p className="break-all font-mono">{item.path}</p>
                <p className="text-muted-foreground">{item.error}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
