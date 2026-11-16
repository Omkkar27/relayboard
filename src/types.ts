/**
 * Type definitions for the reverse proxy configuration and routing
 */

export interface RouteMatch {
  host?: string;
  pathPrefix?: string;
}

export interface HealthCheckConfig {
  path: string;
  intervalMs?: number;
}

export interface RouteConfig {
  match: RouteMatch;
  upstream: string;
  stripPrefix?: boolean;
  addRequestHeaders?: Record<string, string>;
  removeRequestHeaders?: string[];
  addResponseHeaders?: Record<string, string>;
  removeResponseHeaders?: string[];
  healthCheck?: HealthCheckConfig;
}

export interface ProxyConfig {
  routes: RouteConfig[];
}

export interface UpstreamHealth {
  url: string;
  healthy: boolean;
  lastCheck?: number;
  error?: string;
}

export interface RouteInfo extends RouteConfig {
  index: number;
  upstreamHealth: UpstreamHealth;
}
