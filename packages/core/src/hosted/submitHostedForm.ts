/** Public hosted-site form intake (arch-public-form-intake / arch-react-sdk-hooks). */

import { PublicFormValidationError, validatePublicFormFields } from './publicFormIntake';

export type SubmitHostedFormInput = {
  name: string;
  email: string;
  message: string;
  formId?: string;
  website?: string;
};

export type SubmitHostedFormResult = {
  ok: boolean;
  inquiry_id: string;
  contact_id?: string;
  status: string;
  project_id: number;
};

export type HostedFormIntakeErrorDetail = {
  code: string;
  recovery?: Record<string, unknown>;
};

/** Parity with Work Graph error packets (G-3-02). */
export type WorkGraphErrorPacket = {
  error_code: string;
  recovery?: Record<string, unknown>;
};

export class HostedFormIntakeError extends Error {
  readonly code: string;
  readonly recovery?: Record<string, unknown>;

  constructor(detail: HostedFormIntakeErrorDetail) {
    super(`form_intake_failed:${detail.code}`);
    this.name = 'HostedFormIntakeError';
    this.code = detail.code;
    this.recovery = detail.recovery;
  }
}

/**
 * POST /api/public/projects/{projectId}/form-intake — no auth; honeypot via `website`.
 */
export async function submitHostedForm(
  projectId: number,
  input: SubmitHostedFormInput,
  options?: { baseUrl?: string; fetchFn?: typeof fetch },
): Promise<SubmitHostedFormResult> {
  const validation = validatePublicFormFields(input);
  if (validation) {
    throw new PublicFormValidationError(validation);
  }
  const base = (options?.baseUrl ?? '').replace(/\/$/, '');
  const fetchFn = options?.fetchFn ?? fetch;
  const res = await fetchFn(`${base}/api/public/projects/${projectId}/form-intake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      message: input.message,
      form_id: input.formId ?? 'default',
      website: input.website,
    }),
  });
  if (!res.ok) {
    let code = `http_${res.status}`;
    let recovery: Record<string, unknown> | undefined;
    try {
      const errBody = (await res.json()) as {
        detail?: { error_code?: string; code?: string; recovery?: Record<string, unknown> } | string;
      };
      const detail = errBody?.detail;
      if (typeof detail === 'object' && detail) {
        if (detail.error_code) code = String(detail.error_code);
        else if (detail.code) code = String(detail.code);
        recovery = detail.recovery;
      } else if (typeof detail === 'string' && detail) {
        code = detail;
      }
    } catch {
      /* keep http status code */
    }
    const packet: WorkGraphErrorPacket = { error_code: code, recovery };
    throw new HostedFormIntakeError({ code: packet.error_code, recovery: packet.recovery });
  }
  const data = (await res.json()) as SubmitHostedFormResult;
  return data;
}
