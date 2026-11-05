import assert from 'node:assert/strict';
import {once} from 'node:events';
import express from 'express';
import {test} from 'node:test';

import {createErrorHandler} from '../dist/apm/node-service/src/util/createErrorHandler.js';

test('logs async route errors and returns a plain-text 500', async () => {
  const loggedErrors = [];
  const app = express();
  app.post('/api/typeset', async () => {
    throw new RangeError('offset out of range');
  });
  app.use(createErrorHandler({
    error: (message) => loggedErrors.push(message),
  }));

  const server = app.listen(0);
  try {
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/typeset`,
      {method: 'POST'},
    );
    assert.equal(response.status, 500);
    assert.match(response.headers.get('content-type') ?? '', /^text\/plain/);
    assert.equal(await response.text(), 'Internal Server Error');
    assert.equal(loggedErrors.length, 1);
    assert.match(loggedErrors[0], /RangeError: offset out of range/);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});