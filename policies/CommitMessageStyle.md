# Commit Message Style Guide

Commit messages should make project history easy to scan, understand, and debug.

The general guidelines are:
- Prefer **small, focused commits**.
- Make each commit represent **one logical change**.
- Write messages so they read naturally after:
    - **If applied, this commit will ...**

## Format

Use this structure:

- text: Short summary in imperative mood
- Optional body with context, rationale, or notes.
- Optional footer for issue references or breaking changes.

Example with all parts:

```
Refactor session cache invalidation

Move cache invalidation into SessionService so cleanup happens
consistently after both logout and token expiration.

Fixes #123
```

## Subject line rules

- Use the **imperative mood**:
    - `Add login validation`
    - `Fix session timeout handling`
    - `Refactor API error mapping`
- Do **not** use vague summaries:
    - `Updates`
    - `Fixes`
    - `Misc changes`
- Keep the subject line short:
    - Aim for **50 characters** (maximum **72 characters**)
- Capitalize the first word.
- Do not end the subject line with a period.

## Body rules

Add a body when the change is not obvious from the diff alone.

Use the body to explain:
- **why** the change was made
- important implementation context
- side effects, tradeoffs, or limitations

Keep body lines readable and reasonably short.

Bullets are allowed in the body when they make the message easier to scan.

## Footer

Use the footer for references or special notes.



