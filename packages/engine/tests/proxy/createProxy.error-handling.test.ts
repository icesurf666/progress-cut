import { describe, it, expect } from 'vitest';
import { createProxy } from '../../src/proxy/createProxy.js';
import './createProxyFixtures.js';

describe('createProxy — error handling', () => {
  it('throws on corrupted input buffer', async () => {
    const garbage = Buffer.from('this is not image data at all');
    await expect(createProxy(garbage)).rejects.toThrow();
  });

  it('throws on non-existent file path', async () => {
    await expect(createProxy('/nonexistent/path/frame.png')).rejects.toThrow();
  });

  it('throws on empty buffer', async () => {
    await expect(createProxy(Buffer.alloc(0))).rejects.toThrow();
  });
});
