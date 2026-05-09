# AGENTS.md

This document defines the required working rules for contributors and automated coding agents in this repository.

If local code differs from these guidelines, follow mandatory rules in this document first. Otherwise, prefer
consistency with the surrounding code and avoid unnecessary refactors.

## Project Summary

This repository is a monorepo for two main apps: APM and APE. 

APM is a system that allow users to create manuscripts transcriptions and critical editions.  APE is a presentation
app for APM generated data.

APM consists of:
- a PHP web application for API handling and frontend serving
- a TypeScript/React frontend
- a background daemon and workers for periodic tasks
- a Node.js service for typesetting and PDF generation

APE consists of:
- a PHP backend
- a React frontend

Infrastructure used by the project:

- MySQL
- Valkey
- Typesense

## Development Environment

Development services run in Docker containers

## Repository Layout

- `apps`: apps and shared PHP and TS libraries
- `docker`: Docker container generation for development
- `docs`: various general documentation files and files related to specific issues from Github Issues. Use only if instructed to do so.
- `policies`: code policies
- `scripts`: various scripts for testing and distribution tar file creation


### APM

Root Folder: `apps/apm` 

(paths below given in relation to APM's root folder)

Frontend and backend are served by PHP app:

- Main PHP code: `src/www/classes`
- API code: `src/www/classes/APM/Api`
- Frontend-serving PHP code: `src/www/classes/APM/Site`
- Daemon code: `src/www/classes/APM/ApmDaemon`
- Workers code: `src/www/classes/APM/ApmWorker`
- CLI utilities: `src/www/classes/APM/CommandLine`
- Utility scripts: `src/www/utilities`

Frontend code:

- JavaScript/TypeScript code: `src/www/js`
- React SPA: `src/www/js/ReactAPM`

Typesetting service:

- Service code: `src/www/typesetting-service`

### APE

Split into separate backend and frontend:
- Backend: `apps/ape-backend`
- Fronted: `apps/ape-frontend`

## Guidelines and Policies

Refer to the following documents for detailed guidelines and policies:

- [General Guidelines](policies/GeneralGuidelines.md)
- [PHP Development](policies/PHPDevelopment.md)
- [Frontend Development](policies/FrontendDevelopment.md)
- [Commit Message Style](policies/CommitMessageStyle.md)

## Task Completion Requirements

Before finishing a task:

- add or update tests for new or changed behavior
- ensure relevant tests pass
- follow the rules in this document
- avoid unnecessary architectural drift
- summarize any intentional deviations
