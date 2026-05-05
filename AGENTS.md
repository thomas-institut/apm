# AGENTS.md

This document defines the required working rules for contributors and automated coding agents in this repository.

If local code differs from these guidelines, follow mandatory rules in this document first. Otherwise, prefer
consistency with the surrounding code and avoid unnecessary refactors.

## Project Summary

This repository contains:

- a PHP web application for API handling and frontend serving
- a TypeScript/React frontend
- a background daemon and workers for periodic tasks
- a Node.js service for typesetting and PDF generation

Infrastructure used by the project:

- MySQL
- Valkey
- Typesense

## Development Environment

Development services run in Docker containers.

## Repository Layout

### PHP

- Main PHP code: `src/www/classes`
- API code: `src/www/classes/APM/Api`
- Frontend-serving PHP code: `src/www/classes/APM/Site`
- Daemon code: `src/www/classes/APM/ApmDaemon`
- Workers code: `src/www/classes/APM/ApmWorker`
- CLI utilities: `src/www/classes/APM/CommandLine`
- Utility scripts: `src/www/utilities`

### Frontend

- JavaScript/TypeScript code: `src/www/js`
- React SPA: `src/www/js/ReactAPM`

### Typesetting

- Service code: `src/www/typesetting-service`

## Core Rules

### General

- Follow the existing structure and naming conventions of the local area.
- Avoid broad refactors unless explicitly required by the task. This is a project developed and maintained mostly by a
  single person: new dependencies, new programming languages, new data formats and the like should generally be avoided
  unless they have a big positive impact in the codebase. If a new dependency or an structural change makes the
  code and the production environment easier to maintain, make a case of it and put it up for discussion.
- Prefer small, safe, task-focused changes.
- Reuse existing abstractions and components whenever practical.
- Document intentional exceptions in the task summary.

### PHP

- Add a documentation comment for every generated function and class method.
- Add or update unit tests for every generated function and class method.

### TypeScript

- Do not use `any`.
- Prefer `async`/`await`.
- Use `Record<string, T>` instead of index-signature object types where applicable.
- Use camelCase for functions and methods.
- Use PascalCase for classes, interfaces, types, and constants.
- If a function or method needs 4 or more parameters, use a typed options object instead.

Example:

- `function foo(options: FooOptions)`

### Frontend - Backend Communication

- Always use `ApmApiClient` for backend communication from the frontend, never make direct HTTP requests.
- If any interface or method that is involved with communication with the backend is changed, add or update API
  client integration tests. Try to make the test run without problems, but be aware that successful testing may require
  coordination with the user because specific environment variables and data in the test environment may need to be
  added manually.

### React

- All new UI must be written in React.
- Use one component per file.
- Use functional components only.
- Use PascalCase for component names.
- Define props with a typed interface.
- Prefer existing reusable components before creating new ones.
- Use `useContext(AppContext)` to access app context.
- Do not pass context as a prop.
- Do not pass JSX-producing functions as props; create a component instead.
- Remember to only use `ApmApiClient` for backend communication.
- Check for and fix state update loops.

### Legacy Areas

- Do not introduce new legacy patterns for new UI when React is a reasonable option.
- Keep fixes scoped and safe.
- Prefer incremental migration over large rewrites unless explicitly requested.

## Testing Rules

### PHP

- PHPUnit tests are located in `src/www/test/php`.
- Mirror the source structure in the test structure.
- Use the `Test` suffix for PHP test files.
- Run PHP tests in the development Docker environment, not on the host machine.
- Use the utility script `dev-test-php` to run all PHP tests, fix any issue reported (e.g. notices, warnings, etc)
- Pay attention to calls to createMock() for test doubles with no expectations configured, use createStub() instead.

### JS/TS

- Vitest tests are located in `src/www/test/js`.
- Mirror the source structure in the test structure.
- Use the `.test` suffix for JS/TS test files.
- Use the utility script `dev-test-js` to run all JS tests except API client integration. Fix all issues reported.
- API client integration test code is in `src/www/test/js/Api/ApmApiClient.integration.test.ts`. This test will not run
  unless the environment variable IT_RUN has a value of 1, which the user should have set in `src/www/.env.it` together
  with all the information needed for the test to run. If this file is missing and this test is needed, alert the user
  and stop; do not try to work around it. Run the test with `cd src/www; npm run api-integration-test`

## Task Completion Requirements

Before finishing a task:

- add or update tests for new or changed behavior
- ensure relevant tests pass
- follow the rules in this document
- avoid unnecessary architectural drift
- summarize any intentional deviations