import { WebSocketServer, WebSocket } from 'ws';
import type { ThemeState } from './state.js';

export type BroadcastFn = (state: ThemeState) => void;

export function createBridge(port: number): BroadcastFn {
  const wss = new WebSocketServer({ port });
  let currentState: ThemeState = { properties: {}, enabled: true };

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'theme_update', state: currentState }));
  });

  return (state: ThemeState) => {
    currentState = state;
    const msg = JSON.stringify({ type: 'theme_update', state });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  };
}
