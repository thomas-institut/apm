# Edition Publication Plan

*29 May 2026*

The goal is, just as with transcriptions, to be able to use APM's `apectl` to publish a multi-chunk edition and then
go to APE and run `update` resulting in APE getting the data from APM, storing it and showing the edition in the
frontend.

## 1. APM Preparations

Do the following before starting to implement edition publications. This MUST be transparent from the point
of view of the user and of APE: run all tests and make sure they pass.

Check basic frontend functions: (for sure this can be automated)

-[ ] Visit all main pages: Dashboard, Docs, Works, People, Search
-[ ] Visit one document, one work, one chunk and one person.
-[ ] Visit one chunk edition, do a preview and generate a PDF. Make a change, save, run a preview again and generate a
 PDF again.
-[ ] Visit one multi-chunk edition, repeat the checks as for a chunk edition
-[ ] Create an automatic collation table, save it and open the saved one

### Refactor APM to get rid of the src directory

This is not really necessary, but before doing anything else, this might be a good time to do it.
It involves updating the docker container, the scripts, and the global NPM configuration.

After doing this, APM and APE should work as they do now.

### Refactor typesetting service in preparation for new API entry points

Make it a new app: `apm-node-service`

Move the TS code shared between it and APM's frontend to yet another new app `shared-node-ts` (or something like that).
This is also a good time to reach 90%+ test coverage on this code, but it might be too much work at this point.
Might be worthwhile creating an issue in GitHub so that it doesn't fall through the cracks.

Make sure both apm and apm-node-service build and run correctly before moving on.

### Formalize a NodeServiceApiClient in APM

That is, move all communication with the node service to a single place. Add tests for this.

## 2. Define basic EditionPublicationData in apm-publication-api

It is basically EditionInterface, but need to make sure it does not have any internal APM reference whatsoever. Later we
need to figure out how to handle those.

Make sure the API client gets tested on the new data schema and that APE works well with it, even without being able
to process editions for now.

## 3. Implement Edition publications in APM

Implement an API call in the node service that takes a multi-chunk edition, generates an edition and transforms it
into an EditionPublicationData object. This should be tested as thoroughly as possible.

In APM, implement EditionPublicationData generation for the publication API:

- Get multi-chunk edition data from storage
- Call APM-NodeService
- Hydrate an EditionPublicationData object (so that we're sure the node service is generating what it's supposed to
  generate)
- Return response

## 4. Implement Edition viewer UI in APE

Ideally, there should be two versions:
- main text with apparatus popovers
- main text on pseudo-pages, e.g. every number of lines


