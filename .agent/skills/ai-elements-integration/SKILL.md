---
name: ai-elements-integration
description: Procedural knowledge for using Vercel's AI Elements components and AI SDK integration. Use when building chat interfaces, AI-powered forms, or using streaming components.
metadata:
  author: vercel
  version: "1.0.0"
---

# AI Elements Integration

This skill focuses on building interactive, streaming, and composable AI interfaces using Vercel's AI Elements and AI SDK.

## Key Principles

### 1. Composable Components
- **Modularity**: Use small, focused components for chat messages, inputs, and status indicators.
- **Theming**: Align with `shadcn/ui` and CSS variables for consistent look and feel.

### 2. AI SDK Conventions
- **Hooks**: Prefer `useChat` and `useCompletion` for managing AI state.
- **Streaming**: Ensure components handle partial/streaming data gracefully (e.g., using `markdown-to-jsx` or similar).

### 3. Usage Patterns
- **Optimistic Updates**: Show user messages immediately.
- **Loading States**: Provide visual feedback during AI generation using skeleton loaders or smooth transitions.
- **Tool UI**: Render interactive widgets (like charts or forms) directly in the chat flow when the AI returns a tool call.

## Best Practices
- **Hydration**: Ensure client-side AI components don't cause hydration mismatches.
- **Performance**: Use virtualization for long chat histories.
- **Error Handling**: Gracefully handle network failures or rate limits with helpful user messages.
