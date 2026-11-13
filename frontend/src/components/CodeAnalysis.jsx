import { useEffect, useState } from "react";
import { Activity, AlertTriangle, GitBranch, GitFork, RefreshCw, Search, Network, FileCode2, ChevronLeft, ChevronRight } from "lucide-react";
import { apiRequest } from "../lib/api";
import DependencyGraph from "./DependencyGraph";

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
    <section id={id} className="flex h-full min-w-0 flex-col rounded-xl border bg-card p-4 sm:p-5">
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

// function TraversalFlow({ title, description, paths, distances }) {
//   const visible = paths.slice(0, MAX_FLOW_NODES);

//   return (
//     <Panel title={title} description={description} icon={GitBranch}>
//       {visible.length === 0 ? (
//         <p className="text-sm text-muted-foreground">
//           No traversal nodes are available.
//         </p>
//       ) : (
//         <div className="space-y-2">
//           {visible.map((path, index) => (
//             <div key={`${path}-${index}`} className="flex items-center gap-2">
//               <div className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-semibold">
//                 {index + 1}
//               </div>
//               <div className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2">
//                 <p className="break-all font-mono text-xs" title={path}>
//                   {path}
//                 </p>
//                 {distances && (
//                   <p className="mt-1 text-xs text-muted-foreground">
//                     Distance from start: {distances[path] ?? "unknown"}
//                   </p>
//                 )}
//               </div>
//             </div>
//           ))}
//           {visible.length > 1 && (
//             <p className="pl-9 text-xs text-muted-foreground">
//               Ordered traversal: node {visible.length > 1 ? "1 → " : ""}
//               {visible.length}
//             </p>
//           )}
//           {paths.length > MAX_FLOW_NODES && (
//             <p className="text-xs text-muted-foreground">
//               Showing the first {MAX_FLOW_NODES} of {paths.length} traversal
//               nodes.
//             </p>
//           )}
//         </div>
//       )}
//     </Panel>
//   );
// }


function TraversalFlow({ title, description, paths = [], distances }) {
  const hasPaths = paths.length > 0;

  return (
    <Panel title={title} description={description} icon={GitBranch}>
      {!hasPaths ? (
        <div className="flex min-h-20 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No traversal nodes are available.
        </div>
      ) : (
        <>
          <div className="max-h-80 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2">
            <div className="space-y-2">
              {paths.map((path, index) => (
                <div
                  key={`${path}-${index}`}
                  className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/70 p-2 transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="break-all font-mono text-xs leading-5"
                      title={path}
                    >
                      {path}
                    </p>

                    {distances && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Distance from start: {distances[path] ?? "unknown"}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
            <span>
              {paths.length} {paths.length === 1 ? "node" : "nodes"} visited
            </span>
            <span>Traversal order: 1 → {paths.length}</span>
          </div>
        </>
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
  const [astMetricIndex, setAstMetricIndex] = useState(0);

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
            AST metrics, dependency structure, traversal paths, and circular
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
        <Panel title="AST analysis" icon={FileCode2}
          description="Babel Parser metrics across successfully parsed JavaScript and TypeScript files."
        >
          {(() => {
  const astMetrics = [
    ["Repository LOC", summary.linesOfCode],
    ["AST nodes", summary.astNodes],
    ["Functions", summary.functionCount],
    ["Classes", summary.classCount],
    ["Imports", summary.importCount],
    ["Calls", summary.callCount],
    ["Max nesting depth", summary.maxNestingDepth],
    ["Max function nesting", summary.maxFunctionNestingDepth],
    ["Conditionals", summary.conditionalCount],
    ["Loops", summary.loopCount],
    ["Switch statements", summary.switchCount],
    ["Try/catch", summary.tryCatchCount],
  ];

  const visibleCount = 4;
  const maxIndex = Math.max(0, astMetrics.length - visibleCount);

  return (
    <div className="flex min-w-0 items-center gap-3 sm:gap-4">

      {/* Left navigation button */}
      <button
        type="button"
        onClick={() =>
          setAstMetricIndex((current) => Math.max(0, current - 1))
        }
        disabled={astMetricIndex === 0}
        aria-label="Show previous AST metric"
        className="flex h-22 w-8 shrink-0 self-stretch items-center justify-center rounded-md bg-[#181818] text-foreground transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronLeft className="size-5" />
      </button>

      {/* Metric carousel */}
      <div className="min-w-0 flex-1 overflow-hidden">
        <div
          className="flex gap-3 transition-transform duration-300 ease-in-out"
          style={{
            transform: `translateX(calc(${astMetricIndex} * (-25% - 2.25px)))`,
          }}
        >
          {astMetrics.map(([label, value]) => (
            <div
              key={label}
              className="min-w-0 flex-[0_0_calc((100%-36px)/4)] rounded-xl border border-border/70 bg-background/60 p-3 transition-colors duration-200 hover:border-primary/40 hover:bg-muted/30"
            >
              <p className="min-h-8 text-xs leading-4 text-muted-foreground">
                {label}
              </p>

              <p className="mt-2 wrap-break-word text-xl font-semibold tracking-tight tabular-nums">
                {value == null ? "—" : Number(value).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Right navigation button */}
      <button
        type="button"
        onClick={() =>
          setAstMetricIndex((current) => Math.min(maxIndex, current + 1))
        }
        disabled={astMetricIndex >= maxIndex}
        aria-label="Show next AST metric"
        className="flex h-22 w-8 self-stretch shrink-0 items-center justify-center rounded-md bg-[#181818] text-foreground transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronRight className="size-5" />
      </button>

    </div>
  );
})()}

        </Panel>

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
            cycles={data.cycles || []}
          />
        </Panel>
      </div>

      <div className="grid items-stretch gap-5 xl:grid-cols-2">
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
