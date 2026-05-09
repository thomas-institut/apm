# General Guidelines

## Core Rules

- Follow the existing structure and naming conventions of the local area.
- Avoid broad refactors unless explicitly required by the task. This is a project developed and maintained mostly by a
  single person: new dependencies, new programming languages, new data formats and the like should generally be avoided
  unless they have a big positive impact in the codebase. If a new dependency or an structural change makes the
  code and the production environment easier to maintain, make a case of it and put it up for discussion.
- Prefer small, safe, task-focused changes.
- Reuse existing abstractions and components whenever practical.
- Document intentional exceptions in the task summary.

## Legacy Areas

- Do not introduce new legacy patterns for new UI when React is a reasonable option.
- Keep fixes scoped and safe.
- Prefer incremental migration over large rewrites unless explicitly requested.

