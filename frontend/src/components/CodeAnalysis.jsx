import { useEffect, useRef, useState } from "react"
import { Code2, FileCode2, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiRequest } from "@/lib/api"

const supportedExtensions = [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"]

function isAnalyzableFile(path) {
  const lowercasePath = path.toLowerCase()
  return supportedExtensions.some((extension) => lowercasePath.endsWith(extension))
}

function getPhysicalLines(content) {
  if (!content) return []

  const lines = content.split(/\r\n|\n|\r/)
  if (/(?:\r\n|\n|\r)$/.test(content)) lines.pop()
  return lines
}

export default function CodeAnalysis({ repositories = [], repositoriesLoading = false, repositoriesError = "", onNavigate }) {
  const [repositoryName, setRepositoryName] = useState("")
  const selectedRepository = repositories.find(
    (repository) => repository.fullName === repositoryName,
  ) || repositories[0]

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          SOFTWARE INTELLIGENCE
        </p>
        <h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          <Code2 className="size-8 text-primary" />
          Code Analysis
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Select a connected repository and source file to inspect its Babel AST metrics.
        </p>
      </header>

      {repositoriesLoading ? (
        <p className="text-sm text-muted-foreground" role="status">Loading connected repositories...</p>
      ) : repositoriesError ? (
        <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          Unable to load connected repositories: {repositoriesError}
        </p>
      ) : repositories.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
          <FileCode2 className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Connect a repository to get started</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Code analysis is available for JavaScript and TypeScript files in your connected repositories.
          </p>
          <Button className="mt-5" onClick={() => onNavigate("/")}>Connect repository</Button>
        </div>
      ) : (
        <>
          <div className="mb-5 max-w-md">
            <label htmlFor="analysis-repository" className="text-sm font-medium">Repository</label>
            <select
              id="analysis-repository"
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={selectedRepository?.fullName || ""}
              onChange={(event) => setRepositoryName(event.target.value)}
            >
              {repositories.map((repository) => (
                <option value={repository.fullName} key={repository.fullName}>
                  {repository.fullName}
                </option>
              ))}
            </select>
          </div>
          {selectedRepository && (
            <RepositoryCodeAnalysis key={selectedRepository.fullName} repository={selectedRepository} />
          )}
        </>
      )}
    </section>
  )
}

function RepositoryCodeAnalysis({ repository }) {
  const [repositoryData, setRepositoryData] = useState(null)
  const [repositoryLoading, setRepositoryLoading] = useState(true)
  const [repositoryError, setRepositoryError] = useState("")
  const [selectedFilePath, setSelectedFilePath] = useState("")
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState("")
  const fileRequestId = useRef(0)

  useEffect(() => {
    let active = true

    apiRequest(
      `/api/github/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`,
    )
      .then((result) => {
        if (active) setRepositoryData(result)
      })
      .catch((error) => {
        if (active) setRepositoryError(error.message || "Unable to load repository files.")
      })
      .finally(() => {
        if (active) setRepositoryLoading(false)
      })

    return () => {
      active = false
      fileRequestId.current += 1
    }
  }, [repository.owner, repository.name])

  async function handleFileSelect(path) {
    if (!repositoryData) return

    const requestId = fileRequestId.current + 1
    fileRequestId.current = requestId
    setSelectedFilePath(path)
    setSelectedFile(null)
    setFileLoading(true)
    setFileError("")
    const query = new URLSearchParams({
      path,
      ref: repositoryData.repository.defaultBranch,
    })

    try {
      const result = await apiRequest(
        `/api/github/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}/file?${query}`,
      )
      if (fileRequestId.current === requestId) setSelectedFile(result)
    } catch (error) {
      if (fileRequestId.current === requestId) {
        setFileError(error.message || "Unable to analyze this file.")
      }
    } finally {
      if (fileRequestId.current === requestId) setFileLoading(false)
    }
  }

  const files = repositoryData?.files.filter((file) => isAnalyzableFile(file.path)) || []

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(16rem,1fr)_minmax(0,2fr)]">
      <section className="min-w-0 rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">JavaScript / TypeScript files</h2>
        </div>
        {repositoryLoading ? (
          <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground" role="status">
            <LoaderCircle className="size-4 animate-spin" /> Loading repository files...
          </p>
        ) : repositoryError ? (
          <p className="p-4 text-sm text-destructive" role="alert">{repositoryError}</p>
        ) : files.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No supported source files were found in this repository.
          </p>
        ) : (
          <ul className="max-h-[65dvh] overflow-y-auto p-2">
            {files.map((file) => (
              <li key={file.path}>
                <button
                  type="button"
                  className={`w-full truncate rounded-md px-3 py-2 text-left font-mono text-xs hover:bg-muted ${selectedFilePath === file.path ? "bg-muted font-medium text-primary" : ""}`}
                  aria-current={selectedFilePath === file.path ? "true" : undefined}
                  onClick={() => handleFileSelect(file.path)}
                >
                  {file.path}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="min-w-0 space-y-5">
        <section className="min-w-0 overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <h2 className="flex items-center gap-2 font-medium">
              <FileCode2 className="size-4 text-primary" />
              File preview
            </h2>
            {selectedFile && (
              <span className="truncate text-xs text-muted-foreground" title={selectedFile.path}>
                {selectedFile.path}
              </span>
            )}
          </div>
          {fileLoading ? (
            <p className="flex items-center gap-2 p-5 text-sm text-muted-foreground" role="status">
              <LoaderCircle className="size-4 animate-spin" /> Loading file preview...
            </p>
          ) : fileError ? (
            <p className="p-5 text-sm text-destructive" role="alert">{fileError}</p>
          ) : selectedFile?.isBinary ? (
            <p className="p-5 text-sm text-muted-foreground">
              This is a binary file and cannot be shown as text.
            </p>
          ) : selectedFile ? (
            <pre className="max-h-[55dvh] overflow-auto p-4 text-xs leading-5">
              <code className="block min-w-max">{getPhysicalLines(selectedFile.content).map((line, index) => (
                <span className="grid grid-cols-[3rem_1fr]" key={index}>
                  <span aria-hidden="true" className="select-none pr-4 text-right text-muted-foreground/60">
                    {index + 1}
                  </span>
                  <span>{line || " "}</span>
                </span>
              ))}</code>
            </pre>
          ) : (
            <p className="p-5 text-sm text-muted-foreground">
              Select a source file to preview its contents here.
            </p>
          )}
        </section>

        <section className="min-w-0 rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <h2 className="flex items-center gap-2 font-medium">
              <Code2 className="size-4 text-primary" />
              Analysis results
            </h2>
            {selectedFile?.analysis && (
              <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                Babel AST · {selectedFile.analysis.language}
              </span>
            )}
          </div>
          {fileLoading ? (
            <p className="flex items-center gap-2 p-5 text-sm text-muted-foreground" role="status">
              <LoaderCircle className="size-4 animate-spin" /> Parsing selected file...
            </p>
          ) : fileError ? (
            <p className="p-5 text-sm text-destructive" role="alert">{fileError}</p>
          ) : selectedFile?.analysis ? (
            <div className="p-5">
              <p className="mb-4 truncate text-xs text-muted-foreground" title={selectedFile.path}>
                {selectedFile.path}
              </p>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["AST nodes", selectedFile.analysis.nodeCount],
                  ["Functions", selectedFile.analysis.functionCount],
                  ["Classes", selectedFile.analysis.classCount],
                  ["Variables", selectedFile.analysis.variableDeclarationCount],
                ].map(([label, value]) => (
                  <div className="rounded-lg border bg-background p-3" key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-1 text-xl font-semibold">{value.toLocaleString()}</dd>
                  </div>
                ))}
              </dl>
              {selectedFile.analysis.topLevelNodeTypes.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold">Top-level constructs</h3>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {selectedFile.analysis.topLevelNodeTypes.map((type, index) => (
                      <li className="rounded-md bg-muted px-2 py-1 font-mono text-xs" key={`${type}-${index}`}>
                        {type}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedFile.analysis.functions.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold">Functions</h3>
                  <ul className="mt-2 divide-y rounded-lg border">
                    {selectedFile.analysis.functions.map((item, index) => (
                      <li className="flex items-start justify-between gap-3 px-3 py-2 text-sm" key={`${item.name || item.label}-${item.line}-${index}`}>
                        <span className="min-w-0">
                          <span className="block truncate font-mono">
                            {item.label || item.name || `Inline Function (Line ${item.line ?? "?"})`}
                          </span>
                          <span className="mt-1 block truncate text-xs text-muted-foreground" title={item.path || selectedFile.path}>
                            {item.path || selectedFile.path}
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-xs text-muted-foreground">
                          <span className="block">Line {item.line ?? "?"} · {item.parameters} params</span>
                          <span className="mt-1 block" title={item.type}>
                            {item.type?.replace(/([a-z])([A-Z])/g, "$1 $2") || "Function"}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedFile.analysis.classes.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold">Classes</h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {selectedFile.analysis.classes.map((item, index) => (
                      <li className="font-mono" key={`${item.name}-${item.line}-${index}`}>
                        {item.name} · line {item.line ?? "?"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedFile.analysis.imports.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold">Imports</h3>
                  <ul className="mt-2 divide-y rounded-lg border">
                    {selectedFile.analysis.imports.map((item, index) => (
                      <li className="px-3 py-2 text-sm" key={`${item.source}-${index}`}>
                        <code>{item.source}</code>
                        {item.specifiers.length > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {item.specifiers.join(", ")}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : selectedFile?.analysisError ? (
            <p className="p-5 text-sm text-destructive" role="alert">
              Unable to analyze {selectedFile.path}: {selectedFile.analysisError}
            </p>
          ) : selectedFile ? (
            <p className="p-5 text-sm text-muted-foreground">
              No Babel analysis is available for this file.
            </p>
          ) : (
            <p className="p-5 text-sm text-muted-foreground">
              Select a source file to view its code analysis.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
