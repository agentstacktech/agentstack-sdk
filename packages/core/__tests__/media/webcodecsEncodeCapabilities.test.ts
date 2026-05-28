import { describe, expect, it } from 'vitest';
import { getWebCodecsVideoEncodeCapability } from '../../src/media/video/webcodecsEncodeCapabilities';

describe('webcodecsEncodeCapabilities', () => {
  it('returns unsupported in Node test environment', () => {
    const cap = getWebCodecsVideoEncodeCapability();
    expect(cap.supported).toBe(false);
    expect(cap.vp8Configurable).toBe(false);
  });
});
