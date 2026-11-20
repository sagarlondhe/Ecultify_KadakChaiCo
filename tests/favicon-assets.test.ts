import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { GET as getIco } from '../app/favicon.ico/route.ts';
import { GET as getPng } from '../app/favicon.png/route.ts';

describe('favicon image routes', () => {
  it('serves a valid PNG icon', async () => {
    const response = getPng();
    const bytes = new Uint8Array(await response.arrayBuffer());

    assert.equal(response.headers.get('content-type'), 'image/png');
    assert.deepEqual(Array.from(bytes.slice(0, 8)), [
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
  });

  it('serves an ICO containing the PNG favicon', async () => {
    const response = getIco();
    const bytes = new Uint8Array(await response.arrayBuffer());

    assert.equal(response.headers.get('content-type'), 'image/x-icon');
    assert.deepEqual(Array.from(bytes.slice(0, 6)), [0, 0, 1, 0, 1, 0]);
    assert.deepEqual(Array.from(bytes.slice(22, 30)), [
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
  });
});
