import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { BroadcastFn } from './bridge.js';
import { PRESETS } from './presets.js';
import { cssToProps, loadState, propsToCss, saveState, type ThemeState } from './state.js';

export function registerAllTools(server: McpServer, broadcast: BroadcastFn) {
  let state: ThemeState = { properties: {}, enabled: true };

  const sync = async (next: ThemeState) => {
    state = next;
    await saveState(state);
    broadcast(state);
  };

  const _getCssString = () => propsToCss(state.properties);

  server.registerTool(
    'get_css_state',
    {
      description:
        'Get the current CSS theme state, including all properties and whether custom CSS is enabled',
      inputSchema: z.object({}),
    },
    async () => {
      const loaded = await loadState();
      state = loaded;
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(loaded, null, 2) }],
      };
    }
  );

  server.registerTool(
    'set_css_property',
    {
      description:
        'Set a single CSS property (e.g. "border-radius" = "12px"). Use empty string to remove.',
      inputSchema: z.object({
        name: z.string().describe('CSS property name (kebab-case, e.g. "border-radius")'),
        value: z
          .string()
          .describe(
            'CSS property value (e.g. "12px", "#ffffff", "flex"). Empty string removes the property.'
          ),
      }),
    },
    async (args) => {
      const loaded = await loadState();
      const props = { ...loaded.properties };
      if (!args.value) {
        delete props[args.name];
      } else {
        props[args.name] = args.value;
      }
      await sync({ ...loaded, properties: props });
      return {
        content: [
          { type: 'text' as const, text: `Set ${args.name}: ${args.value || '<removed>'}` },
        ],
      };
    }
  );

  server.registerTool(
    'set_multiple_properties',
    {
      description:
        'Set multiple CSS properties at once. Provide an object of property-value pairs.',
      inputSchema: z.object({
        properties: z
          .record(z.string())
          .describe('CSS properties as key-value pairs. Set a value to empty string to remove it.'),
      }),
    },
    async (args) => {
      const loaded = await loadState();
      const props = { ...loaded.properties };
      for (const [name, value] of Object.entries(args.properties)) {
        if (!value) {
          delete props[name];
        } else {
          props[name] = value as string;
        }
      }
      await sync({ ...loaded, properties: props });
      return {
        content: [
          {
            type: 'text' as const,
            text: `Updated ${Object.keys(args.properties).length} properties`,
          },
        ],
      };
    }
  );

  server.registerTool(
    'reset_all_properties',
    {
      description: 'Remove all custom CSS properties and reset the theme state.',
      inputSchema: z.object({}),
    },
    async () => {
      await sync({ properties: {}, enabled: true });
      return {
        content: [{ type: 'text' as const, text: 'All properties reset' }],
      };
    }
  );

  server.registerTool(
    'set_raw_css',
    {
      description:
        'Set the full CSS string directly (e.g. "border-radius: 12px;\\nbackground: #f0f0f0;"). This replaces all existing properties.',
      inputSchema: z.object({
        css: z.string().describe('Semicolon-separated CSS declarations'),
      }),
    },
    async (args) => {
      const props = cssToProps(args.css);
      const loaded = await loadState();
      await sync({ ...loaded, properties: props });
      return {
        content: [
          {
            type: 'text' as const,
            text: `Applied ${Object.keys(props).length} properties from raw CSS`,
          },
        ],
      };
    }
  );

  server.registerTool(
    'toggle_custom_css',
    {
      description: 'Enable or disable the custom CSS theme.',
      inputSchema: z.object({
        enabled: z.boolean().describe('Whether custom CSS should be applied'),
      }),
    },
    async (args) => {
      const loaded = await loadState();
      await sync({ ...loaded, enabled: args.enabled });
      return {
        content: [
          { type: 'text' as const, text: `Custom CSS ${args.enabled ? 'enabled' : 'disabled'}` },
        ],
      };
    }
  );

  server.registerTool(
    'list_presets',
    {
      description: 'List available style presets with their labels and descriptions.',
      inputSchema: z.object({}),
    },
    async () => {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              PRESETS.map((p) => ({
                name: p.name,
                label: p.label,
                description: p.description,
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    'apply_preset',
    {
      description:
        'Apply a named style preset (e.g. "paper-notebook", "paper-torn", "paper-clean"). This replaces all current properties.',
      inputSchema: z.object({
        name: z.string().describe('Preset name. Use list_presets to see available options.'),
      }),
    },
    async (args) => {
      const preset = PRESETS.find((p) => p.name === args.name);
      if (!preset) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Preset "${args.name}" not found. Use list_presets to see available options.`,
            },
          ],
          isError: true,
        };
      }
      const loaded = await loadState();
      await sync({ ...loaded, properties: { ...preset.properties } });
      return {
        content: [
          {
            type: 'text' as const,
            text: `Applied preset "${preset.label}": ${Object.keys(preset.properties).length} properties set`,
          },
        ],
      };
    }
  );
}
