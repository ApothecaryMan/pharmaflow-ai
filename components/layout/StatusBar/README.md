# StatusBar System

A modular, extensible status bar component system for PharmaFlow.

## Architecture

```
StatusBar/
├── StatusBar.tsx          # Main container with Left/Center/Right slots
├── StatusBarItem.tsx      # Reusable base component for all items
├── StatusBarContext.tsx   # React Context for shared state
├── index.ts               # Exports
└── items/                 # Individual item components
    ├── ConnectionStatus   # Online/Offline indicator
    ├── NotificationBell   # Notifications with dropdown
    ├── AnnouncementBanner # Scrolling announcements
    ├── UserInfo           # Current user display
    ├── DateTime           # Date/time display
    └── VersionInfo        # App version
```

## How to Add a New Item

1. Create a new file in `items/` folder:

```tsx
// items/MyNewItem.tsx
import React from "react";
import { StatusBarItem } from "../StatusBarItem";

export const MyNewItem: React.FC<Props> = (props) => {
  return (
    <StatusBarItem
      icon="icon_name" // Material Symbols icon
      label="Label" // Text to display
      tooltip="Tooltip" // Hover text
      variant="default" // default|success|warning|error|info
      badge={5} // Optional badge counter
      onClick={() => {}} // Optional click handler
    />
  );
};
```

2. Export from `items/index.ts`:

```ts
export { MyNewItem } from "./MyNewItem";
```

3. Use in `StatusBar.tsx` in appropriate section (left/center/right)

## Using StatusBar Context

Access global state from any component:

```tsx
import { useStatusBar } from "./StatusBarContext";

const MyComponent = () => {
  const {
    state, // Read state
    addNotification, // Add notification
    setAnnouncement, // Set announcement text
    setOnlineStatus, // Override connection status
  } = useStatusBar();

  // Add notification example
  addNotification({
    message: "Task completed!",
    type: "success", // info|success|warning|error
  });

  // Set announcement
  setAnnouncement("System maintenance at 10 PM");
};
```

## StatusBarItem Props

| Prop        | Type          | Description                |
| ----------- | ------------- | -------------------------- |
| `icon`      | string        | Material Symbols icon name |
| `label`     | string        | Text label                 |
| `tooltip`   | string        | Hover tooltip              |
| `badge`     | number/string | Badge counter              |
| `variant`   | string        | Color variant              |
| `onClick`   | function      | Click handler              |
| `className` | string        | Additional CSS             |

## Translations

Add translations in `i18n/translations.ts`:

```ts
statusBar: {
  ready: 'Ready',          // EN
  ready: 'جاهز',           // AR
  // Add new keys here
}
```

## Styling

- Height: 24px (fixed)
- Hidden on mobile (`hidden md:flex`)
- Uses CSS variables: `--bg-secondary`, `--border-primary`, `--text-secondary`

## Future Ideas

- [ ] System status indicator (CPU/Memory)
- [ ] Active task indicator
- [ ] Quick actions menu
- [ ] Sync status
- [ ] Language switcher
- [ ] Theme toggle
