---
name: problem-analyzer
description: Deep-dive technical analysis workflow to map problems, architectures, and edge cases before implementation.
---

# 🧠 Problem Analyzer & Architectural Researcher Skill

Use this skill when you encounter a complex bug, a race condition, or a requirement for a new architectural change. This skill ensures you understand the problem "broadly and accurately" before writing a single line of code.

## 📋 Analysis Workflow

### 1. Context Gathering
- Identify all affected components, hooks, services, and database tables.
- Read the relevant code sections completely (don't assume based on snippets).
- Look for error logs, stack traces, and user descriptions.

### 2. Architectural Mapping
Create a tree or list of the involved entities to understand the data flow.
Example:
```text
Provider A
  └── Hook B
        └── Component C (Consumer)
```

### 3. Visual Sequence Analysis (Mermaid)
Create a `mermaid` sequence diagram for the **CURRENT (Broken)** flow. This is mandatory to visualize where the race condition or logic failure happens.

### 4. Root Cause Identification
- **Location**: File path and line numbers.

### 📊 Supported Diagram Toolset (Mermaid)
Choose the most appropriate diagram(s) to represent the problem. You can use one or more depending on complexity:

1. **Sequence Diagram (`mermaid sequenceDiagram`)**:
   - *Use when*: Analyzing timing, race conditions, or interactions between multiple components/services.
   - *Value*: Shows the exact order of events and async operations.

2. **Flowchart (`mermaid graph TD/LR`)**:
   - *Use when*: Mapping conditional logic, decision trees, or navigation paths.
   - *Value*: Clarifies complex `if/else` logic or multi-step processes.

3. **Entity Relationship (`mermaid erDiagram`)**:
   - *Use when*: Designing or debugging database schemas and data relationships.
   - *Value*: Visualizes Foreign Key constraints and table connections.

4. **State Diagram (`mermaid stateDiagram-v2`)**:
   - *Use when*: A component or system has complex internal states (e.g., `idle` -> `loading` -> `success/error`).
   - *Value*: Prevents missing state transitions or "stuck" UI states.

5. **Class Diagram (`mermaid classDiagram`)**:
   - *Use when*: Refactoring OOP structures, services, or complex class hierarchies.
   - *Value*: Shows inheritance and shared properties/methods.

### 5. Edge Case Investigation (The "10 EC" Rule)
Force yourself to identify at least **10 edge cases** or scenarios related to the problem.
- Network latency?
- Rapid user clicks?
- Refreshing the page?
- Stale data from previous sessions?
- Missing permissions?

### 6. Implementation Strategy
Create a prioritized plan:
- **Priority 🔴 (High)**: Critical fixes (Security, Data integrity, Main flow).
- **Priority 🟡 (Medium)**: UX improvements, UI glitches.
- **Priority 🟢 (Low)**: Refactoring, code cleanup.

## 📝 Output Format (MANDATORY ARTIFACT)

**Every analysis MUST be written to a dedicated markdown artifact** in the `artifacts/` or `scratch/` directory. You are NOT allowed to present the analysis solely as a chat message.

The artifact (e.g., `problem_analysis.md`) must contain:
1. **🔍 Analysis Summary**: A high-level overview.
2. **📍 Architecture Map**: Tree of involved files.
3. **🔴 Flow Analysis**: Mermaid sequence diagram of the current or proposed flow.
4. **🧪 Edge Case Table**: Detailed scenarios and their impact (10 EC Rule).
5. **📋 Fix Plan**: Step-by-step prioritized tasks.

---

**CRITICAL RULE**: Do NOT start editing files until the user reviews the **generated artifact** and gives the "Go Ahead".
