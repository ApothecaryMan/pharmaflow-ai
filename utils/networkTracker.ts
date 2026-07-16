import { useState, useEffect } from 'react';

export type NetworkCategory = 'Auth' | 'PostgREST' | 'Realtime' | 'Functions' | 'Other';

export interface NetworkMetrics {
  egress: number; // bytes uploaded
  ingress: number; // bytes downloaded
}

export type NetworkUsage = Record<NetworkCategory, NetworkMetrics>;

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

export function updateMetrics(category: NetworkCategory, type: 'egress' | 'ingress', bytes: number) {
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

export const trackedFetch: typeof fetch = async (input, init) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input instanceof Request
          ? input.url
          : '';
          
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
  const response = await window.fetch(input, init);

  // Calculate Ingress
  const clone = response.clone();
  const contentLength = clone.headers.get('content-length');
  
  let headerSize = 0;
  clone.headers.forEach((value, key) => {
    headerSize += key.length + value.length + 4; // ": \r\n"
  });

  if (contentLength) {
    const bodySize = parseInt(contentLength, 10);
    updateMetrics(category, 'ingress', bodySize + headerSize);
  } else {
    // Fallback to reading the blob if content-length is missing (e.g., chunked transfer)
    clone
      .blob()
      .then((blob) => {
        updateMetrics(category, 'ingress', blob.size + headerSize);
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
        let size = 0;
        if (typeof event.data === 'string') {
          size = new Blob([event.data]).size;
        } else if (event.data instanceof ArrayBuffer) {
          size = event.data.byteLength;
        } else if (event.data instanceof Blob) {
          size = event.data.size;
        }
        updateMetrics(this.category, 'ingress', size);
      });
    }

    send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
      let size = 0;
      if (typeof data === 'string') {
        size = new Blob([data]).size;
      } else if (data instanceof ArrayBuffer) {
        size = data.byteLength;
      } else if (data instanceof Blob) {
        size = data.size;
      } else if (ArrayBuffer.isView(data)) {
        size = data.byteLength;
      }
      // Add roughly WebSocket framing overhead (~6-10 bytes)
      updateMetrics(this.category, 'egress', size + 8);
      super.send(data);
    }
  }

  window.WebSocket = TrackedWebSocket as any;
}
