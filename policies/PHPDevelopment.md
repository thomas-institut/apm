# PHP Development

## Coding Rules

- Add a documentation comment for every generated function and class method.
- Add or update unit tests for every generated function and class method.

## Testing Rules

- Pay attention to calls to createMock() for test doubles with no expectations configured, use createStub() instead.
- Mirror the source structure in the test structure.
- Use the `Test` suffix for PHP test files.
- PHP tests need to run in each app's Docker environment. Use provided utility scripts.

## Test Locations and Execution

- **APM**: Tests are in `apps/apm/src/www/test/php`. Use `scripts/apm-test-php` to run all tests.
- **APE**: Tests are in `apps/ape-backend/test`. Use `scripts/shared-php-test` to run all tests. 
