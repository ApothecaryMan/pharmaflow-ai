# Implementation Plan: CI Pipeline

## Goal

Create a GitHub Actions workflow that enforces quality gates on formatted Code.

## Technical Approach

Use a single workflow file `ci.yml` with a matrix or parallel jobs to minimize runtime. We will use the standard Node.js setup action with caching enabled.

## Proposed Changes

### 1. Workflow Definition

#### [NEW] [.github/workflows/ci.yml](file:///d:/Projects/HTML/pharmaflow-ai/.github/workflows/ci.yml)

- **Triggers**: `push` (main), `pull_request` (main).
- **Job: Quality Check**:
  - Checkout code.
  - Setup Node.js (v20) + Cache NPM.
  - Install dependencies (`npm ci` or `npm install` if no lockfile).
  - Run Lint: `npm run lint`.
  - Run Type Check: `npm run type-check`.
  - Run Tests: `npm run test`.
  - Run Translation Check: `npm run check-translations`.

## Verification Plan

### Automated

- Push this file to GitHub and verify the "Actions" tab shows the workflow running.
- (Since we are local, we can only verify the _file content_ is correct, not the actual execution on GitHub servers).

### Manual

- Review the generic syntax of the YAML file.
