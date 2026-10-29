import { useEffect, useState } from "react";
import { Code2, FolderGit2 } from "lucide-react";
import CodeAnalysis from "./CodeAnalysis";

export default function CodeAnalysisPage({
  repositories = [],
  repositoriesLoading = false,
  repositoriesError = "",
}) {
  const [selectedRepository, setSelectedRepository] = useState("");

  useEffect(() => {
    if (repositories.length === 0) {
      setSelectedRepository("");
      return;
    }

    const selectionExists = repositories.some(
      (repository) => repository.fullName === selectedRepository,
    );

    if (!selectionExists) {
      setSelectedRepository(repositories[0].fullName);
    }
  }, [repositories, selectedRepository]);

  const repository = repositories.find(
    (item) => item.fullName === selectedRepository,
  );

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <Code2 className="size-6" />
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Code Analysis
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Explore source files, dependencies, traversal paths, and
            circular dependencies in your repositories.
          </p>
        </div>
      </header>

      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <label
          htmlFor="analysis-repository"
          className="mb-2 flex items-center gap-2 text-sm font-medium"
        >
          <FolderGit2 className="size-4 text-muted-foreground" />
          Select repository
        </label>

        {repositoriesLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading your repositories...
          </p>
        ) : repositoriesError ? (
          <p className="text-sm text-destructive" role="alert">
            {repositoriesError}
          </p>
        ) : repositories.length === 0 ? (
          <div className="rounded-lg border border-dashed p-5">
            <p className="font-medium">No saved repositories yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a repository from the Repositories section to begin
              analyzing its code.
            </p>
          </div>
        ) : (
          <select
            id="analysis-repository"
            value={selectedRepository}
            onChange={(event) => setSelectedRepository(event.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring sm:max-w-lg"
          >
            {repositories.map((item) => (
              <option key={item.fullName} value={item.fullName}>
                {item.fullName}
              </option>
            ))}
          </select>
        )}
      </section>

      {repository && (
        <CodeAnalysis
          key={repository.fullName}
          owner={repository.owner}
          repo={repository.name}
        />
      )}
    </main>
  );
}
