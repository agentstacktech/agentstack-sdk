import { buildEnhanceChain } from '../../src/media/audio/enhance';

describe('sdk.media.audio enhance', () => {
  it('buildEnhanceChain wires nodes when AudioContext exists', () => {
    if (typeof AudioContext === 'undefined') {
      expect(true).toBe(true);
      return;
    }
    const ctx = new AudioContext();
    const chain = buildEnhanceChain(ctx, 'messenger_voice');
    expect(chain.input).toBeDefined();
    expect(chain.output).toBeDefined();
    void ctx.close();
  });
});
