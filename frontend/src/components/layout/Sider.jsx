import { Activity, Bot, Boxes, ChevronLeft, ChevronRight, CircleHelp, Code2, FileSearch, FolderGit2, LayoutDashboard, Settings, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const userItems = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Repositories", icon: FolderGit2 },
  { label: "Code Analysis", icon: Code2 },
  { label: "Risk Reports", icon: Activity },
  { label: "Code Search", icon: FileSearch },
  { label: "AI Assistant", icon: Bot },
];

const adminItems = [
  { label: "Admin Overview", icon: LayoutDashboard, active: true },
  { label: "User Management", icon: Users },
  { label: "Repositories", icon: FolderGit2 },
  { label: "Analysis Jobs", icon: Activity },
  { label: "System Monitoring", icon: Boxes },
  { label: "Platform Settings", icon: Settings },
];

export default function AppSidebar({
  role = "user",
  currentPath = "/",
  repositories = [],
  onNavigate = () => {},
}) {
  const [collapsed, setCollapsed] = useState(false);
  const items = role === "admin" ? adminItems : userItems;

  return (
    <aside
      className={`sticky top-16 z-30 flex h-[calc(100dvh-4rem)] shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 ${
        collapsed ? "w-17" : "w-60"
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-4">
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Workspace
            </p>
            <p className="mt-1 truncate text-sm font-medium">
              {role === "admin"
                ? "Administration"
                : "Codebase Intelligence"}
            </p>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Button>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="mb-3 px-2 text-xs font-medium text-muted-foreground">
          {!collapsed && "MENU"}
        </p>

        {items.map(({ label, icon: Icon }) => {
          const active = label === "Repositories"
            ? currentPath.startsWith("/repositories")
            : label === "Overview" || label === "Admin Overview"
              ? currentPath === "/"
              : false;
          const target = label === "Repositories" ? "/repositories" : "/";

          return (
            <div key={label}>
              <Button
                variant={active ? "secondary" : "ghost"}
                className={`w-full ${
                  collapsed
                    ? "justify-center px-0"
                    : "justify-start gap-3 px-3"
                }`}
                title={collapsed ? label : undefined}
                onClick={() => onNavigate(target)}
              >
                <Icon className="size-4.5 shrink-0" />
                {!collapsed && (
                  <span className="truncate text-sm">{label}</span>
                )}
              </Button>
              {label === "Repositories" && !collapsed && repositories.length > 0 && (
                <div className="ml-5 mt-1 space-y-1 border-l pl-3">
                  {repositories.map((repository) => {
                    const repositoryPath = `/repositories/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`
                    const selected = currentPath === repositoryPath;
                    return (
                      <Button
                        key={repository.fullName}
                        variant={selected ? "secondary" : "ghost"}
                        className="w-full justify-start px-2"
                        title={repository.fullName}
                        onClick={() => onNavigate(repositoryPath)}
                      >
                        <span className="truncate text-xs">{repository.name}</span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="space-y-1 border-t p-3">
        <Button
          variant="ghost"
          className={`w-full gap-3 ${
            collapsed
              ? "justify-center px-0"
              : "justify-start px-3"
          }`}
          title={collapsed ? "Help & Support" : undefined}
        >
          <CircleHelp className="size-4.5 shrink-0" />
          {!collapsed && <span>Help & Support</span>}
        </Button>

        {role === "admin" && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-2">
            <ShieldCheck className="size-4 shrink-0 text-primary" />
            {!collapsed && (
              <span className="text-xs text-muted-foreground">
                Administrator mode
              </span>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
