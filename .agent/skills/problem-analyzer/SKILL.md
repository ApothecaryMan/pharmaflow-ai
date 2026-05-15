---
name: problem-analyzer
description: Deep-dive technical analysis workflow to map problems, architectures, and edge cases before implementation.
---

# 🧠 Problem Analyzer & Architectural Researcher Skill

Use this skill when you encounter a complex bug, a race condition, or a requirement for a new architectural change. This skill ensures you understand the problem "broadly and accurately" before writing a single line of code.

## 📋 Analysis Workflow

### 1. Context Gathering & Live Inspection
- **MANDATORY**: Use `mcp_supabase_list_tables` and `mcp_supabase_execute_sql` (READ-ONLY) to inspect the current database state.
- **NEVER** trust migration files as the absolute ground truth; they may contain errors or be out of sync with the live production schema.
- Identify all affected components, hooks, services, and database tables.
- Read the relevant code sections completely (don't assume based on snippets).
- Look for error logs via `mcp_supabase_get_logs` and stack traces.

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

## 📝 Output Format (MANDATORY EXPERT ARTIFACT)

**Every analysis MUST be written to a dedicated markdown artifact**. This is a non-negotiable professional requirement.

The artifact (e.g., `expert_architectural_analysis.md`) must include:

### 1. 🔍 Executive Summary
- High-level technical overview.
- Business impact and urgency assessment.

### 2. 📍 Structural Blueprint
- **Architecture Map**: Dependency tree of all involved entities.
- **Data Schema (Mermaid ER)**: Visualization of table relationships and constraints.

### 3. 🔄 Behavioral Analysis (The Multi-View Suite)
You MUST include at least **two** of the following diagrams to provide multi-perspective clarity:
- **Sequence Diagram**: For async flows and race conditions.
- **State Machine**: For complex lifecycle transitions.
- **Flowchart**: For decision logic and conditional paths.

### 4. 🛡️ Expert Analysis Suite
- **Security Audit**: Potential vulnerabilities (SQLi, RLS bypass, Auth leaks).
- **Performance Profile**: Complexity analysis (O-notation) and DB query efficiency.
- **Scalability Check**: How the solution behaves with 10x more data or concurrent users.

### 5. 🧪 Edge Case Matrix (The "Expert 10" Rule)
A detailed table identifying at least 10 scenarios, including:
- **Concurrency**: What happens if two identical actions happen at the exact same ms?
- **Failure Modes**: Partial DB writes, network timeout mid-request.
- **State Corruption**: Stale UI state or cache inconsistencies.

### 6. 📋 Implementation Roadmap
- **Priority 🔴 (Critical)**: Security, Data Integrity, Core Logic.
- **Priority 🟡 (Enhanced)**: UX, Performance, Error Handling.
- **Priority 🟢 (Polish)**: Refactoring, Logging, Documentation.

---

**CRITICAL RULE**: Do NOT start editing files until the user reviews the **comprehensive expert artifact** and gives the "Go Ahead".
