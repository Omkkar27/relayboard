import type { RouteConfig, UpstreamHealth } from "../src/types";

const routes: RouteConfig[] = [{ match: { pathPrefix: "/api" }, upstream: "http://localhost:4000", stripPrefix: true, healthCheck: { path: "/health", intervalMs: 15000 } }];

function getHealth(route: RouteConfig): UpstreamHealth { return { url: route.upstream, healthy: true }; }
export function listRoutes() { return routes.map((route, index) => ({ ...route, index, upstreamHealth: getHealth(route) })); }
export function addRoute(route: RouteConfig) { routes.push(route); return { ...route, index: routes.length - 1, upstreamHealth: getHealth(route) }; }
export function removeRoute(index: number) { return index >= 0 && index < routes.length ? routes.splice(index, 1)[0] : null; }
export function getSummary() { const health = routes.map(getHealth); return { service: "Relayboard", status: "operational", routeCount: routes.length, upstreamCount: health.length, healthyCount: health.filter((item) => item.healthy).length, checkedAt: new Date().toISOString() }; }
