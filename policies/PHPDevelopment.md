# PHP Development

## Coding Rules

- Add a documentation comment for every generated function and class method.
- Add or update unit tests for every generated function and class method.

## Testing Rules

- Pay attention to calls to createMock() for test doubles with no expectations configured, use createStub() instead.
- Mirror the source structure in the test structure.
- Use the `Test` suffix for PHP test files. For example, the test file for class `MyClass` should be called `MyClassTest`.
- PHP tests need to run in each app's Docker environment. DO NOT use local PHP or composer. Use provided utility scripts.
- 

## Test Locations and Execution

- **APM**: Tests are in `apps/apm/src/www/test/php`. Use `scripts/apm-composer test` to run all tests. 
- **APE Backend**: Tests are in `apps/ape-backend/test`. Use `scripts/ape-backend-composer test` to run all tests. 

Note: Feel free to run php and composer from the containers using `docker exec` or a similar command. If you cannot
find the `docker` executable, try adding `/usr/local/bin` to your PATH.
