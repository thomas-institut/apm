# Typescript Development 


## Rules

- Do not use `any`.
- Prefer `async`/`await`.
- Use `Record<string, T>` instead of index-signature object types where applicable.
- Use camelCase for functions and methods.
- Use PascalCase for classes, interfaces, types, and constants.
- If a function or method needs 4 or more parameters, use a typed options object instead.

Example:

- `function foo(options: FooOptions)`