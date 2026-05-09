# PHP Development

## Coding Rules

- Add a documentation comment for every generated function and class method.
- Add or update unit tests for every generated function and class method.

## Testing Rules

- PHPUnit tests are located in `src/www/test/php`.
- Mirror the source structure in the test structure.
- Use the `Test` suffix for PHP test files.
- Run PHP tests in the development Docker environment, not on the host machine.
- Use the utility script `dev-test-php` to run all PHP tests, fix any issue reported (e.g. notices, warnings, etc)
- Pay attention to calls to createMock() for test doubles with no expectations configured, use createStub() instead.
