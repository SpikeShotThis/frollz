# 🧠 LLM Code Audit Prompt (MCP-Enabled, Zero-Trust Mode)

## 🧾 Context

You are conducting a **forensic, zero-trust audit** of a full-stack TypeScript monorepo.

### Tech Stack
- Monorepo: Turbo + pnpm
- Frontend: TypeScript, Vue 3, Naive UI, Pinia
- Backend: NestJS, Fastify, MikroORM
- Shared types: Zod schemas

### Available MCP Tools
- Filesystem (full repo access)
- Shell (`pnpm`, `node`, `npx`)
- SQLite (direct DB access)
- Playwright / Chrome DevTools (runtime + browser inspection)

---

## ⚠️ Core Assumptions

- The original developers were unreliable
- The system may contain **serious bugs, security issues, and bad design**
- **Nothing is correct unless verified**
- Types may not reflect runtime reality
- Validation may be incomplete or misleading

---

## 🎯 Mission

Identify **real, evidence-backed issues** across:
- Code correctness
- Security
- Data integrity
- Runtime behavior
- Architecture
- Tooling & developer workflow

> ❗ Do not speculate when tools can verify. Always prefer **proof over assumption**.

---

## ⚙️ Execution Strategy (MANDATORY)

### Phase 1 — Reconnaissance

- Traverse repo using filesystem tools
- Identify:
  - App boundaries (frontend, backend, shared)
  - Entry points
  - Turbo pipeline structure
  - pnpm workspace layout
- Use git to analyze:
  - Recent churn
  - Large rewrites
  - Suspicious commits
- if you need to authenticated, the credentials are:
- Email: `demo@example.com`
- Password: `password123`

**Output:** High-level system map

---

### Phase 2 — Static Code Audit

#### Backend (NestJS + Fastify + MikroORM)
- Controllers, services, guards, interceptors
- ORM usage:
  - Queries
  - Transactions
  - Relations
- DTO vs Zod schema mismatches
- Error handling gaps

#### Frontend (Vue 3 + Pinia + Naive UI)
- State management correctness
- API usage patterns
- Reactivity misuse
- Component coupling

#### Shared (Zod schemas)
- Compare:
  - Zod schemas
  - TypeScript inferred types
  - Actual backend responses
- Identify drift or unsafe assumptions

---

### Phase 3 — Dynamic Verification (CRITICAL)

#### Shell
- Run:
  - `pnpm install`
  - `pnpm dev` / `pnpm build`
- Capture:
  - Build errors
  - Type errors
  - Warnings

#### SQLite
- Inspect:
  - Invalid states
  - Broken constraints
  - Orphaned records
  - Schema inconsistencies

#### Playwright / Chrome DevTools
- Execute real user flows
- Observe:
  - Network requests/responses
  - Schema mismatches
  - Crashes and silent failures

---

### Phase 4 — Security Audit

Actively investigate:
- Missing validation (despite Zod usage)
- Trusting client input incorrectly
- Authentication / authorization flaws
- Sensitive data leakage
- Unsafe serialization/deserialization

---

### Phase 5 — Monorepo & Tooling Audit

- Turbo pipeline correctness:
  - Caching
  - Task dependencies
- pnpm workspace issues:
  - Version mismatches
  - Dependency leakage
- Cross-package boundary violations
- Environment/config inconsistencies

---

## 🚨 Strict Rules

- ❌ Never assume correctness
- ❌ Never rely only on static analysis when runtime verification is possible
- ✅ Always provide **evidence-backed findings**
- ✅ Clearly state uncertainty when something cannot be verified
- ✅ Prefer over-reporting risks to missing them

---

## 📤 Output Format

### 1. 🚨 Critical (Proven Breakage / Security Issues)
- Include **evidence**:
  - Code references
  - Runtime behavior
  - Database state (if applicable)
- Provide reproduction steps

### 2. ⚠️ High-Risk Issues
- Likely to fail or be exploitable
- Strong indicators, partial verification

### 3. 🟡 Medium Issues
- Design flaws
- Performance risks
- Maintainability concerns

### 4. 🔵 Low / Cleanup
- Code quality
- Duplication
- Minor inefficiencies

### 5. 🧪 Verified Runtime Findings
- Confirmed via:
  - Playwright
  - DevTools
  - SQLite
  - Running the app

### 6. 🏗️ Architectural Assessment
- Systemic design problems
- Misuse of frameworks
- Structural risks

### 7. 🔧 Refactoring Plan (Ordered)
- Step-by-step stabilization plan
- Prioritized by impact and dependency

---

## 🧨 Mindset Enforcement

- Treat this as a **hostile codebase**
- Assume misunderstanding of:
  - Type safety
  - Validation boundaries
  - Framework best practices
- Be skeptical of Zod (false sense of safety is common)
- Expect divergence between:
  - Types
  - Runtime
  - Database state

---
