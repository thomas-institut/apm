# PRD: Averroes Presentation Environment (APE)

## 1. Introduction

We need a standalone page/app to show handpicked transcriptions and multi-chunk editions from the Averroes Project. This
will constitute in effect, the first, very rudimentary version of DARE 3.0, but it envisaged as general system that
other projects can also deploy to present data. The new system is called  **Averroes Presentation Environment** (APE).

This PRD pertains to the first version of APE: APE alpha

## 2. Goals

When APE alpha is implemented,

- Multiple APE instances can be deployed each one capable with communicating with any single APM instance.
- Project managers in APM can choose specific versions of document transcriptions and multi-chunk editions for
  presentation in a particular APE instance.
    - It not necessary to have a user UI to do this in the APM at this time. For this initial version it is only
      required
      that a system administrator can manually tag the versions with a CLI tool.
    - Any such tagged transcription or edition in APM is designated as *published in APE*.
    - Any APM resource that can be published in APE is called a **Publishable Resource** in APM
    - Any such resource that is indeed published is called a **Publication** in both APM and APE.
- APE communicates via an authenticated API with APM in order to receive the list of publications and to get all
  publication's data needed for display.
- APE keeps track of publications and updates them as they change in APM.
    - The delay between tagging a publishable entity as published in APM and its appearance in APE is to be kept as
      short
      as possible but anything in the order of a few minutes is acceptable for this initial version.
- APE maintains a copy of publications so that it does not require its source APM instance to be online to display
  publications.
- APE displays published transcriptions with or without accompanying document images.
    - All information about the images is provided by APM
- APE displays editions as main text with apparatuses in side tabs (like a read-only simplified EditionComposer).
- Published editions in APE can have an attached PDF for download. For this version this PDF can be added manually.

#### Long Term Goals

Eventually APE will be able to do much more:

- Support publication versioning: that is, display different versions of a publication.
- Support text search.
- Provide immutable URLs for publications so that they can be properly cited.
- Allow displaying data from multiple APM instances and multiple projects within them.
- Support all types of publishable entities currently in DARE: full texts, document metadata, bibliographical entries.
- Allow for extensive UI configuration including themes, multiple presentation styles for different kinds of
  publications.
- To have users that can mark publications, add notes, etc.

## 3. System Architecture

### Changes to APM Architecture

- Add `PublicationData` structure containing APE instance id in which is published, type, resource Id (eg. document Id),
  version info, etc. Specific publication types may add other information so that the right resource and version can
  be retrieved. Each publication must have a publication Id and possibly a flag indicate its status (e.g.
  enabled/disabled)
- Add `TranscriptionPublicationData` structure containing shared data schema with APE
- Add `EditionPublicationData` structure containing shared data schema with APE
- Implement methods to generate a `TranscriptionPublicationData` out of a location: document + timestamp
- Implement methods to generate an `EditionPublication` out of a multi-chunk edition Id
- Implement storage of publications so that once data for a publication is generated it remains immutable
- Implement API
- Implement CLI tool to manage publications:
    - list
    - remove by id
    - enable/disable by id
    - update to latest resource version by id
    - add edition/transcription
    - regenerate data by id (or all): useful when data schema changes
- (Maybe) Implement UI tool to manage publications:
    - View publications page: with options to change name, description, update to latest version, etc.
    - In MCEComposer: publish/unpublish button, update to latest version button
    - In DocumentPage: publish/unpublish button, update to latest version button
    - Background job to generate/regenerate data

#### API

API calls:

- `publication/list`: returns a list of available publication Ids.
- `publication/{publicationId}`: returns the data for the given publication Id

### APE Architecture

#### Frontend

A SPA done entirely in React using Typescript

- The home page provides a list of available publications with basic info
- Each publication opens in its own viewer, there may be different viewers for every publication type.

For simplicity frontend code should work with the same basic data structures: `Publication`,
`TranscriptionPublicationData`
and `EditionPublicationData`

Transcription Viewer:

- Full text by chunk or by page (with or without line breaks)
- Page by page with or without side image.

Edition Viewer:

- Main text only
- Interactive view

#### Backend

PHP Slim app just as APM:

- MySQL database to store publication data permanently
- Valkey cache to speed things up
- No user support for now

The API mirrors the APM publications API, but uses locally stored versions of the data.

APM sync background process every few minutes:

- get available publications and determines changes
    - add new publication
    - remove publication now unavailable
    - updates existing publication
- changes must be commited atomically so that the frontend never gets an inconsistent state

Since the number of publications is expected to be quite small as well as their data, it could very well be that
for this alpha version no Valkey caching is necessary.

#### Database

One table with publication data:

- id
- data: json text

## 4. Test specifications

Every new code, both PHP and TS, must have unit tests.

## 5. Deployment

APE alpha will be deployed in the same machine as the production APM under a different folder (e.g.,
averroes.com/publications).

## 6. Open Questions and Challenges

- Published editions may require an edition generation step that practically speaking can only be done with TS code (not
  PHP), so an edition generator service might be needed in APM's backend.
- Should APE be deployed using Docker containers?