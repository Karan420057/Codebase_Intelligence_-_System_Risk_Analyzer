import { Bot, Activity, Boxes, ChevronLeft, ChevronRight, CircleHelp, Code2, FileSearch, FolderGit2, LayoutDashboard, Settings, ShieldCheck, Users, } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "../../lib/i18n.jsx";

const userItems = [
  { key: "Dashboard", icon: LayoutDashboard, target: "/" },
  { key: "repositories", icon: FolderGit2, target: "/repositories" },
  { key: "codeAnalysis", icon: Code2, target: "/analysis" },
  { key: "riskReports", icon: Activity, target: "/" },
  { key: "codeSearch", icon: FileSearch, target: "/" },
  { key: "aiAssistant", icon: Bot, target: "/" },
];

const adminItems = [
  { key: "adminOverview", icon: LayoutDashboard, target: "/" },
  { key: "userManagement", icon: Users, target: "/" },
  { key: "repositories", icon: FolderGit2, target: "/repositories" },
  { key: "analysisJobs", icon: Activity, target: "/" },
  { key: "systemMonitoring", icon: Boxes, target: "/" },
  { key: "platformSettings", icon: Settings, target: "/settings" },
];

export default function AppSidebar({
  role = "user",
  currentPath = "/",
  repositories = [],
  onNavigate = () => {},
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [repositoriesExpanded, setRepositoriesExpanded] = useState(false);
  const { t } = useLanguage();
  const items = role === "admin" ? adminItems : userItems;

  useEffect(() => {
    if (repositories.length === 0) {
      setRepositoriesExpanded(false);
    }
  }, [repositories.length]);

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
              {t("workspace")}
            </p>
            <p className="mt-1 truncate text-sm font-medium">
              {role === "admin"
                ? t("administration")
                : t("codebaseIntelligence")}
            </p>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={
            collapsed ? t("expandSidebar") : t("collapseSidebar")
          }
          onClick={() => setCollapsed((value) => !value)}
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
          {!collapsed && t("menu")}
        </p>
        
        {items.map(({ key, icon: Icon, target }) => {
          const label = t(key);

          const active =
            key === "repositories"
              ? currentPath.startsWith("/repositories")
              : key === "codeAnalysis"
                ? currentPath === "/analysis"
              : key === "platformSettings"
                ? currentPath === "/settings"
                : target === "/" && currentPath === "/";

          return (
            <div key={key}>
              <div className="flex w-full items-center gap-1">
                <Button
                  variant={active ? "secondary" : "ghost"}
                  className={`min-w-0 flex-1 ${
                    collapsed
                      ? "justify-center px-0"
                      : "justify-start gap-3 px-3"
                  }`}
                  title={collapsed ? label : undefined}
                  onClick={() => {
                    if (key === "repositories" && repositories.length > 0) {
                      setRepositoriesExpanded((value) => !value);
                      onNavigate("/repositories");
                    } else {
                      onNavigate(target);
                    }
                  }}
                >
                  <Icon className="size-4.5 shrink-0" />
                  {!collapsed && (
                    <span className="truncate text-sm">{label}</span>
                  )}
                </Button>

                {key === "repositories" &&
                  repositories.length > 0 &&
                  !collapsed && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      aria-label={
                        repositoriesExpanded
                          ? "Hide repositories"
                          : "Show repositories"
                      }
                      aria-expanded={repositoriesExpanded}
                      onClick={() =>
                        setRepositoriesExpanded((value) => !value)
                      }
                    >
                      {repositoriesExpanded ? (
                        <ChevronLeft className="size-4 -rotate-90" />
                      ) : (
                        <ChevronRight className="size-4 rotate-90" />
                      )}
                    </Button>
                  )}
              </div>

              {key === "repositories" &&
                !collapsed &&
                repositoriesExpanded &&
                repositories.length > 0 && (
                  <div className="ml-5 mt-1 space-y-1 border-l pl-3">
                    {repositories.map((repository) => {
                      const repositoryPath =
                        `/repositories/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`;

                      const selected = currentPath === repositoryPath;

                      return (
                        <Button
                          key={repository.fullName}
                          variant={selected ? "secondary" : "ghost"}
                          className="w-full justify-start px-2"
                          title={repository.fullName}
                          onClick={() => onNavigate(repositoryPath)}
                        >
                          <span className="truncate text-xs">
                            {repository.name}
                          </span>
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
          title={collapsed ? t("helpSupport") : undefined}
        >
          <CircleHelp className="size-4.5 shrink-0" />
          {!collapsed && <span>{t("helpSupport")}</span>}
        </Button>

        {role === "admin" && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-2">
            <ShieldCheck className="size-4 shrink-0 text-primary" />
            {!collapsed && (
              <span className="text-xs text-muted-foreground">
                {t("administratorMode")}
              </span>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
