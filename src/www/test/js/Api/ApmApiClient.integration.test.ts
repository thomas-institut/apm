/**
 * @vitest-environment happy-dom
 */

import 'fake-indexeddb/auto';
import {beforeAll, describe, expect, it} from 'vitest';
import {ApmApiClient} from '@/Api/ApmApiClient';
import {urlGen} from "@/pages/common/SiteUrlGen";

interface IntegrationFixtureIds {
  personId: number;
  workId: string;
  docId: number;
  pageId: number;
  chunkNumber: number;
}

const shouldRunIntegration = process.env.IT_RUN === '1';
const integrationDescribe = shouldRunIntegration ? describe : describe.skip;

let bearerToken: string | null = process.env.IT_BEARER_TOKEN ?? null;

if (bearerToken === '') {
  bearerToken = null;
}

function requireNumberFromEnv(name: string): number {
  const rawValue = process.env[name];
  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    throw new Error(`Missing or invalid environment variable ${name}`);
  }
  return value;
}

function requireStringFromEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

function getFixtureIds(): IntegrationFixtureIds {
  return {
    personId: requireNumberFromEnv('IT_PERSON_ID'),
    workId: requireStringFromEnv('IT_WORK_ID'),
    docId: requireNumberFromEnv('IT_DOC_ID'),
    pageId: requireNumberFromEnv('IT_PAGE_ID'),
    chunkNumber: requireNumberFromEnv('IT_CHUNK_NUMBER')
  };
}

function createAuthenticatedClient(): ApmApiClient {

  const backEndUrl = requireStringFromEnv('IT_BACKEND_URL');
  urlGen.setBase(backEndUrl);

  return new ApmApiClient('it-apm-api-client')
    .withBearerAuthentication(
      async () => bearerToken,
      async (token: string) => { bearerToken = token; })
  .withVerbose(false);
}

function assertObject(data: unknown): asserts data is Record<string, unknown> {
  expect(data).toBeTypeOf('object');
  expect(data).not.toBeNull();
}

function assertPersonEssentialData(data: unknown): void {
  assertObject(data);
  expect(typeof data.tid).toBe('number');
  expect(typeof data.name).toBe('string');
  expect(typeof data.sortName).toBe('string');
  expect(Array.isArray(data.extraAttributes)).toBe(true);
  expect(Array.isArray(data.userTags)).toBe(true);
  expect(typeof data.isUser).toBe('boolean');
  expect(typeof data.userEmailAddress).toBe('string');
}

function assertWorkData(data: unknown): void {
  assertObject(data);
  expect(typeof data.workId).toBe('string');
  expect(typeof data.entityId).toBe('number');
  expect(typeof data.authorId).toBe('number');
  expect(typeof data.title).toBe('string');
  expect(typeof data.shortTitle).toBe('string');
  expect(typeof data.enabled).toBe('boolean');
}

function assertDocInfo(data: unknown): void {
  assertObject(data);
  expect(typeof data.id).toBe('number');
  expect(typeof data.title).toBe('string');
  expect(typeof data.imageSource).toBe('number');
  expect(typeof data.imageSourceData).toBe('string');
  expect(typeof data.language).toBe('number');
  expect(typeof data.type).toBe('number');
}

integrationDescribe('ApmApiClient integration', () => {
  const fixtureIds = shouldRunIntegration ? getFixtureIds() : null;

  beforeAll(async () => {
    const client = createAuthenticatedClient();
    await client.initialize();

    if (bearerToken === null) {
      console.log(`Bearer token is not set. Attempting authentication with username and password...`);
      const username = requireStringFromEnv('IT_USERNAME');
      const password = requireStringFromEnv('IT_PASSWORD');
      const loginOk = await client.apiLogin(username, password, true);
      expect(loginOk).toBe(true);
      console.log(`Authentication successful for user '${username}'`);
      console.log(`Bearer token is '${bearerToken}'`);
      console.log(`Consider copying it to the environment variable IT_BEARER_TOKEN to reuse in subsequent tests`);
    }
    const whoAmI = await client.whoAmI();
    if (whoAmI === null) {
      throw new Error(`Failed to retrieve whoAmI information after successful login. This might indicate an issue with the API or authentication. Perhaps the environment variable IT_BEARER_TOKEN is not set correctly.`);
    }
    // expect(whoAmI).not.toBeNull();
  });

  it('calls people/work/document endpoints with bearer authentication', async () => {
    const ids = fixtureIds as IntegrationFixtureIds;
    const client = createAuthenticatedClient();
    await client.initialize();

    const allPeopleData = await client.getAllPeopleData();
    expect(Array.isArray(allPeopleData)).toBe(true);

    const allWorksData = await client.getAllWorksData();
    expect(typeof allWorksData).toBe('object');
    expect(allWorksData).not.toBeNull();

    const personEssentialData = await client.getPersonEssentialData(ids.personId);
    assertPersonEssentialData(personEssentialData);

    const workData = await client.getWorkData(ids.workId);
    assertWorkData(workData);

    const documentInfo = await client.getDocumentInfo(ids.docId, true, false);
    assertDocInfo(documentInfo);
    expect(Array.isArray(documentInfo.pageIds)).toBe(true);

    const pageInfo = await client.getPageInfo(ids.pageId);
    assertObject(pageInfo);
    expect(typeof pageInfo.docId).toBe('number');
    expect(typeof pageInfo.pageId).toBe('number');
    expect(typeof pageInfo.pageNumber).toBe('number');
  });

  it('calls chunk and collation-table related endpoints', async () => {
    const ids = fixtureIds as IntegrationFixtureIds;
    const client = createAuthenticatedClient();
    await client.initialize();

    const chunksWithTranscription = await client.getWorkChunksWithTranscription(ids.workId);
    assertObject(chunksWithTranscription);
    expect(typeof chunksWithTranscription.workId).toBe('string');
    expect(Array.isArray(chunksWithTranscription.chunks)).toBe(true);

    const chunkInfo = await client.getChunksInWorkInfo(ids.workId);
    expect(Array.isArray(chunkInfo)).toBe(true);
    chunkInfo.forEach((chunk) => {
      expect(typeof chunk.workId).toBe('string');
      expect(typeof chunk.chunkNumber).toBe('number');
      expect(typeof chunk.hasTranscriptions).toBe('boolean');
      expect(typeof chunk.hasCollationTables).toBe('boolean');
      expect(typeof chunk.hasEditions).toBe('boolean');
    });

    const collationTablesForChunk = await client.getCollationTablesForChunk(ids.workId, ids.chunkNumber);
    expect(Array.isArray(collationTablesForChunk)).toBe(true);
    collationTablesForChunk.forEach((table) => {
      expect(typeof table.workId).toBe('string');
      expect(typeof table.chunkNumber).toBe('number');
      expect(typeof table.tableId).toBe('number');
      expect(typeof table.authorId).toBe('number');
      expect(typeof table.lastSave).toBe('string');
      expect(typeof table.title).toBe('string');
      expect(['edition', 'ctable']).toContain(table.type);
    });
  });
});
