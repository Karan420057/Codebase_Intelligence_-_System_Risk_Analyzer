import { Flame, Package } from "lucide-react";
import { useLanguage } from "../../lib/i18n.jsx";

export function NodeMetrics({ node }) {
  const { t } = useLanguage();
  if (!node) return null;

  const items = [
    [t("linesOfCode"), node.linesOfCode],
    [t("maxNestingDepth"), node.maxNestingDepth],
    [t("cyclomaticComplexity"), node.cyclomaticComplexity],
    [t("instability"), node.instability],
    [t("hotspot"), node.isHotspot ? t("yes") : t("no")],
    [t("inCycle"), node.inCycle ? t("yes") : t("no")],
  ];

  return (
    <>
      {items.map(([label, value]) => (
        <p key={label}>
          {label}: <strong>{value ?? "–"}</strong>
        </p>
      ))}
    </>
  );
}

export default function GraphInsights({ graphModel, onSelectFile }) {
  const { t } = useLanguage();
  if (!graphModel) return null;

  const nodes = graphModel.nodes ?? [];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const hotspots = (graphModel.hotspots ?? [])
    .map((id) => nodeById.get(id))
    .filter(Boolean);
  const packages = graphModel.externalDependencies ?? [];
  const stats = graphModel.stats ?? {};

  function openFile(id) {
    onSelectFile(id);
    document.getElementById("explore-analyzed-files")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded border-2 border-amber-500" />
          {t("legendHotspot")}
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded border-2 border-red-500" />
          {t("legendCycle")}
        </span>
        {stats.hotspotThreshold !== undefined && (
          <span>
            {t("hotspotThreshold").replace("{n}", stats.hotspotThreshold)}
          </span>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="min-w-0 rounded-xl border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
              <Flame className="size-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold">{t("dependencyHotspots")}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {t("hotspotHelp")}
              </p>
            </div>
          </div>

          {hotspots.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noHotspots")}</p>
          ) : (
            <ul className="space-y-2">
              {hotspots.map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    onClick={() => openFile(node.id)}
                    className="w-full rounded-lg border bg-background p-3 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <p className="break-all font-mono text-xs">{node.id}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {node.fanIn} {t("incoming")} · {node.fanOut}{" "}
                      {t("outgoing")}
                      {node.inCycle ? ` · ${t("inCycle")}` : ""}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0 rounded-xl border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
              <Package className="size-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold">{t("externalPackages")}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {t("externalPackagesHelp")}
              </p>
            </div>
          </div>

          {packages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("noExternalPackages")}
            </p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
              {packages.map((item) => (
                <li
                  key={item.name}
                  className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2"
                  title={item.usedBy.join("\n")}
                >
                  <span className="min-w-0 break-all font-mono text-xs">
                    {item.name}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {t("usedByFiles").replace("{count}", item.usedByCount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
