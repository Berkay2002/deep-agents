"use client";

import {
  type Collaborator,
  FileUpdateNotification,
} from "./file-update-notification";

// Demo data
const collaborators: Collaborator[] = [
  {
    id: "1",
    name: "Alice Johnson",
    isActive: true,
    lastSeen: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
  },
  {
    id: "2",
    name: "Bob Smith",
    isActive: false,
    lastSeen: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
  },
  {
    id: "3",
    name: "Carol Davis",
    isActive: true,
  },
];

const oldContent = `# Final Report

## Introduction
This is the introduction section of the report.

## Methodology
The methodology section describes how we conducted our research.

## Findings
Here are the key findings from our analysis.

## Conclusion
This is the conclusion of the report.`;

const newContent = `# Final Report

## Introduction
This is the introduction section of the report.
It has been updated with more detailed information about the project background.

## Methodology
The methodology section describes how we conducted our research.
We used both qualitative and quantitative methods to gather data.

## Findings
Here are the key findings from our analysis.
Our research revealed several important insights that are worth noting.

## Conclusion
This is the conclusion of the report.
We have summarized the main points and provided recommendations for future work.`;

export function FileUpdateNotificationDemo() {
  return (
    <div className="space-y-6 p-6">
      <h2 className="mb-6 font-bold text-2xl text-gray-900">
        File Update Notification Demo
      </h2>

      {/* Example 1: Successful file modification with collaborators */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-800 text-lg">
          File Modification with Collaborators
        </h3>
        <FileUpdateNotification
          branch="main"
          changeType="modified"
          collaborators={collaborators} // 2 minutes ago
          editorName="Alice Johnson"
          fileName="final_report.md"
          isRealTime={true}
          newContent={newContent}
          oldContent={oldContent}
          success={true}
          timestamp={new Date(Date.now() - 2 * 60 * 1000)}
        />
      </div>

      {/* Example 2: File creation */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-800 text-lg">
          New File Creation
        </h3>
        <FileUpdateNotification
          branch="feature/project-planning"
          changeType="created"
          editorName="Bob Smith" // 10 minutes ago
          fileName="project_plan.md"
          isRealTime={false}
          newContent={`# Project Plan

## Overview
This document outlines the plan for our upcoming project.

## Timeline
- Phase 1: Research (2 weeks)
- Phase 2: Development (4 weeks)
- Phase 3: Testing (1 week)
- Phase 4: Deployment (1 week)

## Resources
- Development team: 3 people
- Budget: $50,000
- Tools: React, TypeScript, Node.js`}
          success={true}
          timestamp={new Date(Date.now() - 10 * 60 * 1000)}
        />
      </div>

      {/* Example 3: Failed file update */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-800 text-lg">
          Failed File Update
        </h3>
        <FileUpdateNotification
          changeType="modified"
          collaborators={[collaborators[2]]}
          editorName="Carol Davis" // 5 minutes ago
          error="Failed to parse JSON: Unexpected token at line 8, column 25"
          fileName="config.json"
          newContent={`{
  "apiUrl": "https://api.example.com",
  "timeout": 5000,
  "retries": 3,
  "newFeature": {
    "enabled": true,
    "config": "invalid-json"
}`}
          oldContent={`{
  "apiUrl": "https://api.example.com",
  "timeout": 5000,
  "retries": 3
}`}
          success={false}
          timestamp={new Date(Date.now() - 5 * 60 * 1000)}
        />
      </div>

      {/* Example 4: File deletion */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-800 text-lg">File Deletion</h3>
        <FileUpdateNotification
          branch="cleanup"
          changeType="deleted"
          collaborators={[collaborators[0]]} // 15 minutes ago
          editorName="Alice Johnson"
          fileName="old_draft.md"
          success={true}
          timestamp={new Date(Date.now() - 15 * 60 * 1000)}
        />
      </div>

      {/* Example 5: Large diff with many changes */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-800 text-lg">
          Large File Update
        </h3>
        <FileUpdateNotification
          branch="feature/large-refactor"
          changeType="modified"
          collaborators={[collaborators[1]]} // 1 minute ago
          editorName="Bob Smith"
          fileName="source_code.ts"
          newContent={`// This is a large file with many lines of code
// Line 1
// Line 2
// Line 3 (Modified)
// Line 4
// Line 5
// Line 6
// Line 7
// Line 8 (Modified)
// Line 9
// Line 10
// Line 11
// Line 12 (Modified)
// Line 13
// Line 14
// Line 15
// Line 16
// Line 17
// Line 18
// Line 19
// Line 20
// Line 21 (Added)
// Line 22 (Added)
// Line 23 (Added)
// Line 24 (Added)
// Line 25 (Added)
// Line 26 (Added)
// Line 27 (Added)
// Line 28 (Added)
// Line 29 (Added)
// Line 30 (Added)`}
          oldContent={`// This is a large file with many lines of code
// Line 1
// Line 2
// Line 3
// Line 4
// Line 5
// Line 6
// Line 7
// Line 8
// Line 9
// Line 10
// Line 11
// Line 12
// Line 13
// Line 14
// Line 15
// Line 16
// Line 17
// Line 18
// Line 19
// Line 20`}
          success={true}
          timestamp={new Date(Date.now() - 1 * 60 * 1000)}
        />
      </div>
    </div>
  );
}
