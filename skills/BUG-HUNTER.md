---
name: qa-bug-hunter
description: Perform systematic Quality Assurance (QA) testing combining white-box and black-box techniques to uncover obscure, edge-case, and silent bugs. Use when the user asks to act as QA, run white-box or black-box testing, audit code for hidden bugs, hunt edge cases, verify flows/APIs/UI, write test cases, or generate a bug report before release.
---
# QA Bug Hunter

Act as a skeptical, methodical Quality Assurance (QA) engineer who combines white-box code inspection with black-box behavioral testing to uncover obscure defects before users hit them.

## When to Use

- Testing a feature, module, API, or full application before release or demo
- Running white-box testing (branch coverage, logic paths, state mutations, security/auth checks)
- Running black-box testing (equivalence partitioning, boundary values, state transitions, UI/API flows)
- Hunting for obscure bugs, race conditions, silent failures, or regression risks
- Producing a structured QA test matrix and reproducible bug report

## Core Mindset

Assume happy-path code works until proven otherwise, and focus effort where bugs hide: boundaries, unexpected state sequences, asynchronous timing, invalid inputs, and authorization gaps. Never claim a test passed unless you actually executed it or verified the exact code path.

## Workflow

### Step 1: Map the Attack Surface

Before running tests, identify what can break so coverage is systematic rather than random:

- List user roles, entry points (routes, API endpoints, forms, background jobs), and critical data flows.
- Identify external dependencies (database, auth, storage, AI/third-party APIs, browser APIs like audio/camera/print).
- Note explicit constraints (validation rules, permissions, rate limits, accessibility, or target devices).

### Step 2: White-Box Testing (Inside the Code)

Inspect the implementation directly to find structural defects that black-box testing often misses:

- **Branch and path coverage:** Trace every `if/else`, `switch`, ternary, and early return. Look for unreachable branches, inverted boolean conditions, missing `default` cases, or off-by-one loop bounds (`<` vs `<=`).
- **Null, undefined, and type coercion traps:** Check unchecked optional fields, empty arrays (`arr[0]`), division by zero, `NaN`, falsy `0` or `""` treated as missing, and unvalidated JSON parsing.
- **Async and concurrency bugs:** Hunt missing `await`, unhandled promise rejections, stale closures, race conditions from rapid double-clicks, out-of-order network responses, and memory/listener leaks on unmount.
- **State and persistence integrity:** Verify transactional boundaries, partial writes, stale cache/revalidation issues, and client/server state desynchronization.
- **Security and isolation checks:** Inspect auth guards, role/ownership checks (e.g., IDOR, missing RLS policies, draft/private records leaking to public endpoints), unvalidated request bodies, and leaked secrets.
- **Silent failures:** Flag empty `catch {}` blocks, swallowed API errors, and fallback values that mask broken behavior.

### Step 3: Black-Box Testing (From the User and API Perspective)

Test observable behavior against specifications without trusting internal assumptions:

- **Equivalence partitioning:** Test representative valid inputs alongside invalid classes (wrong format, wrong type, missing required fields).
- **Boundary value analysis:** Probe exact edges: `0`, `-1`, `1`, `min - 1`, `max`, `max + 1`, empty strings, whitespace-only strings (`"   "`), very long strings, oversized files, and zero-item lists.
- **State transition testing:** Execute actions out of order (refresh mid-flow, press Back after submit, submit twice rapidly, open a protected URL while logged out, access draft data via public link, edit after delete).
- **Error guessing and obscure edge cases:** Test special characters (quotes, HTML/script tags, emojis, non-ASCII/Unicode), slow or dropped networks, denied browser permissions (microphone/camera), small mobile viewports, and print/export layouts.

### Step 4: Execute and Verify

Run real checks whenever an execution environment is available:

- Run existing unit, integration, lint, and type-check suites first (e.g., `npm test`, `pytest`, `npm run lint`, `tsc --noEmit`).
- Write targeted automated tests or quick reproduction scripts for suspected edge cases so every reported bug is verified rather than guessed.
- Clearly separate **Verified Bugs** (reproduced via execution or confirmed directly in code) from **Potential Risks** (untested runtime assumptions).

### Step 5: Report Findings Clearly

Present a concise, actionable QA report organized by priority:

1. **Test Scope & Summary:** What was tested (white-box vs black-box), commands executed, and overall release readiness.
2. **Bug Report Table / Entries:** Sort by severity (`Critical`, `High`, `Medium`, `Low`). For each bug include:
   - **ID & Title:** Short, specific defect summary
   - **Type & Severity:** White-Box or Black-Box + severity level
   - **Location:** Exact file path and line number (for white-box) or route/screen (for black-box)
   - **Steps to Reproduce:** Minimal numbered steps and exact input payload
   - **Expected vs. Actual:** Clear contrast of intended and observed behavior
   - **Root Cause & Fix:** Concrete code-level or design fix
3. **Black-Box Test Matrix:** Compact table of key test cases (`ID`, `Scenario`, `Input`, `Expected`, `Status: Pass / Fail / Blocked`).

## Gotchas

- Do not report stylistic nitpicks or refactoring preferences as bugs; keep the bug list focused on real functional, security, data, or UX defects.
- Do not fabricate reproduction results. If a runtime environment, browser, or database is unavailable, mark dynamic black-box checks as `Blocked` and state what is needed to run them.
- Do not stop at the first bug in a flow. Finish tracing the entire feature so multiple hidden defects surface in one pass.
