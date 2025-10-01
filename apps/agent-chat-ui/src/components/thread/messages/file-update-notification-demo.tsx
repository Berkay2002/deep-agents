"use client";

import { FileUpdateNotification, Collaborator } from "./file-update-notification";

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
      <h2 className="text-2xl font-bold text-gray-900 mb-6">File Update Notification Demo</h2>
      
      {/* Example 1: Successful file modification with collaborators */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-800">File Modification with Collaborators</h3>
        <FileUpdateNotification
          fileName="final_report.md"
          editorName="Alice Johnson"
          timestamp={new Date(Date.now() - 2 * 60 * 1000)} // 2 minutes ago
          oldContent={oldContent}
          newContent={newContent}
          changeType="modified"
          collaborators={collaborators}
          branch="main"
          isRealTime={true}
          success={true}
        />
      </div>

      {/* Example 2: File creation */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-800">New File Creation</h3>
        <FileUpdateNotification
          fileName="project_plan.md"
          editorName="Bob Smith"
          timestamp={new Date(Date.now() - 10 * 60 * 1000)} // 10 minutes ago
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
          changeType="created"
          branch="feature/project-planning"
          isRealTime={false}
          success={true}
        />
      </div>

      {/* Example 3: Failed file update */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-800">Failed File Update</h3>
        <FileUpdateNotification
          fileName="config.json"
          editorName="Carol Davis"
          timestamp={new Date(Date.now() - 5 * 60 * 1000)} // 5 minutes ago
          oldContent={`{
  "apiUrl": "https://api.example.com",
  "timeout": 5000,
  "retries": 3
}`}
          newContent={`{
  "apiUrl": "https://api.example.com",
  "timeout": 5000,
  "retries": 3,
  "newFeature": {
    "enabled": true,
    "config": "invalid-json"
}`}
          changeType="modified"
          collaborators={[collaborators[2]]}
          error="Failed to parse JSON: Unexpected token at line 8, column 25"
          success={false}
        />
      </div>

      {/* Example 4: File deletion */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-800">File Deletion</h3>
        <FileUpdateNotification
          fileName="old_draft.md"
          editorName="Alice Johnson"
          timestamp={new Date(Date.now() - 15 * 60 * 1000)} // 15 minutes ago
          changeType="deleted"
          collaborators={[collaborators[0]]}
          branch="cleanup"
          success={true}
        />
      </div>

      {/* Example 5: Large diff with many changes */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-800">Large File Update</h3>
        <FileUpdateNotification
          fileName="source_code.ts"
          editorName="Bob Smith"
          timestamp={new Date(Date.now() - 1 * 60 * 1000)} // 1 minute ago
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
          changeType="modified"
          collaborators={[collaborators[1]]}
          branch="feature/large-refactor"
          success={true}
        />
      </div>
    </div>
  );
}