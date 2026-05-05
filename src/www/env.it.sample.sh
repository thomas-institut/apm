# Integration test environment variables for
# test/js/Api/ApmApiClient.integration.test.ts
#
# Make a copy of this file as, e.g., .env.it and edit it with valid data
# Run Api integration test with
#  npm run api-integration-test

# shellcheck disable=SC2034

# Set to 1 to enable integration tests (otherwise the suite is skipped).
IT_RUN=1

# Fixture person ID used by getPersonEssentialData(...).
IT_PERSON_ID=1001

# Fixture work ID (string) used by work/chunk/collation-table API calls.
IT_WORK_ID='W0001'

# Fixture document ID used by getDocumentInfo(...).
IT_DOC_ID=2001

# Fixture page ID used by getPageInfo(...).
IT_PAGE_ID=3001

# Fixture chunk number used by getCollationTablesForChunk(...).
IT_CHUNK_NUMBER=1

# Authentication option A (recommended for CI): pre-generated bearer token.
# If this is set and not an empty string, IT_USERNAME/IT_PASSWORD are not required.
# Tests will fail, of course, if the token is not valid!
IT_BEARER_TOKEN='replace-with-valid-token'

# Authentication option B (fallback): credentials used for apiLogin(...)
# when IT_BEARER_TOKEN is empty/unset.
# IT_USERNAME='replace-with-test-username'
# IT_PASSWORD='replace-with-test-password'