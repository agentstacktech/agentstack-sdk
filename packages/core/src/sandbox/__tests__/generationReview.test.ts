import {
  allowsAutoPromote,
  approverIds,
  generationReviewRequired,
  quorumMet,
  quorumNeeded,
  resolveApprovalMode,
} from '../generationReview';
import { roleMayWriteProduction } from '../directProd';

describe('generationReview', () => {
  it('legacy bool is at_least_one', () => {
    expect(resolveApprovalMode({ auto_generation_require_approval: true })).toBe(
      'at_least_one',
    );
    expect(resolveApprovalMode({})).toBe('off');
    expect(
      generationReviewRequired({ auto_generation_approval_mode: 'min_count' }),
    ).toBe(true);
  });

  it('min_count quorum', () => {
    const settings = {
      auto_generation_approval_mode: 'min_count',
      auto_generation_approval_min_count: 2,
    };
    expect(quorumNeeded(settings, 5)).toBe(2);
    expect(
      quorumMet({ ...settings, approver_user_ids: [7] }, 5),
    ).toBe(false);
    expect(
      quorumMet({ ...settings, approver_user_ids: [7, 8] }, 5),
    ).toBe(true);
    expect(approverIds({ approver_user_ids: [7, 7, 8] })).toEqual([7, 8]);
  });

  it('min_percent rounds up', () => {
    const settings = {
      auto_generation_approval_mode: 'min_percent',
      auto_generation_approval_min_percent: 50,
    };
    expect(quorumNeeded(settings, 3)).toBe(2);
  });

  it('manual_only blocks auto promote', () => {
    expect(
      allowsAutoPromote({
        auto_generation_approval_mode: 'manual_only',
        auto_promote_on_all_pass: true,
      }),
    ).toBe(false);
    expect(allowsAutoPromote({ auto_promote_on_all_pass: true })).toBe(true);
  });
});

describe('directProd', () => {
  it('owner direct prod default', () => {
    expect(roleMayWriteProduction('owner', {})).toBe(true);
    expect(roleMayWriteProduction('member', {})).toBe(false);
    expect(roleMayWriteProduction('admin', { direct_prod_roles: ['admin'] })).toBe(
      true,
    );
    expect(roleMayWriteProduction('owner', { direct_prod_roles: [] })).toBe(false);
  });
});
