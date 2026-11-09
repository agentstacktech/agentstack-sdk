/**
 * Client mirror of `shared/atoms/public_form_intake.py` (DRY codes, fail-fast).
 * Genetic: core.crm.hub.gen1
 */

/** Keep in sync with Python MESSAGE_MAX */
export const PUBLIC_FORM_MESSAGE_MAX = 4000;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type PublicFormValidationCode =
  | 'invalid_name'
  | 'invalid_email'
  | 'invalid_message'
  | 'message_too_long';

export function validatePublicFormFields(input: {
  name: string;
  email: string;
  message: string;
}): PublicFormValidationCode | null {
  if (!String(input.name ?? '').trim()) return 'invalid_name';
  if (!EMAIL_RE.test(String(input.email ?? '').trim())) return 'invalid_email';
  if (!String(input.message ?? '').trim()) return 'invalid_message';
  if (String(input.message).length > PUBLIC_FORM_MESSAGE_MAX) return 'message_too_long';
  return null;
}

export class PublicFormValidationError extends Error {
  readonly code: PublicFormValidationCode;

  constructor(code: PublicFormValidationCode) {
    super(code);
    this.code = code;
    this.name = 'PublicFormValidationError';
  }
}
