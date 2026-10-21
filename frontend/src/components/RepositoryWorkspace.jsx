import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowLeft, ExternalLink, FileArchive, FileCode2, FolderGit2, GitCommitHorizontal, GitFork, LoaderCircle, Search, ShieldCheck, Upload, X, } from "lucide-react";
import { useLanguage } from "../lib/i18n.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/api";

function formatDate(value) {
  if (!value) return "Unknown date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function RepositoryWorkspace({
  repositoryRoute = null,
  showRepositoryList = false,
  repositories = [],
  repositoriesLoading = false,
  repositoriesError = '',
  onRepositoryFetched = () => {},
  onNavigate = () => {},
}) {
  const { t } = useLanguage();
  const [repoUrl, setRepoUrl] = useState("");
  const [zipFile, setZipFile] = useState(null);
  const [error, setError] = useState("");
  const [source, setSource] = useState("github");
  const [repositoryData, setRepositoryData] = useState(null);
  const [loadingRepository, setLoadingRepository] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileError, setFileError] = useState("");
  const [commitPage, setCommitPage] = useState(1);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [commitError, setCommitError] = useState("");

  const fileInputRef = useRef(null);
  const routeOwner = repositoryRoute?.owner;
  const routeRepo = repositoryRoute?.repo;

  useEffect(() => {
    if (!routeOwner || !routeRepo) return undefined;

    const currentRepository = repositoryData?.repository;
    if (
      currentRepository?.owner.login.toLowerCase() === routeOwner.toLowerCase()
      && currentRepository?.name.toLowerCase() === routeRepo.toLowerCase()
    ) {
      return undefined;
    }

    let active = true;
    apiRequest(
      `/api/github/${encodeURIComponent(routeOwner)}/${encodeURIComponent(routeRepo)}`
    )
      .then((result) => {
        if (!active) return;
        setRepositoryData(result);
        setSelectedFile(null);
        setFileError("");
        setFileSearch("");
        setCommitPage(1);
        setCommitError("");
        onRepositoryFetched({
          owner: result.repository.owner.login,
          name: result.repository.name,
          fullName: result.repository.fullName,
          url: result.repository.url,
        });
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Unable to fetch this GitHub repository.");
      })
      .finally(() => {
        if (active) setLoadingRepository(false);
      });

    return () => {
      active = false;
    };
  }, [routeOwner, routeRepo, repositoryData, onRepositoryFetched]);

  async function handleRepoSubmit(event) {
    event.preventDefault();
    setError("");

    let owner;
    let repo;
    try {
      const url = new URL(repoUrl.trim());
      const parts = url.pathname.split("/").filter(Boolean);

      if (
        url.protocol !== "https:" ||
        url.hostname.toLowerCase() !== "github.com" ||
        url.username ||
        url.password ||
        parts.length !== 2 ||
        parts[0] === "." ||
        parts[0] === ".." ||
        !/^[\w.-]+$/.test(parts[0]) ||
        !/^[\w.-]+$/.test(parts[1])
      ) {
        throw new Error("Enter a valid GitHub repository URL.");
      }

      owner = parts[0];
      repo = parts[1].replace(/\.git$/, "");

      if (!repo || repo === "." || repo === "..") {
        throw new Error("Enter a valid repository name.");
      }
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Enter a valid URL, such as https://github.com/owner/repository."
          : err.message || "Unable to validate the repository URL."
      );
      return;
    }

    setLoadingRepository(true);
    setRepositoryData(null);
    setSelectedFile(null);
    setFileError("");
    setFileSearch("");
    setCommitPage(1);
    setCommitError("");
    try {
      const result = await apiRequest(
        `/api/github/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
      );
      setRepositoryData(result);
      onRepositoryFetched({
        owner: result.repository.owner.login,
        name: result.repository.name,
        fullName: result.repository.fullName,
        url: result.repository.url,
      });
      onNavigate(`/repositories/${encodeURIComponent(result.repository.owner.login)}/${encodeURIComponent(result.repository.name)}`);
    } catch (requestError) {
      setError(requestError.message || "Unable to fetch this GitHub repository.");
    } finally {
      setLoadingRepository(false);
    }
  }

  async function handleFileSelect(file) {
    setSelectedFile(null);
    setFileError("");
    setLoadingFile(true);

    const query = new URLSearchParams({
      path: file.path,
      ref: activeRepositoryData.repository.defaultBranch,
    });

    try {
      const result = await apiRequest(
        `/api/github/${encodeURIComponent(activeRepositoryData.repository.owner.login)}/${encodeURIComponent(activeRepositoryData.repository.name)}/file?${query}`
      );
      setSelectedFile(result);
    } catch (requestError) {
      setFileError(requestError.message || "Unable to fetch this file.");
    } finally {
      setLoadingFile(false);
    }
  }

  async function handleLoadMoreCommits() {
    setLoadingCommits(true);
    setCommitError("");

    const nextPage = commitPage + 1;
    const { owner, name } = activeRepositoryData.repository;
    try {
      const result = await apiRequest(
        `/api/github/${encodeURIComponent(owner.login)}/${encodeURIComponent(name)}/commits?page=${nextPage}`
      );
      setRepositoryData((current) => ({
        ...current,
        commits: [...current.commits, ...result.commits],
        hasMoreCommits: result.hasMore,
      }));
      setCommitPage(nextPage);
    } catch (requestError) {
      setCommitError(requestError.message || "Unable to fetch more commits.");
    } finally {
      setLoadingCommits(false);
    }
  }

  const activeRepositoryData = repositoryRoute
    && repositoryData?.repository.owner.login.toLowerCase() === repositoryRoute.owner.toLowerCase()
    && repositoryData?.repository.name.toLowerCase() === repositoryRoute.repo.toLowerCase()
    ? repositoryData
    : null;
  const matchingFiles = activeRepositoryData?.files.filter((file) =>
    file.path.toLowerCase().includes(fileSearch.trim().toLowerCase())
  ) ?? [];

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    setError("");

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError("Please select a .zip archive.");
      event.target.value = "";
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError("The ZIP file must be 100 MB or smaller.");
      event.target.value = "";
      return;
    }

    setZipFile(file);
    setSource("zip");
  }

  function clearZip() {
    setZipFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setError("");
  }

  return (
    <section className={repositoryRoute
      ? "h-[calc(100dvh-4rem)] w-full max-w-none overflow-hidden p-0"
      : "mx-auto w-full max-w-7xl px-4 py-10 sm:px-8 sm:py-14"}
    >
      {showRepositoryList ? (
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {t("workspace")}
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                {t("repositoryTitle")}
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                {t("repositoryDescription")}
              </p>
            </div>

            <Button
              type="button"
              className="gap-2"
              onClick={() => onNavigate("/")}
            >
              <GitFork className="size-4" />
              {t("connectRepository")}
            </Button>
          </div>

          
          {repositoriesLoading && (
            <p
              className="mt-8 text-sm text-muted-foreground"
              role="status"
            >
              {t("loadingRepositories")}
            </p>
          )}

          {repositoriesError && (
            <p
              className="mt-8 rounded-lg bg-destructive/10 p-4 text-sm text-destructive"
              role="alert"
            >
              {t("unableLoadRepositories")}: {repositoriesError}
            </p>
          )}

          {!repositoriesLoading && !repositoriesError && repositories.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
              <FolderGit2 className="mx-auto size-10 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-semibold">
                {t("noRepositoriesYet")}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {t("connectRepositoryHelp")}
              </p>

              <Button
                type="button"
                className="mt-5 gap-2"
                onClick={() => onNavigate("/")}
              >
                {t("connectFirstRepository")}
                <ArrowRight className="size-4" />
              </Button>

            </div>
          ) : repositories.length > 0 && (
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {repositories.map((repository) => {
                const path = `/repositories/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`;
                return (
                  <li key={repository.fullName}>
                    <button
                      type="button"
                      className="group flex h-full w-full items-center gap-4 rounded-2xl border bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => onNavigate(path)}
                    >
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <FolderGit2 className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate font-semibold group-hover:text-primary">
                          {repository.name}
                        </h2>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {repository.fullName}
                        </p>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
      <>
      
      {!repositoryRoute && (
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border bg-card shadow-sm">
            <FolderGit2 className="size-7 text-primary" />
          </div>

          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {t("softwareIntelligence")}
          </p>

          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("understandCodebase")}
            <span className="block text-muted-foreground">
              {t("identifyRisks")}
            </span>
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            {t("connectOrUploadHelp")}
          </p>
        </div>
      )}

      <div className={repositoryRoute
        ? "h-full w-full overflow-y-auto bg-background lg:overflow-hidden"
        : "mx-auto mt-10 max-w-2xl rounded-2xl border bg-card p-4 shadow-sm sm:p-6"}
      >
        {!repositoryRoute && (
        <>
        
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
        <Button
          type="button"
          variant={source === "github" ? "secondary" : "ghost"}
          className="gap-2"
          onClick={() => {
            setSource("github");
            setError("");
          }}
        >
          <GitFork className="size-4" />
          {t("githubRepository")}
        </Button>

        <Button
          type="button"
          variant={source === "zip" ? "secondary" : "ghost"}
          className="gap-2"
          onClick={() => {
            setSource("zip");
            setError("");
          }}
        >
          <Upload className="size-4" />
          {t("uploadZip")}
        </Button>
      </div>

        {source === "github" ? (
          <form onSubmit={handleRepoSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              
              <Label htmlFor="repository-url">
                {t("githubRepositoryUrl")}
              </Label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <GitFork className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    id="repository-url"
                    type="url"
                    placeholder="https://github.com/owner/repository"
                    value={repoUrl}
                    onChange={(event) => setRepoUrl(event.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
                
                <Button type="submit" className="gap-2" disabled={loadingRepository}>
                  {loadingRepository ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      {t("fetchingRepository")}
                    </>
                  ) : (
                    <>
                      {t("connectRepository")}
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>

              </div>

              <p className="text-sm text-muted-foreground">
                {t("publicRepositoryHelp")}
              </p>
            </div>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <input
              ref={fileInputRef}
              id="project-zip"
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              className="sr-only"
              onChange={handleFileChange}
            />

            <Label
              htmlFor="project-zip"
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center transition-colors hover:border-primary hover:bg-muted/50 sm:p-10"
            >
              <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10">
                <Upload className="size-6 text-primary" />
              </div>

              <span className="font-medium">
                Click to upload your project ZIP
              </span>

              <span className="mt-2 text-xs text-muted-foreground">
                ZIP archive · Maximum 100 MB
              </span>
            </Label>

            {zipFile && (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <FileArchive className="size-5 shrink-0 text-primary" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {zipFile.name}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {(zipFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove selected ZIP"
                  onClick={clearZip}
                >
                  <X className="size-4" />
                </Button>
              </div>
            )}

            <Button
              type="button"
              className="w-full gap-2"
              disabled={!zipFile}
              onClick={() => {
                // Week 2: Upload zipFile using FormData to Express.
                setError(
                  "ZIP selected. Backend upload and analysis integration is coming next."
                );
              }}
            >
              Prepare ZIP Analysis
              <ArrowRight className="size-4" />
            </Button>

            <p className="text-xs leading-5 text-muted-foreground">
              ZIP analysis can inspect source code and dependencies found
              in the archive. It cannot recover commit history that was
              not included in the upload.
            </p>
          </div>
        )}
        </>
        )}

        {(loadingRepository || (repositoryRoute && !activeRepositoryData && !error)) && (
          <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <LoaderCircle className="size-4 animate-spin" />
            {repositoryRoute
              ? "Loading repository details, files, and commits..."
              : "Fetching repository details, files, and recent commits..."}
          </p>
        )}

        {activeRepositoryData && (
          <div className={repositoryRoute
            ? `grid h-full items-start ${selectedFile || loadingFile || fileError ? "grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" : "grid-cols-1"}`
            : "mt-6 grid items-start gap-5 lg:grid-cols-2"}
          >
            <div className={repositoryRoute
              ? "min-w-0 px-4 py-5 sm:px-6 lg:h-full lg:overflow-y-auto"
              : "min-w-0 space-y-5"}
            >
              {repositoryRoute && (
                <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                      Repositories
                    </p>
                    <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                      {activeRepositoryData.repository.name}
                    </h1>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {activeRepositoryData.repository.fullName}
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2" onClick={() => onNavigate("/repositories")}>
                    <ArrowLeft className="size-4" />
                    All repositories
                  </Button>
                </header>
              )}
            <section className="rounded-xl border bg-background p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src={activeRepositoryData.repository.owner.avatarUrl}
                    alt=""
                    className="size-11 rounded-full"
                  />
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold">
                      {activeRepositoryData.repository.fullName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {activeRepositoryData.repository.description || "No repository description."}
                    </p>
                  </div>
                </div>
                <a
                  href={activeRepositoryData.repository.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  View on GitHub
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
              {activeRepositoryData.repository.homepage && (
                <a
                  href={activeRepositoryData.repository.homepage}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {activeRepositoryData.repository.homepage}
                  <ExternalLink className="size-3" />
                </a>
              )}

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-muted-foreground">Default branch</p>
                  <p className="mt-1 truncate font-medium">{activeRepositoryData.repository.defaultBranch}</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-muted-foreground">Language</p>
                  <p className="mt-1 truncate font-medium">{activeRepositoryData.repository.language || "Not specified"}</p>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-muted-foreground">Stars</p>
                  <p className="mt-1 font-medium">
                    {activeRepositoryData.repository.stars.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-muted-foreground">Contributors</p>
                  <p className="mt-1 font-medium">
                    {activeRepositoryData.repository.contributorCount.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-muted-foreground">Files / issues</p>
                  <p className="mt-1 font-medium">
                    {activeRepositoryData.files.length.toLocaleString()} / {activeRepositoryData.repository.openIssues.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-muted-foreground">Repository size</p>
                  <p className="mt-1 font-medium">
                    {activeRepositoryData.repository.size.toLocaleString()} KB
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span>{activeRepositoryData.repository.private ? "Private" : "Public"}</span>
                {activeRepositoryData.repository.archived && <span>Archived</span>}
                {activeRepositoryData.repository.license && (
                  <span>License: {activeRepositoryData.repository.license.name}</span>
                )}
                <span>Created: {formatDate(activeRepositoryData.repository.createdAt)}</span>
                <span>Updated: {formatDate(activeRepositoryData.repository.updatedAt)}</span>
                <span>Last pushed: {formatDate(activeRepositoryData.repository.pushedAt)}</span>
                {activeRepositoryData.repository.topics.map((topic) => (
                  <span className="rounded-full bg-muted px-2 py-0.5" key={topic}>{topic}</span>
                ))}
              </div>
            </section>

            <section className="min-w-0 rounded-xl border bg-background">
                <div className="border-b px-4 py-3">
                  <div className="flex items-center gap-2 font-medium">
                    <FileCode2 className="size-4 text-primary" />
                    Repository files
                    <span className="text-xs font-normal text-muted-foreground">
                      {activeRepositoryData.files.length.toLocaleString()}
                    </span>
                  </div>
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      aria-label="Search repository files"
                      placeholder="Search files..."
                      value={fileSearch}
                      onChange={(event) => setFileSearch(event.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {matchingFiles.length === 0 ? (
                    <p className="px-2 py-5 text-center text-sm text-muted-foreground">
                      No files match your search.
                    </p>
                  ) : (
                    matchingFiles.slice(0, 100).map((file) => (
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        key={file.path}
                        onClick={() => handleFileSelect(file)}
                      >
                        <span className="min-w-0 truncate font-mono text-xs">{file.path}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {Math.ceil(file.size / 1024)} KB
                        </span>
                      </button>
                    ))
                  )}
                  {matchingFiles.length > 100 && (
                    <p className="px-2 py-2 text-xs text-muted-foreground">
                      Showing 100 matches. Search to narrow the list.
                    </p>
                  )}
                </div>
                {activeRepositoryData.filesTruncated && (
                  <p className="border-t px-4 py-3 text-xs text-muted-foreground" role="status">
                    GitHub shortened this file listing because the repository is very large.
                  </p>
                )}
            </section>

            <section className="rounded-xl border bg-background">
              <div className="flex items-center gap-2 border-b px-4 py-3 font-medium">
                <GitCommitHorizontal className="size-4 text-primary" />
                Commit history
                <span className="text-xs font-normal text-muted-foreground">
                  Latest {activeRepositoryData.commits.length}
                </span>
              </div>
              {activeRepositoryData.commits.length === 0 ? (
                <p className="px-4 py-5 text-sm text-muted-foreground">No commits found.</p>
              ) : (
                <ul className="divide-y">
                  {activeRepositoryData.commits.map((commit) => (
                    <li className="flex items-start gap-3 px-4 py-4" key={commit.sha}>
                      {commit.authorAvatar ? (
                        <img src={commit.authorAvatar} alt="" className="mt-0.5 size-8 rounded-full" />
                      ) : (
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          <GitCommitHorizontal className="size-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <a
                          href={commit.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block whitespace-pre-wrap break-words text-sm font-medium hover:text-primary"
                        >
                          {commit.message}
                        </a>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {commit.authorName}
                          {commit.authorLogin ? ` (@${commit.authorLogin})` : ""}
                          {" · "}{formatDate(commit.date)}
                          {" · "}
                          <code>{commit.sha.slice(0, 7)}</code>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {commitError && (
                <p className="border-t px-4 py-3 text-sm text-destructive" role="alert">{commitError}</p>
              )}
              {activeRepositoryData.hasMoreCommits && (
                <div className="border-t p-3 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={loadingCommits}
                    onClick={handleLoadMoreCommits}
                  >
                    {loadingCommits ? (
                      <>
                        <LoaderCircle className="mr-2 size-4 animate-spin" />
                        Loading commits...
                      </>
                    ) : "Load more commits"}
                  </Button>
                </div>
              )}
            </section>
            </div>

            {(selectedFile || loadingFile || fileError) && (
              <section className={`relative min-w-0 overflow-hidden border bg-background ${repositoryRoute
                ? "min-h-[60dvh] border-t lg:h-full lg:min-h-0 lg:border-l lg:border-t-0"
                : "rounded-xl"}
              `}>
                {repositoryRoute && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 z-10 hidden h-14 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/40 lg:block"
                  />
                )}
                <div className="flex min-h-12 items-center justify-between gap-3 border-b px-4 py-3">
                  <h3 className="truncate text-sm font-medium">
                    {selectedFile?.path || "File preview"}
                  </h3>
                  {selectedFile && (
                    <a
                      href={selectedFile.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                    >
                      GitHub
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
                {loadingFile ? (
                  <p className="flex items-center gap-2 p-5 text-sm text-muted-foreground" role="status">
                    <LoaderCircle className="size-4 animate-spin" />
                    Fetching file contents...
                  </p>
                ) : fileError ? (
                  <p className="p-5 text-sm text-destructive" role="alert">{fileError}</p>
                ) : selectedFile?.isBinary ? (
                  <p className="p-5 text-sm text-muted-foreground">
                    This is a binary file and cannot be shown as text.
                  </p>
                ) : selectedFile ? (
                  <pre className={repositoryRoute
                    ? "max-h-[60dvh] overflow-auto p-4 text-xs leading-5 lg:h-[calc(100%-3rem)] lg:max-h-none"
                    : "max-h-96 overflow-auto p-4 text-xs leading-5"}
                  ><code>{selectedFile.content}</code></pre>
                ) : null}
              </section>
            )}
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        {!repositoryRoute && (
          <>
            <Separator className="my-5" />

            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

              <p className="text-xs leading-5 text-muted-foreground">
                {t("repositoryAccessNotice")}
              </p>
            </div>
          </>
        )}
      </div>

      
      {!repositoryRoute && !activeRepositoryData && !loadingRepository && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("noRepositorySelected")}
        </p>
      )}
      </>
      )}
    </section>
  );
}
