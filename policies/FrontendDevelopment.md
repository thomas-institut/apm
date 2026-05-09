# Frontend Development

All new UI must be written in React using Typescript. See [Typescript Development](TypescriptDevelopment.md)

## React Rules

- All new UI must be written in React.
- Use one component per file.
- Use functional components only. Follow this pattern: `export default function MyComponent(props: MyComponentProps) { ... }`
- Use PascalCase for component names.
- Define props with a typed interface.
- Prefer existing reusable components before creating new ones.
- Use `useContext(AppContext)` to access app context.
- Do not pass context as a prop.
- Do not pass JSX-producing functions as props; create a component instead.
- Remember to only use `ApmApiClient` for backend communication.
- Check for and fix state update loops.


## APM 

### Frontend - Backend Communication

- Always use `ApmApiClient` for backend communication from the frontend, never make direct HTTP requests.
- If any interface or method that is involved with communication with the backend is changed, add or update API
  client integration tests. Try to make the test run without problems, but be aware that successful testing may require
  coordination with the user because specific environment variables and data in the test environment may need to be
  added manually.

### Testing Rules

- Vitest tests are located in `apps/apm/src/www/test/js`.
- Mirror the source structure in the test structure.
- Use the `.test` suffix for JS/TS test files.
- Use the utility script `apm-test-js` to run all JS tests except API client integration. Fix all issues reported.
- API client integration test code is in `apps/apm/src/www/test/js/Api/ApmApiClient.integration.test.ts`. This test will not run
  unless the environment variable IT_RUN has a value of 1, which the user should have set in `apps/apm/src/www/.env.it` together
  with all the information needed for the test to run. If this file is missing and this test is needed, alert the user
  and stop; do not try to work around it. Run the test with `cd apps/apm/src/www; npm run api-integration-test`
