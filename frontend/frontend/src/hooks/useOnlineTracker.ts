import { useEffect, useSyncExternalStore } from "react";

const buildPresenceWebSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
  const url = new URL(apiUrl, window.location.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws/presence";
  url.search = "";
  return url.toString();
};

type Listener = (count: number) => void;
const listeners = new Set<Listener>();
let currentOnlineCount = 1;
let socketInstance: WebSocket | null = null;
let reconnectTimer: number | null = null;
let heartbeatTimer: number | null = null;
let connectionCount = 0;

function notifyListeners(count: number) {
  currentOnlineCount = count;
  listeners.forEach((listener) => {
    try {
      listener(count);
    } catch {
      // ignore
    }
  });
}

function connectWebSocket() {
  if (socketInstance && (socketInstance.readyState === WebSocket.OPEN || socketInstance.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    const wsUrl = buildPresenceWebSocketUrl();
    const ws = new WebSocket(wsUrl);
    socketInstance = ws;

    ws.onopen = () => {
      // Send initial ping
      try {
        ws.send("ping");
      } catch {
        // ignore
      }

      // Keep connection alive with periodic ping every 30 seconds
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send("ping");
          } catch {
            // ignore
          }
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (typeof data.count === "number") {
          notifyListeners(data.count);
        } else if (typeof data.onlineCount === "number") {
          notifyListeners(data.onlineCount);
        }
      } catch {
        // ignore non-json
      }
    };

    ws.onclose = () => {
      socketInstance = null;
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      // Reconnect after 5 seconds if tracker is still mounted
      if (connectionCount > 0 && !reconnectTimer) {
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          if (connectionCount > 0) {
            connectWebSocket();
          }
        }, 5000);
      }
    };

    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        // ignore
      }
    };
  } catch {
    // Fail silently if WebSockets are blocked
  }
}

function disconnectWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (socketInstance) {
    try {
      socketInstance.close();
    } catch {
      // ignore
    }
    socketInstance = null;
  }
}

/**
 * Hook to be called at the root app level to establish and maintain
 * the presence WebSocket connection for the current visitor session.
 */
export function useOnlineTracker() {
  useEffect(() => {
    connectionCount++;
    if (connectionCount === 1) {
      connectWebSocket();
    }

    return () => {
      connectionCount = Math.max(0, connectionCount - 1);
      if (connectionCount === 0) {
        disconnectWebSocket();
      }
    };
  }, []);
}

/**
 * Hook to consume the current real-time online count in components (e.g., Admin Dashboard).
 */
export function useOnlineCount(initialFallback = 1) {
  return useSyncExternalStore(
    (onStoreChange) => {
      const listener: Listener = () => onStoreChange();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => currentOnlineCount || initialFallback,
    () => initialFallback,
  );
}
