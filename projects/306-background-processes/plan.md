### APM Background Processes Re-design Plan

Based on our discussion, here is the proposed design and implementation plan to replace the current `apmd` (Fiber/MySQL-based) with a more reliable Valkey-based worker system.

#### 1. Design Overview
*   **Queue Storage:** Use **Valkey (Redis)** as the primary backend.
    *   `APM:Queue:Waiting` (Sorted Set): Stores jobs to be processed. The score is the Unix timestamp for execution (enables delayed jobs and debouncing).
    *   `APM:Queue:Processing` (Hash): Stores jobs currently being handled by a worker (enables crash recovery).
    *   `APM:Queue:Dead` (Hash): Stores jobs that failed after maximum retries.
*   **Workers:** Generic PHP processes started by `systemd`.
    *   Workers use a Lua script for atomic "fetch" (moving a job from `Waiting` to `Processing`).
    *   Workers exit after a configurable number of jobs (e.g., 100) to prevent memory leaks, relying on `systemd` to restart them.
*   **Reliability:**
    *   **Coalescing:** Use job signatures (e.g., `update-doc:123`). If a job with the same signature is already in the `Waiting` queue, we update its timestamp instead of adding a new one.
    *   **Crash Recovery:** A periodic "watchdog" routine checks `APM:Queue:Processing` for jobs that have been there too long and moves them back to `Waiting`.
    *   **Retries:** Runtime errors trigger a re-schedule with exponential backoff (1m, 5m, 15m...).

#### 2. Delineated Tasks

1.  **Infrastructure: `ValkeyJobQueueManager`**
    *   Implement a new `ValkeyJobQueueManager` class.
    *   Migrate the `scheduleJob` logic to use Valkey Sorted Sets.
    *   Implement signature-based de-duplication and coalescing.

2.  **Execution: `ValkeyWorker`**
    *   Create a `ValkeyWorker` class to handle the "Fetch-Execute-Cleanup" loop.
    *   Implement the atomic handoff from `Waiting` to `Processing`.
    *   Add exponential backoff retry logic.
    *   Add the watchdog/recovery routine.

3.  **Interface: `apm-worker` CLI**
    *   Create `src/bin/apm-worker` as the entry point for `systemd`.
    *   Add monitoring commands to the existing `apm` tool (e.g., `apm queue:status`, `apm queue:retry-dead`).

4.  **Integration**
    *   Update `ApmSystemManager` to use the new Valkey-based manager by default.
    *   Deprecate/Remove the old `ApmDaemon` and `apmd` binary.

5.  **Testing Strategy**
    *   **Unit Tests:** For `ValkeyJobQueueManager` (mocking Predis).
    *   **Integration Tests:** A test script that spawns a worker, injects jobs, and verifies processing and crash recovery (using a real Valkey instance in the dev environment).

#### 3. Recommended Implementation in Production
*   **Systemd:** Use a template unit (e.g., `apm-worker@.service`) to easily run multiple instances (e.g., `systemctl start apm-worker@{1..4}`).
*   **Deployment:** The `apm-worker` script should be part of the standard deployment. `systemd` handles the "minimal intervention" requirement by automatically restarting workers if they exit or crash.

Does this plan look sensible to you? If so, I can start by implementing the `ValkeyJobQueueManager`.