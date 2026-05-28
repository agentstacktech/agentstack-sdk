/**
 * Merkle inclusion verifier — byte-compatible with Python ``verify_merkle_proof``
 * in ``shared/atoms/agentcoin_atoms.py``.
 *
 * Gene: ``shared.atoms.agentcoin.gen1``
 */

export type AgentCoinProofStep = { sibling: string; position: 'left' | 'right' };

function hexToBytes(hex: string): Uint8Array {
  const h = hex.trim().toLowerCase();
  if (h.length % 2 !== 0 || !/^[0-9a-f]+$/.test(h)) {
    throw new Error('invalid hex');
  }
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < h.length; i += 2) {
    out[i / 2] = parseInt(h.slice(i, i + 2), 16);
  }
  return out;
}

function bytesToHex(buf: Uint8Array): string {
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const g = globalThis as unknown as { crypto?: Crypto };
  if (!g.crypto?.subtle) {
    throw new Error('WebCrypto subtle.digest unavailable');
  }
  // `Uint8Array<ArrayBufferLike>` is not accepted by TS 5.7+ subtle.digest overloads; runtime value is valid BufferSource.
  return new Uint8Array(await g.crypto.subtle.digest('SHA-256', data as unknown as BufferSource));
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/**
 * Return true iff walking ``path`` from ``leaf`` (64 hex) reaches ``root`` (64 hex).
 */
export async function verifyAgentCoinMerkleProof(args: {
  leaf: string;
  path: AgentCoinProofStep[];
  root: string;
}): Promise<boolean> {
  try {
    let cur = hexToBytes(args.leaf);
    const exp = args.root.trim().toLowerCase();
    if (exp.length !== 64 || !/^[0-9a-f]+$/.test(exp)) {
      return false;
    }
    for (const step of args.path) {
      const sib = hexToBytes(step.sibling);
      if (step.position === 'right') {
        cur = await sha256(concat(cur, sib));
      } else if (step.position === 'left') {
        cur = await sha256(concat(sib, cur));
      } else {
        return false;
      }
    }
    return bytesToHex(cur) === exp;
  } catch {
    return false;
  }
}
