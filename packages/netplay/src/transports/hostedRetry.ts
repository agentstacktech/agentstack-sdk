/**
 * Hosted script.run retry policy — same contract as sdk.commerce.hosted hostedRecoverable (Wave N4).
 * Netplay stays peer-only on @agentstack/sdk; list kept in sync via hostedRecoverable.ts in core.
 * Gene: sdk.netplay.gen1 · sdk.commerce.hosted.gen1
 */

import {
  HOSTED_MCP_RECOVERABLE_CODES,
  hostedMcpRetryDelayMs,
  isHostedMcpRecoverableCode,
  sleepMs,
} from '../../../core/src/commerce/hosted/hostedRecoverable.js';

export {
  HOSTED_MCP_RECOVERABLE_CODES,
  hostedMcpRetryDelayMs,
  isHostedMcpRecoverableCode as hostedMcpRecoverableCode,
  sleepMs,
};