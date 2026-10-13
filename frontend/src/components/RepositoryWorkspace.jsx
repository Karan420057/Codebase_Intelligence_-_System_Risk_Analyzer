
import { useRef, useState } from "react";
import { GitFork, Upload, FileArchive, ArrowRight, FolderGit2, ShieldCheck, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function RepositoryWorkspace() {
  const [repoUrl, setRepoUrl] = useState("");
  const [zipFile, setZipFile] = useState(null);
  const [error, setError] = useState("");
  const [source, setSource] = useState("github");

  const fileInputRef = useRef(null);

  function handleRepoSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const url = new URL(repoUrl.trim());
      const parts = url.pathname.split("/").filter(Boolean);

      if (
        url.protocol !== "https:" ||
        url.hostname.toLowerCase() !== "github.com" ||
        parts.length < 2 ||
        !/^[\w.-]+$/.test(parts[0]) ||
        !/^[\w.-]+$/.test(parts[1])
      ) {
        throw new Error("Enter a valid GitHub repository URL.");
      }

      const owner = parts[0];
      const repo = parts[1].replace(/\.git$/, "");

      if (!repo || repo === "." || repo === "..") {
        throw new Error("Enter a valid repository name.");
      }

      // Week 2: Send owner and repo to your Express API.
      console.log("Repository selected:", { owner, repo });

      setError(
        "Repository URL validated. Backend analysis integration is coming next."
      );
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Enter a valid URL, such as https://github.com/owner/repository."
          : err.message || "Unable to validate the repository URL."
      );
    }
  }

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
    <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border bg-card shadow-sm">
          <FolderGit2 className="size-7 text-primary" />
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Software Intelligence
        </p>

        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Understand your codebase.
          <span className="block text-muted-foreground">
            Identify software risks.
          </span>
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          Connect a GitHub repository or upload your project as a ZIP file
          to get started with code quality, dependency and risk analysis.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-2xl rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
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
            GitHub Repository
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
            Upload ZIP
          </Button>
        </div>

        {source === "github" ? (
          <form onSubmit={handleRepoSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="repository-url">
                GitHub repository URL
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

                <Button type="submit" className="gap-2">
                  Connect Repository
                  <ArrowRight className="size-4" />
                </Button>
              </div>

              <p className="text-xs leading-5 text-muted-foreground">
                Public repositories can be analyzed without GitHub sign-in.
                Private repositories require authorized access.
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

        {error && (
          <p
            role="status"
            aria-live="polite"
            className="mt-4 rounded-lg bg-muted p-3 text-sm"
          >
            {error}
          </p>
        )}

        <Separator className="my-5" />

        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

          <p className="text-xs leading-5 text-muted-foreground">
            Repository access should be read-only. Keep access tokens on
            the backend and never expose private source code or credentials
            to unauthorized users.
          </p>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        No repository selected yet. Your analysis workspace will appear here.
      </p>
    </section>
  );
}
