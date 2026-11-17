"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { RouteInfo } from "../src/types";

type Summary = {
  routeCount: number;
  upstreamCount: number;
  healthyCount: number;
  checkedAt: string;
  status: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [routeResponse, summaryResponse] = await Promise.all([
        fetch("/api/routes", { cache: "no-store" }),
        fetch("/api/summary", { cache: "no-store" }),
      ]);
      console.log("");

      if (!routeResponse.ok || !summaryResponse.ok)
        throw new Error("The control plane could not be reached.");
      const routeData = await routeResponse.json();
      const summaryData = await summaryResponse.json();
      setRoutes(routeData.data);
      setSummary(summaryData.data);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) router.replace("/login?next=/");
        else void refresh();
      })
      .catch(() => router.replace("/login?next=/"));
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  async function deleteRoute(index: number) {
    if (!window.confirm("Remove this route?")) return;
    const response = await fetch(`/api/routes/${index}`, { method: "DELETE" });
    if (!response.ok) {
      setError("The route could not be removed.");
      return;
    }
    void refresh();
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="#">
          <span className="brand-mark">R</span>relayboard
        </a>
        <p className="eyebrow nav-label">Workspace</p>
        <nav>
          <a className="nav-item active" href="#overview">
            <span>⌂</span>Overview
          </a>
          <a className="nav-item" href="#routes">
            <span>↗</span>Routes <b>{summary?.routeCount ?? "—"}</b>
          </a>
          <a className="nav-item" href="#health">
            <span>⌁</span>Upstream health
          </a>
        </nav>
        <div className="sidebar-bottom">
          <div className="connection">
            <span className="pulse" />{" "}
            <span>
              <strong>Local instance</strong>
              <small>Next.js control plane</small>
            </span>
          </div>
          <div className="profile">
            <span className="avatar">OP</span>
            <span>
              <strong>Operator</strong>
              <small>Authenticated</small>
            </span>
            <button className="logout-button" onClick={() => void logout()}>
              ↪
            </button>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="breadcrumb">
              Workspace / <span>Overview</span>
            </p>
            <h1>
              Good morning, operator <span className="spark">✦</span>
            </h1>
          </div>
          <button className="primary-button" onClick={() => setModalOpen(true)}>
            ＋ Add route
          </button>
        </header>
        {error && (
          <div className="error-banner" role="alert">
            <span>!</span>
            {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
        <section className="hero-grid" id="overview">
          <div className="welcome-card">
            <div>
              <p className="eyebrow">Relayboard control plane</p>
              <h2>
                Traffic, made <em>visible.</em>
              </h2>
              <p className="muted">
                Configure routes and keep every upstream in view.
              </p>
            </div>
            <div className="orbit">
              <span>↗</span>
            </div>
          </div>
          <div className="status-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">System status</p>
                <h3>
                  {loading
                    ? "Checking..."
                    : summary?.status === "operational"
                      ? "Operational"
                      : "Needs attention"}
                </h3>
              </div>
              <i
                className={loading ? "status-dot loading-dot" : "status-dot"}
              />
            </div>
            <div className="status-line">
              <span>Proxy server</span>
              <strong>Listening</strong>
            </div>
            <div className="status-line">
              <span>Last sync</span>
              <strong>
                {summary
                  ? new Date(summary.checkedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </strong>
            </div>
            <div className="status-footer">
              <span>
                <i className="tiny-pulse" /> Live monitoring
              </span>
              <code>v0.1.0</code>
            </div>
          </div>
        </section>
        <section className="metrics">
          <Metric
            icon="↗"
            label="Active routes"
            value={loading ? "—" : (summary?.routeCount ?? 0)}
            note="Configured now"
          />
          <Metric
            icon="⌁"
            label="Healthy upstreams"
            value={
              loading
                ? "—"
                : `${summary?.healthyCount}/${summary?.upstreamCount}`
            }
            note="Across your routes"
          />
          <Metric
            icon="◷"
            label="Response policy"
            value="Ready"
            note="Headers enabled"
          />
          <Metric
            dark
            icon="✦"
            label="Control plane"
            value="Online"
            note="All services listening"
          />
        </section>
        <section className="content-grid">
          <div className="panel" id="routes">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Traffic map</p>
                <h3>Configured routes</h3>
              </div>
              <button
                className="text-button"
                onClick={() => void refresh()}
                disabled={loading}
              >
                {loading ? "Loading..." : "Refresh ↻"}
              </button>
            </div>
            {loading ? (
              <Empty text="Loading routes..." />
            ) : routes.length === 0 ? (
              <Empty text="No routes configured yet." />
            ) : (
              routes.map((route) => (
                <div
                  className="route-row"
                  key={`${route.index}-${route.upstream}`}
                >
                  <span className="route-number">
                    {String(route.index + 1).padStart(2, "0")}
                  </span>
                  <div className="route-main">
                    <strong>
                      {route.match.pathPrefix || route.match.host}
                    </strong>
                    <small>→ {route.upstream}</small>
                  </div>
                  <span className="route-tag">
                    {route.stripPrefix ? "STRIP PREFIX" : "PASS THROUGH"}
                  </span>
                  <button
                    className="delete-button"
                    onClick={() => void deleteRoute(route.index)}
                    aria-label={`Remove ${route.match.pathPrefix || route.match.host}`}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="panel" id="health">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Observability</p>
                <h3>Upstream health</h3>
              </div>
              <span className="badge">Auto-checks</span>
            </div>
            {loading ? (
              <Empty text="Checking upstreams..." />
            ) : routes.length === 0 ? (
              <Empty text="No upstreams to monitor." />
            ) : (
              routes.map((route) => (
                <div className="health-row" key={`health-${route.index}`}>
                  <i
                    className={
                      route.upstreamHealth.healthy
                        ? "health-indicator"
                        : "health-indicator down"
                    }
                  />
                  <div className="health-main">
                    <strong>{route.upstream}</strong>
                    <small>
                      {route.upstreamHealth.lastCheck
                        ? "Recently checked"
                        : "No scheduled check"}
                    </small>
                  </div>
                  <span
                    className={
                      route.upstreamHealth.healthy
                        ? "health-status"
                        : "health-status down"
                    }
                  >
                    {route.upstreamHealth.healthy ? "Healthy" : "Offline"}
                  </span>
                </div>
              ))
            )}
            <div className="health-note">
              ✦ Health checks run automatically when a route defines a check
              path.
            </div>
          </div>
        </section>
        <footer>
          Relayboard <span>· Local proxy control plane</span>
          <code>Built for clear traffic decisions</code>
        </footer>
      </main>
      {modalOpen && (
        <RouteModal
          close={() => setModalOpen(false)}
          saved={() => {
            setModalOpen(false);
            void refresh();
          }}
        />
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  note,
  dark = false,
}: {
  icon: string;
  label: string;
  value: string | number;
  note: string;
  dark?: boolean;
}) {
  return (
    <article className={dark ? "metric-card dark-card" : "metric-card"}>
      <span className="metric-icon">{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function RouteModal({
  close,
  saved,
}: {
  close: () => void;
  saved: () => void;
}) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const pathPrefix = String(form.get("pathPrefix")).trim();
    const upstream = String(form.get("upstream")).trim();
    try {
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match: { pathPrefix },
          upstream,
          stripPrefix: form.get("stripPrefix") === "on",
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      saved();
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "Could not create route.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Route configuration</p>
            <h2 id="modal-title">Add a new route</h2>
          </div>
          <button className="close-button" onClick={close} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={submit}>
          <label>
            Path prefix
            <input
              name="pathPrefix"
              placeholder="/api"
              required
              pattern="/.*"
            />
          </label>
          <label>
            Upstream URL
            <input
              name="upstream"
              type="url"
              placeholder="http://localhost:4000"
              required
            />
          </label>
          <label className="checkbox-row">
            <input name="stripPrefix" type="checkbox" /> Strip matched prefix
            before forwarding
          </label>
          {message && <p className="form-error">{message}</p>}
          <button className="primary-button full-width" disabled={saving}>
            {saving ? "Creating..." : "Create route →"}
          </button>
        </form>
      </section>
    </div>
  );
}
