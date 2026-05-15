---
name: expert-executor
description: Directs the execution of tasks.md by strictly following the plan, managing state, and ensuring validation after each phase.
---

# 🚀 Expert Executor Skill

Use this skill when the user gives the "Go Ahead" for a `tasks.md` file. This skill ensures that implementation is surgical, verified, and strictly follows the approved architectural plan.

## 📋 Execution Workflow

### 1. State Verification
- Read the current `tasks.md`.
- Identify the first uncompleted task `[ ]`.
- Read the relevant source files and the `expert_architectural_analysis.md` to ensure full context before editing.

### 2. Surgical Implementation
- Apply changes in small, logical chunks.
- **NEVER** skip a task or change its order without user approval.
- Preserve all existing comments and documentation as per project rules.

### 3. Progressive Marking
- After completing a sub-task, IMMEDIATELY update `tasks.md` by marking it as `[x]`.
- If a task is in progress, mark it as `[/]`.

### 4. Phase Validation
- At the end of each **Phase**, you MUST perform a "Phase Audit":
    - Does the code match the architectural blueprint?
    - Are there any linting or type errors?
    - Run relevant tests if applicable.

## 🛡️ Expert Execution Rules
1. **The "Single Source of Truth"**: The `tasks.md` is the only guide for execution. If you discover a better way, update the plan first and seek approval.
2. **Commit Readiness**: Each completed Phase should be clean and ready for a Git commit.
3. **No Ghost Tasks**: Do not implement features or fixes that are not in the `tasks.md`.

## 📝 Reporting Format
At the end of each turn, provide a progress update:
- **Current Progress**: Percentage of tasks completed.
- **Current Task**: What you are working on now.
- **Next Step**: What follows.

---

**CRITICAL RULE**: Stop after each Phase and ask for user review before proceeding to the next Phase.
