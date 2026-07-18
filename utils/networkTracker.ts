import { useEffect, useState } from 'react';

export type NetworkCategory = 'Auth' | 'PostgREST' | 'Realtime' | 'Functions' | 'Other';

export interface NetworkMetrics {
  egress: number; // bytes uploaded
  ingress: number; // bytes downloaded
}

export type NetworkUsage = Record<NetworkCategory, NetworkMetrics>;

// ---- Per-Request Tracking Types ----

export interface TrackedRequest {
  id: string;
  url: string; // path + search only (e.g. /rest/v1/products?id=1)
  fullUrl: string;
  method: string;
  category: NetworkCategory;
  egress: number;
  ingress: number;
  duration: number; // ms (until response headers received)
  status: number;
  success: boolean;
  timestamp: number;
}

export interface EndpointMetrics {
  endpoint: string;
  method: string;
  category: NetworkCategory;
  callCount: number;
  totalEgress: number;
  totalIngress: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  errorCount: number;
  successCount: number;
  lastCalled: number;
}

// ---- Existing Cumulative Metrics ----

const initialUsage: NetworkUsage = {
  Auth: { egress: 0, ingress: 0 },
  PostgREST: { egress: 0, ingress: 0 },
  Realtime: { egress: 0, ingress: 0 },
  Functions: { egress: 0, ingress: 0 },
  Other: { egress: 0, ingress: 0 },
};

let usage: NetworkUsage = { ...initialUsage };

type Listener = (usage: NetworkUsage) => void;
const listeners = new Set<Listener>();

function notify() {
  const currentUsage = {
    Auth: { ...usage.Auth },
    PostgREST: { ...usage.PostgREST },
    Realtime: { ...usage.Realtime },
    Functions: { ...usage.Functions },
    Other: { ...usage.Other },
  };
  listeners.forEach((l) => l(currentUsage));
}

export function updateMetrics(
  category: NetworkCategory,
  type: 'egress' | 'ingress',
  bytes: number
) {
  if (bytes > 0) {
    usage[category][type] += bytes;
    notify();
  }
}

export function useNetworkUsage() {
  const [currentUsage, setCurrentUsage] = useState<NetworkUsage>(usage);

  useEffect(() => {
    setCurrentUsage({
      Auth: { ...usage.Auth },
      PostgREST: { ...usage.PostgREST },
      Realtime: { ...usage.Realtime },
      Functions: { ...usage.Functions },
      Other: { ...usage.Other },
    });
    listeners.add(setCurrentUsage);
    return () => {
      listeners.delete(setCurrentUsage);
    };
  }, []);

  return currentUsage;
}

export function resetNetworkUsage() {
  usage = {
    Auth: { egress: 0, ingress: 0 },
    PostgREST: { egress: 0, ingress: 0 },
    Realtime: { egress: 0, ingress: 0 },
    Functions: { egress: 0, ingress: 0 },
    Other: { egress: 0, ingress: 0 },
  };
  notify();
}

// ---- Per-Request History ----

const MAX_HISTORY = 1000;
let requestHistory: TrackedRequest[] = [];
let nextRequestId = 1;

type HistoryListener = () => void;
const historyListeners = new Set<HistoryListener>();

function notifyHistory() {
  historyListeners.forEach((l) => l());
}

function getUrlPath(fullUrl: string): string {
  try {
    const u = new URL(fullUrl);
    return u.pathname + u.search;
  } catch {
    return fullUrl;
  }
}

function addToHistory(entry: Omit<TrackedRequest, 'id' | 'url'> & { url: string }) {
  const record: TrackedRequest = {
    ...entry,
    id: String(nextRequestId++),
    url: getUrlPath(entry.url),
  };
  requestHistory.push(record);
  if (requestHistory.length > MAX_HISTORY) {
    requestHistory.splice(0, requestHistory.length - MAX_HISTORY);
  }
  notifyHistory();
}

function computeEndpointMetrics(history: TrackedRequest[]): EndpointMetrics[] {
  const map = new Map<string, EndpointMetrics>();

  for (const req of history) {
    const key = `${req.method}:${req.url}`;
    let m = map.get(key);
    if (!m) {
      m = {
        endpoint: req.url,
        method: req.method,
        category: req.category,
        callCount: 0,
        totalEgress: 0,
        totalIngress: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errorCount: 0,
        successCount: 0,
        lastCalled: 0,
      };
      map.set(key, m);
    }

    m.callCount++;
    m.totalEgress += req.egress;
    m.totalIngress += req.ingress;
    m.totalDuration += req.duration;
    m.minDuration = Math.min(m.minDuration, req.duration);
    m.maxDuration = Math.max(m.maxDuration, req.duration);
    if (req.success) m.successCount++;
    else m.errorCount++;
    m.lastCalled = Math.max(m.lastCalled, req.timestamp);
  }

  const result: EndpointMetrics[] = [];
  for (const m of map.values()) {
    m.avgDuration = m.callCount > 0 ? m.totalDuration / m.callCount : 0;
    if (m.minDuration === Infinity) m.minDuration = 0;
    result.push(m);
  }

  return result;
}

export function getRecentRequests(n: number = 50): TrackedRequest[] {
  return requestHistory.slice(-n).reverse();
}

export function getEndpointMetrics(): EndpointMetrics[] {
  return computeEndpointMetrics(requestHistory);
}

export function resetRequestHistory() {
  requestHistory = [];
  notifyHistory();
}

export function useRecentRequests(n: number = 50): TrackedRequest[] {
  const [history, setHistory] = useState<TrackedRequest[]>(() =>
    requestHistory.slice(-n).reverse()
  );

  useEffect(() => {
    setHistory(requestHistory.slice(-n).reverse());
    const handler = () => setHistory(requestHistory.slice(-n).reverse());
    historyListeners.add(handler);
    return () => {
      historyListeners.delete(handler);
    };
  }, [n]);

  return history;
}

export function useEndpointMetrics(): EndpointMetrics[] {
  const [metrics, setMetrics] = useState<EndpointMetrics[]>(() =>
    computeEndpointMetrics(requestHistory)
  );

  useEffect(() => {
    setMetrics(computeEndpointMetrics(requestHistory));
    const handler = () => setMetrics(computeEndpointMetrics(requestHistory));
    historyListeners.add(handler);
    return () => {
      historyListeners.delete(handler);
    };
  }, []);

  return metrics;
}

// ----------------------------------------------------
// Trackers
// ----------------------------------------------------

function determineCategory(url: string): NetworkCategory {
  if (url.includes('/auth/v1/')) return 'Auth';
  if (url.includes('/rest/v1/') || url.includes('/graphql/v1/')) return 'PostgREST';
  if (url.includes('/functions/v1/')) return 'Functions';
  if (url.includes('/realtime/v1/')) return 'Realtime';
  return 'Other';
}

function calculateWebSocketPayloadSize(payload: unknown): number {
  if (typeof payload === 'string') return new Blob([payload]).size;
  if (payload instanceof ArrayBuffer) return payload.byteLength;
  if (payload instanceof Blob) return payload.size;
  if (ArrayBuffer.isView(payload)) return payload.byteLength;
  return 0;
}

function recordWebSocketMessage(
  url: string,
  category: NetworkCategory,
  direction: 'inbound' | 'outbound',
  bytes: number
) {
  const isOutbound = direction === 'outbound';
  const trackedUrl = new URL(url);
  trackedUrl.searchParams.delete('apikey');
  addToHistory({
    url: trackedUrl.toString(),
    fullUrl: trackedUrl.toString(),
    method: isOutbound ? 'WS OUT' : 'WS IN',
    category,
    egress: isOutbound ? bytes : 0,
    ingress: isOutbound ? 0 : bytes,
    duration: 0,
    status: 101,
    success: true,
    timestamp: Date.now(),
  });
}

export const trackedFetch: typeof fetch = async (input, init) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input instanceof Request
          ? input.url
          : '';

  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const category = determineCategory(url);

  // Calculate Egress
  let egressBytes = 0;
  if (init?.body) {
    if (typeof init.body === 'string') {
      egressBytes = new Blob([init.body]).size;
    } else if (init.body instanceof Blob) {
      egressBytes = init.body.size;
    } else if (init.body instanceof ArrayBuffer) {
      egressBytes = init.body.byteLength;
    } else {
      // Rough estimation for other types if not exact
      egressBytes = 512;
    }
  } else if (input instanceof Request && input.body) {
    // Can't easily read request body stream without consuming it, so fallback to header
    const length = input.headers.get('content-length');
    if (length) egressBytes = parseInt(length, 10);
  }

  // Include headers estimation (roughly 300 bytes)
  egressBytes += 300;

  updateMetrics(category, 'egress', egressBytes);

  // Perform actual fetch
  const start = performance.now();
  const response = await window.fetch(input, init);
  const duration = performance.now() - start;

  // Calculate Ingress
  const clone = response.clone();
  const contentLength = clone.headers.get('content-length');

  let headerSize = 0;
  clone.headers.forEach((value, key) => {
    headerSize += key.length + value.length + 4; // ": \r\n"
  });

  const status = response.status;
  const success = response.ok;
  const timestamp = Date.now();

  if (contentLength) {
    const bodySize = parseInt(contentLength, 10);
    const ingressBytes = bodySize + headerSize;
    updateMetrics(category, 'ingress', ingressBytes);
    addToHistory({
      url,
      fullUrl: url,
      method,
      category,
      egress: egressBytes,
      ingress: ingressBytes,
      duration,
      status,
      success,
      timestamp,
    });
  } else {
    addToHistory({
      url,
      fullUrl: url,
      method,
      category,
      egress: egressBytes,
      ingress: 0,
      duration,
      status,
      success,
      timestamp,
    });
    // Fallback to reading the blob if content-length is missing (e.g., chunked transfer)
    const entryTimestamp = timestamp;
    clone
      .blob()
      .then((blob) => {
        const ingressBytes = blob.size + headerSize;
        updateMetrics(category, 'ingress', ingressBytes);
        // Update the last matching history entry
        const last = requestHistory[requestHistory.length - 1];
        if (last && last.timestamp === entryTimestamp) {
          last.ingress = ingressBytes;
          notifyHistory();
        }
      })
      .catch(() => {
        // Ignore blob read errors in background
      });
  }

  return response;
};

let wsTrackerInitialized = false;

export function initWebSocketTracker() {
  if (wsTrackerInitialized || typeof window === 'undefined') return;
  wsTrackerInitialized = true;

  const OriginalWebSocket = window.WebSocket;

  class TrackedWebSocket extends OriginalWebSocket {
    private category: NetworkCategory = 'Other';

    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols);
      this.category = determineCategory(url.toString());

      this.addEventListener('message', (event) => {
        const ingressBytes = calculateWebSocketPayloadSize(event.data);
        updateMetrics(this.category, 'ingress', ingressBytes);
        recordWebSocketMessage(this.url, this.category, 'inbound', ingressBytes);
      });
    }

    send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
      const egressBytes = calculateWebSocketPayloadSize(data) + 8;
      // Add roughly WebSocket framing overhead (~6-10 bytes)
      updateMetrics(this.category, 'egress', egressBytes);
      recordWebSocketMessage(this.url, this.category, 'outbound', egressBytes);
      super.send(data);
    }
  }

  window.WebSocket = TrackedWebSocket as any;
}
