# AGENTS.md

This document defines the required working rules for contributors and automated coding agents in this repository.

If local code differs from these guidelines, follow mandatory rules in this document first. Otherwise, prefer consistency with the surrounding code and avoid unnecessary refactors.

## Project Summary

This repository contains:
- a PHP web application for API handling and frontend serving
- a TypeScript/React frontend
- a background daemon for periodic tasks
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
- Avoid broad refactors unless explicitly required by the task.
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

### React
- All new UI must be written in React.
- Use one component per file.
- Use functional components only. Follow this pattern: `export default function MyComponent(props: MyComponentProps) { ... }`
- Use PascalCase for component names.
- Define props with a typed interface.
- Prefer existing reusable components before creating new ones.
- Use `useContext(AppContext)` to access app context.
- Do not pass context as a prop.
- Do not pass JSX-producing functions as props; create a component instead.
- Use `ApmApiClient` for backend communication.
- Do not make direct HTTP requests from React components.
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

### JS/TS
- Vitest tests are located in `src/www/test/js`.
- Mirror the source structure in the test structure.
- Use the `.test` suffix for JS/TS test files.

## Task Completion Requirements

Before finishing a task:
- add or update tests for new or changed behavior
- ensure relevant tests pass
- follow the rules in this document
- avoid unnecessary architectural drift
- summarize any intentional deviations