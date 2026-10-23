import { ArrowRight, FolderGit2, ShieldCheck, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Overview({ onNavigate, repositories = [] }) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          SOFTWARE INTELLIGENCE
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Overview
        </h1>

        <p className="mt-3 max-w-2xl text-muted-foreground">
          Understand your codebase, explore repositories, and identify
          potential software risks from one workspace.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FolderGit2 className="size-5" />
          </div>

          <p className="mt-5 text-sm text-muted-foreground">
            Connected repositories
          </p>

          <p className="mt-1 text-3xl font-semibold">
            {repositories.length}
          </p>

          <Button
            className="mt-5 gap-2"
            variant="outline"
            onClick={() => onNavigate("/repositories")}
          >
            View repositories
            <ArrowRight className="size-4" />
          </Button>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>

          <p className="mt-5 font-medium">Code risk analysis</p>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Review your repository structure and inspect available source
            files and commit history.
          </p>

          <Button
            className="mt-5 gap-2"
            variant="outline"
            onClick={() => onNavigate("/")}
          >
            Connect a repository
            <ArrowRight className="size-4" />
          </Button>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Activity className="size-5" />
          </div>

          <p className="mt-5 font-medium">Analysis workspace</p>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Start by connecting a GitHub repository. More analysis features
            can be added here as they become available.
          </p>

          <Button
            className="mt-5 gap-2"
            variant="outline"
            onClick={() => onNavigate("/repositories")}
          >
            Open workspace
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-dashed bg-card/50 p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Get started</h2>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Connect a public or private GitHub repository to view its details,
          files, commits, languages, and contributors.
        </p>

        <Button className="mt-5 gap-2" onClick={() => onNavigate("/")}>
          Get started
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </section>
  );
}
