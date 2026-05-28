import { verifyAgentCoinMerkleProof } from '../../src/atoms/agentcoinProof';

describe('verifyAgentCoinMerkleProof', () => {
  it('matches Python fixture for two leaves', async () => {
    const leaf = 'aa'.repeat(32);
    const root = 'e2d80f78d79027556d6619a1400605abbdca6bb6eb24e0831e33ecd5466fa5f6';
    const path = [
      {
        sibling: 'bb'.repeat(32),
        position: 'right' as const,
      },
    ];
    await expect(verifyAgentCoinMerkleProof({ leaf, path, root })).resolves.toBe(true);
  });

  it('matches Python fixture for four leaves (index 0)', async () => {
    const leaf = 'aa'.repeat(32);
    const root = '81952b5c47f0703b5f2543a6dde2be50c5271e327c438e85c70874adf5b10e12';
    const path = [
      { sibling: 'bb'.repeat(32), position: 'right' as const },
      {
        sibling: '5855266bbab10ac48bbac9b714edf3239b2e7d572a6a9f6d1da0a53cbfa7be0e',
        position: 'right' as const,
      },
    ];
    await expect(verifyAgentCoinMerkleProof({ leaf, path, root })).resolves.toBe(true);
  });

  it('rejects tampered root', async () => {
    const leaf = 'aa'.repeat(32);
    const path = [{ sibling: 'bb'.repeat(32), position: 'right' as const }];
    await expect(verifyAgentCoinMerkleProof({ leaf, path, root: 'f'.repeat(64) })).resolves.toBe(false);
  });
});
