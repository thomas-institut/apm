# Typescript Development 

## Rules

- Do not use `any`.
- Prefer `async`/`await`.
- Use `Record<string, T>` instead of index-signature object types where applicable.
- Use camelCase for functions and methods.
- Use PascalCase for classes, interfaces, types, and exported constants.
- Use a typed options object for functions or methods with 4 or more parameters.

Example:

- `function foo(options: FooOptions)`