import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useLanguage } from "../../lib/i18n.jsx";

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [activeUserCount, setActiveUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("users");
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [dataError, setDataError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/api/admin/users");
      setUsers(data.users ?? []);
      setActiveUserCount(data.activeUserCount ?? 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const loadLogs = useCallback(async () => {
    setDataError("");

    try {
      if (view === "logs") {
        const data = await apiRequest("/api/admin/audit-logs");
        setLogs(data.logs ?? []);
      } else if (view === "alerts") {
        const data = await apiRequest("/api/admin/security-alerts");
        setAlerts(data.alerts ?? []);
      }
    } catch (err) {
      setDataError(err.message);
    }
  }, [view]);

  useEffect(() => {
    if (view !== "users") void loadLogs();
  }, [view, loadLogs]);

  async function submitStatusChange(event) {
    event.preventDefault();

    if (!selected || !reason.trim() || saving) return;

    setSaving(true);
    setActionError("");

    try {
      await apiRequest(`/api/admin/users/${selected.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: selected.nextStatus,
          reason: reason.trim(),
        }),
      });

      setSelected(null);
      setReason("");
      await loadUsers();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function openStatusDialog(user, nextStatus) {
    setActionError("");
    setReason("");

    const accountId = user.id ?? user._id;

    if (!accountId) {
      setActionError(
        "This account is missing its database ID. Refresh the page and try again."
      );
      return;
    }

    setSelected({
      id: accountId,
      name: user.name,
      email: user.email,
      nextStatus,
    });
  }

  const statusLabel = (status) => {
    if (status === "suspended") return "Suspended";
    if (status === "terminated") return "Terminated";
    return "Active";
  };

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {t("administration")}
        </p>
        <h1 className="text-2xl font-semibold">{t("adminDashboard")}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          {t("adminDashboardDescription")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Active regular users</p>
          <p className="mt-2 text-3xl font-semibold">{activeUserCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Suspended accounts</p>
          <p className="mt-2 text-3xl font-semibold">
            {users.filter((user) => user.status === "suspended").length}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Terminated accounts</p>
          <p className="mt-2 text-3xl font-semibold">
            {users.filter((user) => user.status === "terminated").length}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["users", "User Management"],
          ["logs", "Audit Logs"],
          ["alerts", "Security Alerts"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`rounded-md border px-4 py-2 text-sm ${
              view === key ? "bg-primary text-primary-foreground" : "bg-card"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "users" ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="font-semibold">{t("userManagement")}</h2>
            {!loading && !error && (
              <span className="text-sm text-muted-foreground">
                {activeUserCount} active users
              </span>
            )}
          </div>

          {loading ? (
            <p className="p-5 text-sm text-muted-foreground">
              {t("loadingAccounts")}
            </p>
          ) : error ? (
            <p className="p-5 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : users.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              {t("noAccountsFound")}
            </p>
          ) : (
            <ul className="divide-y">
              {users.map((user) => {
                const status = user.status ?? "active";
                const canManage = user.role !== "admin" && status !== "terminated";

                return (
                  <li
                    key={user.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{user.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {user.role} · {statusLabel(status)}
                        {user.statusReason ? ` · ${user.statusReason}` : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {canManage && status === "active" && (
                        <button
                          type="button"
                          onClick={() => openStatusDialog(user, "suspended")}
                          className="rounded-md border px-3 py-2 text-sm"
                        >
                          Suspend
                        </button>
                      )}

                      {canManage && status === "suspended" && (
                        <button
                          type="button"
                          onClick={() => openStatusDialog(user, "active")}
                          className="rounded-md border px-3 py-2 text-sm"
                        >
                          Restore
                        </button>
                      )}

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => openStatusDialog(user, "terminated")}
                          className="rounded-md bg-destructive px-3 py-2 text-sm text-destructive-foreground"
                        >
                          Terminate
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="font-semibold">
              {view === "logs" ? "Audit Logs" : "Security Alerts"}
            </h2>
            <button
              type="button"
              onClick={() => void loadLogs()}
              className="rounded-md border px-3 py-2 text-sm"
            >
              Refresh
            </button>
          </div>

          {dataError ? (
            <p className="p-5 text-sm text-destructive" role="alert">
              {dataError}
            </p>
          ) : (view === "logs" ? logs : alerts).length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              No records found.
            </p>
          ) : (
            <ul className="divide-y">
              {(view === "logs" ? logs : alerts).map((item) => (
                <li key={item.id} className="space-y-1 px-5 py-4">
                  <p className="font-medium">{item.action}</p>
                  <p className="text-sm text-muted-foreground">
                    Outcome: {item.outcome}
                    {item.targetEmail ? ` · Target: ${item.targetEmail}` : ""}
                  </p>
                  {item.reason && (
                    <p className="text-sm">{item.reason}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {item.actor?.email ? `By ${item.actor.email} · ` : ""}
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          role="presentation"
        >
          <form
            onSubmit={submitStatusChange}
            className="w-full max-w-lg space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-dialog-title"
          >
            <h2 id="status-dialog-title" className="text-lg font-semibold">
              {selected.nextStatus === "terminated"
                ? "Confirm account termination"
                : selected.nextStatus === "suspended"
                  ? "Confirm account suspension"
                  : "Restore account"}
            </h2>

            <p className="text-sm text-muted-foreground">
              Account: {selected.name} ({selected.email})
            </p>

            {selected.nextStatus === "terminated" && (
              <p className="text-sm text-destructive">
                This account will not be able to log in again. Termination
                cannot be undone through this dashboard.
              </p>
            )}

            <label className="block space-y-2">
              <span className="text-sm font-medium">Reason (required)</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                minLength={1}
                required
                rows={3}
                className="w-full rounded-md border bg-background p-3"
                placeholder="Explain why this action is necessary."
              />
            </label>

            {actionError && (
              <p role="alert" className="text-sm text-destructive">
                {actionError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setSelected(null)}
                className="rounded-md border px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !reason.trim()}
                className="rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground disabled:opacity-50"
              >
                {saving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}