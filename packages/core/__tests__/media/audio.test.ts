import { buildEnhanceChain } from '../../src/media/audio/enhance';

describe('sdk.media.audio enhance', () => {
  it.skipIf(typeof AudioContext === 'undefined')(
    'buildEnhanceChain wires nodes when AudioContext exists',
    () => {
    const ctx = new AudioContext();
    const chain = buildEnhanceChain(ctx, 'messenger_voice');
    expect(chain.input).toBeDefined();
    expect(chain.output).toBeDefined();
    void ctx.close();
    },
  );
});
