---
name: expert-task-architect
description: Converts an expert architectural analysis into a comprehensive, dependency-aware task list (tasks.md). Ensures phased implementation and strict logic tracking.
---

# 🏗️ Expert Task Architect Skill

Use this skill AFTER a `problem-analyzer` report has been generated and approved. This skill transforms high-level architectural plans into a granular, actionable `tasks.md` file.

## 📋 Transformation Workflow

### 1. Analysis Ingestion
- Read the entire `expert_architectural_analysis.md` or `problem_analysis.md`.
- Extract the **Implementation Roadmap** and **Expert Analysis Suite**.
- Identify all affected files and database entities mentioned in the blueprint.

### 2. Dependency Mapping
- Determine the correct order of execution:
    1. **Database/Schema** (Migrations)
    2. **Backend/Services** (Logic & Security)
    3. **Hooks/State** (Data Flow)
    4. **UI/Components** (Visuals & Interactions)
    5. **Verification** (Tests & Audits)

### 3. Task Granularity
- Break down complex items into sub-tasks that take no more than 15-30 minutes each.
- Every task must have a clear "Definition of Done".

## 📝 Output Format (MANDATORY tasks.md)

**Every task list MUST be written to `tasks.md` in the current conversation directory.**

The `tasks.md` must follow this structure:

```markdown
# 📋 Feature Implementation Tasks: [Feature Name]

## 🏗️ Phase 1: Foundation & Security (RED - Critical)
- [ ] **DB Migration**: Create/Update migration for [Entity]
    - [ ] Add [Column/Constraint]
    - [ ] Implement [RPC/Trigger] Logic
- [ ] **Security Enforcement**: 
    - [ ] Implement \`auth.uid()\` validation
    - [ ] Update RLS policies

## ⚙️ Phase 2: Core Logic & Services (YELLOW - Enhanced)
- [ ] **Service Layer**: Update \`[ServiceName]\`
    - [ ] Implement \`[MethodName]\` logic
    - [ ] Add error handling for [Edge Case]
- [ ] **Custom Hooks**: Refactor \`use[HookName]\`
    - [ ] Connect to new service methods
    - [ ] Implement loading/error states

## 🎨 Phase 3: UI & User Experience (GREEN - Polish)
- [ ] **Component Update**: \`[ComponentName].tsx\`
    - [ ] Add [UI Element]
    - [ ] Connect [Action Handler]
- [ ] **Standardization**: Apply "Pure Flat" design tokens

## 🧪 Phase 4: Verification & Expert Audit
- [ ] **Security Verification**: Manual audit of RPC payload
- [ ] **Performance Benchmarking**: Verify execution time of [Operation]
- [ ] **Edge Case Testing**: Validate all 10 ECs from analysis
```

## 🛡️ Expert Rules for tasks.md
1. **No Vague Tasks**: Instead of "Fix UI", use "Update POSCartSidebar.tsx to handle undefined discount values".
2. **Atomic Commits**: Each Phase should ideally represent a clean point for a Git commit.
3. **Reference Analysis**: Each task section should reference the corresponding part of the Expert Analysis.

---

**CRITICAL RULE**: Do NOT start executing Phase 1 until the user approves the generated \`tasks.md\`.
