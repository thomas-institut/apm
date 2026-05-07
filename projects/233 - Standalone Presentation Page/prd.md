# PRD: Standalone Presentation Page

## 1. Introduction

We need a standalone page/app to show handpicked transcriptions and multi-chunk editions from the Averroes Project. This
will constitute in effect, the first, very rudimentary version of DARE 3.0, but for the purposes of this project we will
call it the **Averroes Presentation Environment** (APE).

## 2. Goals

When this project is finished:

- There can be multiple APE instances. 
- Project managers are be able to choose specific versions of document transcriptions and multi-chunk editions for
  presentation in a particular APE instance.
- It not necessary to have a user UI to do this in the APM at this time. For this initial version it is only required
  that a system administrator can manually tag the versions with a CLI tool.
- A chosen transcription or edition is be considered as *published* in APE. Any APM resource that can be published in
  APE is called a **Publishable Entity** in APM and any such entity that is indeed published is called a **Publication**
  in both systems.
- APE communicates via an API with APM in order to receive the list of publications and to get publication's data needed
  for display.
- APE keeps track of publications and updates them as they change in APM. The delay between tagging a publishable
  entity as published in APM and its appearance in APE is to be kept as short as possible but anything in the order of
  a few minutes is acceptable for this initial version.
- APE maintains a copy of publications so that APE does not require APM to be available to display publications.
- APE displays published transcriptions with or without accompanying document images.
- APE displays editions as main text with apparatuses in side tabs (like a read-only simplified EditionComposer). 
- Published editions in APE can have an attached PDF for download. For this version this PDF can be added manually.


#### Long Term Goals

Eventually APE will be able to do much more:

- Support publication versioning: that is, display different versions of a publication.
- Supports text search.
- Provide immutable URLs for publications so that they can be properly cited.
- Allow displaying data from multiple APM instances and multiple projects within them.
- Support all types of publishable entities currently in DARE: full texts, document metadata, bibliographical entries.
- Allow for extensive UI configuration including themes, multiple presentation styles for different kinds of publications.
- To have users that can mark publications, add notes, etc.

## 3. System Architecture

APE follows the same general architecture of APM but with stricter constraints.
- a PHP backend with a MySQL database and a Valkey cache, workers for offline jobs.
- A frontend consisting of an SPA done entirely in React using Typescript.

## 4. Test specifications

## 5. Deployment