import { Activity } from "lucide-react";
import { useLanguage } from "../../lib/i18n.jsx";

const ratingClasses = {
  low: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  high: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const ratingKeys = {
  low: "ratingLow",
  medium: "ratingMedium",
  high: "ratingHigh",
};

const kindLabels = {
  import: "import",
  "export-from": "export … from",
  require: "require()",
  "dynamic-import": "import()",
  "import-equals": "import = require",
};

function rate(value, mediumAt, highAt) {
  if (value >= highAt) return "high";
  if (value >= mediumAt) return "medium";
  return "low";
}

function Stat({ label, value, hint, rating }) {
  const { t } = useLanguage();

  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="font-medium tabular-nums">{value ?? "–"}</span>
        {rating && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ratingClasses[rating]}`}
          >
            {t(ratingKeys[rating])}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function FileStructurePanel({ file }) {
  const { t } = useLanguage();

  if (!file || file.isBinary) return null;

  const { analysis, analysisError } = file;
  if (!analysis && !analysisError) return null;

  const structure = analysis?.structure;
  const references = analysis?.moduleReferences ?? [];

  return (
    <section className="min-w-0 rounded-xl border bg-background">
      <div className="flex items-center gap-2 border-b px-4 py-3 font-medium">
        <Activity className="size-4 shrink-0 text-primary" />
        {t("fileStructure")}
        <span className="min-w-0 truncate text-xs font-normal text-muted-foreground">
          {file.path}
        </span>
      </div>

      {analysisError ? (
        <p className="p-4 text-sm text-muted-foreground" role="status">
          {t("structureUnavailable")}: {analysisError}
        </p>
      ) : (
        <div className="space-y-4 p-4">
          {structure && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label={t("linesOfCode")} value={structure.linesOfCode} />
              <Stat
                label={t("maxNestingDepth")}
                value={structure.maxNestingDepth}
                rating={rate(structure.maxNestingDepth, 4, 6)}
                hint={
                  structure.deepestNestingLine
                    ? t("deepestAtLine").replace(
                        "{line}",
                        structure.deepestNestingLine,
                      )
                    : undefined
                }
              />
              <Stat
                label={t("cyclomaticComplexity")}
                value={structure.cyclomaticComplexity}
                rating={rate(structure.cyclomaticComplexity, 11, 21)}
              />
              <Stat
                label={t("controlStructures")}
                value={structure.controlStructureCount}
              />
              <Stat
                label={t("functionNesting")}
                value={structure.maxFunctionNesting}
                rating={rate(structure.maxFunctionNesting, 4, 6)}
              />
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {t("moduleReferences")} ({references.length})
            </p>
            {references.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noModuleReferences")}
              </p>
            ) : (
              <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
                {references.slice(0, 100).map((reference) => (
                  <li
                    key={`${reference.kind}:${reference.source}`}
                    className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-2 py-1.5"
                  >
                    <span className="min-w-0 break-all font-mono text-xs">
                      {reference.source}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {kindLabels[reference.kind] ?? reference.kind}
                      {reference.typeOnly ? ` · ${t("typeOnly")}` : ""}
                      {reference.line
                        ? ` · ${t("line")} ${reference.line}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
