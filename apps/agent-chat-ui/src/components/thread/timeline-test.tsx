"use client";

import { FileUpdateNotification } from "./messages/file-update-notification";
import { WriteFileDiff } from "./messages/write-file-diff";
import {
  createTimelineActivity,
  TimelineContainer,
} from "./timeline-container";
import { TodoList } from "./todo-list";

// Test component to demonstrate the timeline with different activity types
export function TimelineTest() {
  const testActivities = [
    // Todo list activity
    createTimelineActivity(
      "test-todo",
      "todo",
      <TodoList
        todos={[
          {
            content: "Research user authentication patterns",
            status: "completed",
          },
          { content: "Implement JWT token handling", status: "completed" },
          { content: "Add password reset functionality", status: "pending" },
          { content: "Create user profile page", status: "pending" },
        ]}
      />,
      {
        title: "Task Progress",
        status: "completed",
      }
    ),

    // File write activity
    createTimelineActivity(
      "test-file-write",
      "file-write",
      <WriteFileDiff
        args={{
          file_path: "src/components/auth/LoginForm.tsx",
          content: `import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic here
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" className="w-full">
        Login
      </Button>
    </form>
  );
}`,
        }}
        success={true}
        toolName="Write"
      />,
      {
        title: "Created: src/components/auth/LoginForm.tsx",
        status: "completed",
      }
    ),

    // File update activity
    createTimelineActivity(
      "test-file-update",
      "file-update",
      <FileUpdateNotification
        branch="main"
        changeType="modified"
        collaborators={[
          { id: "1", name: "John Doe", isActive: true },
          { id: "2", name: "Jane Smith", isActive: false },
        ]}
        editorName="John Doe"
        fileName="package.json"
        newContent={`{
  "name": "my-app",
  "version": "1.1.0",
  "dependencies": {
    "react": "^18.0.0",
    "framer-motion": "^10.0.0"
  }
}`}
        oldContent={`{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0"
  }
}`}
        success={true}
        timestamp={new Date()}
      />,
      {
        title: "File Update: package.json",
        status: "completed",
      }
    ),

    // File edit activity
    createTimelineActivity(
      "test-file-edit",
      "file-edit",
      <WriteFileDiff
        args={{
          file_path: "README.md",
          old_string: "# My App\n\nA simple application.",
          new_string:
            "# My App\n\nA simple application with authentication.\n\n## Features\n\n- User authentication\n- Password reset\n- User profiles",
        }}
        success={true}
        toolName="Edit"
      />,
      {
        title: "Modified: README.md",
        status: "completed",
      }
    ),
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="mb-6 font-bold text-2xl">Timeline Test</h1>
      <TimelineContainer activities={testActivities} />
    </div>
  );
}
