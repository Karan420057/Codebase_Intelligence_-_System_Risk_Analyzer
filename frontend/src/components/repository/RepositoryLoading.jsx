import { FolderGit2, Check, LoaderCircle } from "lucide-react";

const steps = [
  "Request initiated",
  "Loading repository data...",
  "Preparing your workspace",
];

export default function RepositoryLoading({
  completedSteps = 1,
  variant = "repository",
}) {
  const progress = Math.min(
    100,
    Math.max(0, (completedSteps / steps.length) * 100)
  );

  const isConnecting = variant === "connecting";

  return (
    <div
      className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full items-center justify-center px-4 py-8"
      role="status"
      aria-live="polite"
      aria-label="Analyzing your repository"
    >
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-2xl border bg-muted/70">
            <FolderGit2 className="size-8 animate-pulse text-primary" />
          </div>
        </div>

        <h2 className="text-center text-2xl font-semibold tracking-tight">
          {isConnecting
            ? "Connecting to your repository"
            : "Analyzing your repository"}
        </h2>

        <p className="mx-auto mb-8 mt-3 max-w-md text-center leading-6 text-muted-foreground">
          Fetching repository details, files, and commits. This may take a moment.
        </p>

        <ol className="space-y-5">
          {steps.map((step, index) => {
            const complete = index < completedSteps;
            const active = index === completedSteps && completedSteps < steps.length;

            return (
              <li key={step} className="flex min-h-6 items-center gap-3">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
                    complete
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                      : active
                        ? "border-muted-foreground/30 border-t-primary"
                        : "border-muted-foreground/40 text-muted-foreground"
                  }`}
                  aria-label={
                    complete ? "Completed" : active ? "In progress" : "Pending"
                  }
                >
                  {complete ? (
                    <Check className="size-4" strokeWidth={3} />
                  ) : active ? (
                    <LoaderCircle className="size-5 animate-spin" />
                  ) : null}
                </span>

                <span
                  className={
                    complete
                      ? "font-medium text-emerald-500"
                      : active
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                  }
                >
                  {step}
                </span>

                {active && (
                  <span className="ml-auto animate-pulse tracking-widest text-muted-foreground">
                    •••
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        <div
          className="mt-8 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Repository loading progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Please keep this page open.
        </p>
      </div>
    </div>
  );
}
