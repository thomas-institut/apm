import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';
import {ApiClient} from '../../src/Api/ApiClient';

function mockJsonResponse(payload: unknown, init?: { ok?: boolean; status?: number; statusText?: string }) {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    statusText: init?.statusText ?? 'OK',
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

describe('ApiClient', () => {
  const baseUrl = 'http://example.test/api';

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns backend info for /info', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(
      mockJsonResponse({
        result: 'Success',
        timeStamp: 123,
        backendInfo: {
          name: 'APE backend',
          version: '1.0.0',
          versionDate: '2026-01-01',
        },
      }),
    );

    const client = new ApiClient().withBaseUrl(baseUrl);
    const response = await client.getBackendInfo();

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/info`);
    expect(response).toEqual({
      result: 'Success',
      httpStatus: 200,
      timestamp: 123000,
      data: {
        name: 'APE backend',
        version: '1.0.0',
        versionDate: '2026-01-01',
      },
    });
  });

  it('returns API error payload when publication list endpoint responds with Error', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(
      mockJsonResponse({
        result: 'Error',
        timeStamp: 456,
        message: 'Oops',
        httpStatus: 500,
      }, {ok: false, status: 500, statusText: 'Internal Server Error'}),
    );

    const client = new ApiClient().withBaseUrl(baseUrl);
    const response = await client.getPublicationListings();

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/publication/list`);
    expect(response).toEqual({
      result: 'Error',
      message: 'Oops',
      httpStatus: 500,
      timestamp: 456000,
    });
  });

  it('returns fetch errors without throwing', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockRejectedValue(new Error('Network down'));

    const client = new ApiClient().withBaseUrl(baseUrl);
    const response = await client.getPublicationData(99);

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/publication/99/get`);
    expect(response.result).toBe('Error');
    expect(response.message).toBe('Network down');
    expect(response.httpStatus).toBe(0);
  });

  it('returns publication last update value', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(
      mockJsonResponse({
        result: 'Success',
        timeStamp: 789,
        apmLastUpdate: 555,
      }),
    );

    const client = new ApiClient().withBaseUrl(baseUrl);
    const response = await client.getPublicationLastUpdate();

    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/publication/lastUpdate`);
    expect(response).toEqual({
      result: 'Success',
      httpStatus: 200,
      timestamp: 789000,
      data: 555000,
    });
  });
});
