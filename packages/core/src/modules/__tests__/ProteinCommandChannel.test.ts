/**
 * R32 — soft success:false on /commands/* must throw in the SDK channel.
 */
import { assertProteinCommandResponseOk } from '../ProteinCommandChannel';

describe('assertProteinCommandResponseOk (R32)', () => {
  it('allows success true / missing success', () => {
    expect(() => assertProteinCommandResponseOk({ success: true })).not.toThrow();
    expect(() => assertProteinCommandResponseOk({ result: {} })).not.toThrow();
    expect(() => assertProteinCommandResponseOk(null)).not.toThrow();
  });

  it('throws on success false', () => {
    expect(() =>
      assertProteinCommandResponseOk({ success: false, error: 'protein_dirty_flush_failed' }),
    ).toThrow(/protein_dirty_flush_failed/);
  });

  it('throws on dirty flushed false (R35)', () => {
    expect(() =>
      assertProteinCommandResponseOk({
        success: true,
        result: { flushed: false, dirty: true, commit_mode: 'dirty' },
      }),
    ).toThrow(/protein_delta_not_flushed/);
  });
});
