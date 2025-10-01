# File Update Notification Component

## Overview

The `FileUpdateNotification` component is a custom React component designed to display file update notifications in a collaborative editor environment. It provides a rich UI for showing file changes, including timestamps, editor information, diff previews, and collaborative features.

## Features

- **Visual file status indicators**: Shows whether a file was created, modified, or deleted
- **Collaborator information**: Displays who made the changes and who else is working on the file
- **Diff preview**: Shows line-by-line changes with syntax highlighting
- **Real-time updates**: Visual indicators for live collaborative editing
- **Branch information**: Shows which branch the changes were made on
- **Error handling**: Displays error messages when file operations fail
- **Responsive design**: Works well on different screen sizes
- **Accessibility**: Includes proper ARIA labels and keyboard navigation

## Usage

### Basic Usage

```tsx
import { FileUpdateNotification } from "@/components/thread/messages/file-update-notification";

<FileUpdateNotification
  fileName="example.md"
  editorName="John Doe"
  timestamp={new Date()}
  oldContent="Previous content"
  newContent="New content"
  changeType="modified"
  success={true}
/>
```

### With Collaborators

```tsx
<FileUpdateNotification
  fileName="collaborative-doc.md"
  editorName="Alice Johnson"
  timestamp={new Date()}
  oldContent="Old content"
  newContent="New content"
  changeType="modified"
  collaborators={[
    {
      id: "1",
      name: "Alice Johnson",
      isActive: true,
      lastSeen: new Date()
    },
    {
      id: "2",
      name: "Bob Smith",
      isActive: false,
      lastSeen: new Date(Date.now() - 30 * 60 * 1000)
    }
  ]}
  branch="feature/new-feature"
  isRealTime={true}
  success={true}
/>
```

### Error State

```tsx
<FileUpdateNotification
  fileName="config.json"
  editorName="Carol Davis"
  timestamp={new Date()}
  changeType="modified"
  error="Failed to save file: Permission denied"
  success={false}
/>
```

## Props

| Prop | Type | Description | Default |
|------|------|-------------|---------|
| `fileName` | `string` | Name of the file that was updated | - |
| `editorName` | `string` | Name of the user who made the changes | - |
| `timestamp` | `Date \| string` | When the changes were made | - |
| `oldContent` | `string` | Previous content of the file (for diff) | `""` |
| `newContent` | `string` | New content of the file (for diff) | `""` |
| `changeType` | `"created" \| "modified" \| "deleted"` | Type of change that occurred | - |
| `collaborators` | `Collaborator[]` | List of collaborators on the file | `[]` |
| `branch` | `string` | Git branch where changes were made | - |
| `isRealTime` | `boolean` | Whether this is a live collaborative update | `false` |
| `error` | `string` | Error message if the operation failed | - |
| `success` | `boolean` | Whether the operation succeeded | - |
| `className` | `string` | Additional CSS classes | - |

## Collaborator Interface

```tsx
interface Collaborator {
  id: string;
  name: string;
  avatar?: string;
  isActive?: boolean;
  lastSeen?: Date;
}
```

## Integration with Tool Calls

The component is integrated into the tool calls system and will automatically render when a tool call with the name `file_update_notification` or `collaborative_file_update` is detected. The tool call arguments should include:

- `file_name`: Name of the file
- `editor_name`: Name of the editor
- `timestamp`: When the change occurred
- `change_type` or `changeType`: Type of change
- Optional: `old_content`, `new_content`, `collaborators`, `branch`, `is_real_time`

## Demo

A demo page is available at `/test-file-notifications` which showcases various scenarios:

1. File modification with collaborators
2. New file creation
3. Failed file update
4. File deletion
5. Large file update with many changes

## Styling

The component uses Tailwind CSS for styling and follows the design patterns established in the existing codebase. It includes:

- Consistent color schemes for different states (success, error, neutral)
- Smooth animations and transitions
- Hover states and interactive elements
- Responsive breakpoints

## Accessibility

The component includes several accessibility features:

- Semantic HTML structure
- ARIA labels and roles where appropriate
- Keyboard navigation support
- High contrast colors for text
- Focus indicators for interactive elements