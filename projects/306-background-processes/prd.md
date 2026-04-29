# PRD: APM Background Processes Re-design

## 1. Introduction
APM currently relies on a MySQL-based job queue and a Fiber-based daemon (`apmd`). This architecture has limitations in parallelism, reliability, and job coalescing. This project aims to replace it with a robust Valkey-based worker system.

## 2. Goals
- **Parallelism:** Support multiple independent worker processes.
- **Reliability:** Ensure no jobs are lost if a worker crashes.
- **Efficiency:** Prevent redundant job execution (coalescing/debouncing).
- **Maintainability:** Minimal system administrator intervention via `systemd`.
- **Error Handling:** Automatic retries with exponential backoff and a Dead Letter Queue.

## 3. System Architecture

### 3.1 Queue Structure (Valkey)
- `APM:Queue:Waiting` (Sorted Set): Contains job signatures. Score is the Unix timestamp (seconds) when the job is due.
- `APM:Queue:Data` (Hash): Map of `signature -> serialized_job_data`. Stores job name, payload, attempts, max\_attempts, etc.
- `APM:Queue:Processing` (Hash): Map of `signature -> processing_info`. Tracks which worker is handling which job and when it started.
- `APM:Queue:Dead` (Hash): Map of `signature -> failed_job_data`. Stores jobs that exhausted all retries.

### 3.2 Key Components

#### ValkeyJobQueueManager
- Implements `JobQueueManager` interface.
- **Scheduling:** 
    - Generates a unique signature based on job name and payload.
    - If the signature exists in `Waiting`, it updates the score (coalescing).
    - If the signature exists in `Processing`, it can either be ignored or scheduled for a future run (to ensure the latest state is eventually processed).
- **Monitoring:** Provides counts and job listings for CLI/Admin tools.

#### ValkeyWorker
- **Fetch Loop:** 
    - Uses a Lua script to atomically:
        1. Find jobs in `Waiting` where score <= `now`.
        2. Move the first signature to `Processing`.
        3. Return the signature and data.
- **Execution:** Calls the registered `JobHandler`.
- **Lifecycle Management:** 
    - **Success:** Remove signature from `Processing` and `Data`.
    - **Failure (Runtime):** Catch exceptions, increment `attempts`, calculate backoff time, and move signature back to `Waiting` with new score.
    - **Failure (Fatal):** Move to `Dead` if `attempts >= max_attempts`.
- **Self-Termination:** Exits after a configured number of jobs to prevent memory bloat.

#### Watchdog / Recovery
- Scans `APM:Queue:Processing`.
- If a job has been in `Processing` for longer than a threshold (e.g., 30 mins) and the worker ID is inactive/stale, move it back to `Waiting`.

## 4. Test Specifications

### 4.1 ValkeyJobQueueManager Tests
- **T1: Basic Scheduling:** Verify that calling `scheduleJob` adds the correct data to `APM:Queue:Data` and the signature to `APM:Queue:Waiting` with the correct score.
- **T2: Coalescing (Debouncing):** Schedule a job to run in 10 seconds. Schedule the same job again to run in 5 seconds. Verify only one entry exists in `Waiting` with the updated score.
- **T3: Delayed Execution:** Verify `ZRANGEBYSCORE` only returns jobs whose score is <= current time.
- **T4: Signature Stability:** Ensure different payloads produce different signatures, and identical payloads produce the same signature.

### 4.2 ValkeyWorker Tests
- **T5: Atomic Take:** Simulate two workers fetching at the same time. Verify that one job is never taken twice and always moves correctly to `Processing`.
- **T6: Error Backoff:** Fail a job execution. Verify it is re-scheduled in `Waiting` with a future timestamp (e.g., `current_time + 60s`).
- **T7: Dead Letter Queue:** Fail a job until `max_attempts` is reached. Verify it moves to `APM:Queue:Dead` and is removed from `Processing`.
- **T8: Success Cleanup:** Execute a job successfully. Verify all traces of the signature are removed from `Waiting`, `Processing`, and `Data`.

### 4.3 Recovery Tests
- **T9: Orphaned Job Recovery:** Manually inject a job into `Processing` with a worker ID and an old timestamp. Run the recovery routine. Verify the job is moved back to `Waiting`.

### 4.4 Integration Tests
- **T10: End-to-End Loop:** Schedule a real job (e.g., `NullJob`). Run a worker instance. Verify the job is executed and the queue becomes empty.

## 5. Deployment
- **Production:** `systemd` unit files with `Restart=always`.
- **Development:** Manual start via `apm-worker` or IDE services tab.
