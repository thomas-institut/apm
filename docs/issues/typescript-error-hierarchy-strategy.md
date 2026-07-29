---
sessionId: session-260728-142105-nn8d
---

# Requirements

### Overview & Goals
Use a cross-runtime TypeScript error strategy that works in both browser and Node.js, and allows reliable distinction between `InvalidArgument` and `Network` failures.

### Scope
#### In Scope
- Recommend the best error-model approach for this codebase.
- Define how to classify and detect `InvalidArgument` and `Network` errors.
- Keep compatibility with existing `unknown` catches and mixed throw sources.

#### Out of Scope
- No source code changes in this task (advisory only).

### Recommendation
Yes — extending `Error` is a good and standard approach in TypeScript/JavaScript, especially for application/domain errors.

Use a **hybrid model**:
1. **Custom `Error` subclasses** for your own thrown errors (`InvalidArgumentError`, `NetworkError`).
2. **Normalization layer** for external/unknown thrown values (`unknown` -> `AppError`) so browser/Node differences and non-`Error` throws are handled consistently.
3. **Type guards / `instanceof` checks** for ergonomic branching in catch blocks.

# Technical Design

### Current Implementation (from repository)
- `../../apps/ape-frontend/src/Api/ApiClient.ts` avoids throwing and returns a normalized `ApiClientResponse<T>` (`result: 'Success' | 'Error'`), with `catch` using `error instanceof Error`.
- `../../apps/apm/www/js/Api/ApmApiClient.ts` defines `ApmApiClientError` with `errorType: 'http' | 'authentication' | 'method' | 'network' | 'other'`, but rejects plain objects rather than `Error` instances in its internal `fetch(...)` flow.
- Across TS code, most failures are currently `throw new Error(...)`; there are no `class ... extends Error` implementations yet.
- Existing code already performs name/type checks in places (e.g. `AbortError` handling in `../../apps/apm/www/js/ReactAPM/Pages/Search/Search.tsx`).

### Key Decisions
1. **Adopt `AppError` base class extending `Error`**
   - Rationale: gives a clear hierarchy (similar to PHP exceptions) and works in browser + Node.
2. **Add specific subclasses for requested categories**
   - `InvalidArgumentError` for input/contract violations.
   - `NetworkError` for transport/connectivity/API reachability problems.
3. **Normalize unknown thrown values at boundaries**
   - Rationale: JS allows throwing non-`Error` values; normalization prevents fragile catch logic.
4. **Preserve underlying causes**
   - Include `cause` and optional metadata (`status`, `url`, `operation`) to keep debugging context.

### Proposed Shape
```ts
abstract class AppError extends Error {
  readonly kind: string;
  constructor(kind: string, message: string, options?: { cause?: unknown }) {
    super(message);
    this.kind = kind;
    this.name = new.target.name;
    this.cause = options?.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

class InvalidArgumentError extends AppError {
  constructor(message: string, options?: { cause?: unknown }) {
    super('invalid-argument', message, options);
  }
}

class NetworkError extends AppError {
  readonly status?: number;
  constructor(message: string, opts?: { cause?: unknown; status?: number }) {
    super('network', message, { cause: opts?.cause });
    this.status = opts?.status;
  }
}
```

### Detection Strategy
- Preferred: `error instanceof InvalidArgumentError` / `error instanceof NetworkError`.
- Fallback for unknown cross-boundary values: normalize first, then switch on `kind`.
- Keep `AbortError` separate from network failures when cancellation semantics matter.

### Why this is best for your case
- Keeps your desired hierarchy (`InvalidArgument` vs `Network`) explicit and type-safe.
- Works in both browser and Node.js.
- Fits existing repository patterns where API layers already classify errors (`result` unions in APE; `errorType` in APM) and can be incrementally aligned later.

# Delivery Steps

###   Step 1: Define shared error taxonomy and base hierarchy
A reusable cross-runtime `AppError` hierarchy is specified with clear categories and detection rules.

- Define `AppError` contract (required fields like `name`, `kind`, optional `cause`, metadata).
- Define concrete categories at minimum: `InvalidArgumentError` and `NetworkError`.
- Define normalization rules for `unknown` thrown values (native `Error`, fetch/DOM/network variants, plain-object throws).
- Define catch/handling convention (`instanceof` first, normalized `kind` fallback).

###   Step 2: Map existing API-layer error patterns to the taxonomy
Current APM/APE error flows are mapped to the new hierarchy so callers can branch consistently.

- Map `../../apps/ape-frontend/src/Api/ApiClient.ts` response-error paths to `NetworkError` and argument/usage failures to `InvalidArgumentError` where applicable.
- Map `../../apps/apm/www/js/Api/ApmApiClient.ts` `ApmApiClientError.errorType` values to the hierarchy (`http`/`network` -> `NetworkError`, invalid method/input -> `InvalidArgumentError`).
- Define migration order for callers currently depending on generic `Error` messages.
- Define validation scenarios for browser and Node execution to confirm error classification remains stable.