import { type FC, useEffect, useRef } from 'react';
import { useUI } from '../../context/UIContext';

const WS_URL = `ws://localhost:${import.meta.env.VITE_MCP_WS_PORT || '3456'}`;
const RECONNECT_DELAY = 3000;

interface ThemeUpdateMessage {
  type: 'theme_update';
  state: {
    properties: Record<string, string>;
    enabled: boolean;
  };
}

function propsToCss(props: Record<string, string>): string {
  return Object.entries(props)
    .map(([name, value]) => (value ? `${name}: ${value}` : ''))
    .filter(Boolean)
    .join(';\n');
}

export const DesignMcpBridge: FC = () => {
  const { setCustomCardCss, setEnableCustomCardCss } = useUI();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg: ThemeUpdateMessage = JSON.parse(event.data);
          if (msg.type === 'theme_update') {
            const css = propsToCss(msg.state.properties);
            setCustomCardCss(css);
            setEnableCustomCardCss(msg.state.enabled);
          }
        } catch {
          /* ignore malformed messages */
        }
      };

      ws.onclose = () => {
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
    }
  };

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return null;
};
