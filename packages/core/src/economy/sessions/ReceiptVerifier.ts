import { verifyAgentCoinMerkleProof } from '../../atoms/agentcoinProof';
import type { ProofClient } from '../clients/ProofClient';

export interface ReceiptVerifyResult {
  proofOk: boolean;
  signatureOk: boolean;
  anchorStatus?: string;
  errors: string[];
  raw: Record<string, unknown>;
}

export class ReceiptVerifier {
  constructor(private readonly proofs: ProofClient) {}

  async verifyRunOutput(
    projectId: number,
    output: Record<string, unknown>,
    opts?: { anchorClaim?: Record<string, unknown> },
  ): Promise<ReceiptVerifyResult> {
    const receipt = output.receipt;
    const declared_hash =
      typeof output.receipt_hash === 'string' ? output.receipt_hash : undefined;
    if (!receipt || typeof receipt !== 'object') {
      return {
        proofOk: false,
        signatureOk: false,
        errors: ['missing output.receipt'],
        raw: {},
      };
    }
    const raw = await this.proofs.verifyReceipt(projectId, {
      receipt: receipt as Record<string, unknown>,
      declared_hash,
      anchor_claim: opts?.anchorClaim,
    });
    const errors: string[] = [];
    if (Array.isArray(raw.errors)) {
      for (const e of raw.errors) {
        if (typeof e === 'string') errors.push(e);
      }
    }
    return {
      proofOk: raw.proof_ok === true,
      signatureOk: raw.signature_ok === true,
      anchorStatus: typeof raw.anchor_status === 'string' ? raw.anchor_status : undefined,
      errors,
      raw,
    };
  }

  async verifyPurchaseMerkleLocally(proof: {
    leaf: string;
    path: { sibling: string; position: 'left' | 'right' }[];
    root: string;
  }): Promise<boolean> {
    return verifyAgentCoinMerkleProof(proof);
  }
}
