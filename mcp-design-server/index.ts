import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createBridge } from './bridge.js';
import { registerAllTools } from './tools.js';

const WS_PORT = parseInt(process.env.MCP_WS_PORT || '3456', 10);

const server = new McpServer({
  name: 'pharmaflow-theme-studio',
  version: '1.0.0',
});

const broadcast = createBridge(WS_PORT);
registerAllTools(server, broadcast);

const transport = new StdioServerTransport();
await server.connect(transport);
