import { ServerError } from '../../types/shared/HTTPTypes';
import {
  GENERATION_PREFERRED_ENV_BLOCKED,
  callWithEnvUuidRetry,
  isStaleEnvUuidError,
  omitEnvUuid,
  omitSandboxEnvKeys,
} from '../envUuidRetry';

describe('envUuidRetry', () => {
  it('isStaleEnvUuidError matches MCP error_code', () => {
    expect(
      isStaleEnvUuidError({ error_code: GENERATION_PREFERRED_ENV_BLOCKED }),
    ).toBe(true);
  });

  it('isStaleEnvUuidError matches preferred env message', () => {
    expect(
      isStaleEnvUuidError(
        new ServerError('Preferred generation env env-old is not open (status=realigned)', 403),
      ),
    ).toBe(true);
  });

  it('isStaleEnvUuidError matches axios-style body', () => {
    expect(
      isStaleEnvUuidError({
        response: {
          data: {
            error_code: GENERATION_PREFERRED_ENV_BLOCKED,
          },
        },
      }),
    ).toBe(true);
  });

  it('isStaleEnvUuidError rejects sandbox plan limits', () => {
    expect(
      isStaleEnvUuidError({
        response: {
          data: {
            detail: { error: 'sandbox_limit_exceeded', message: 'limit' },
          },
        },
      }),
    ).toBe(false);
  });

  it('omitSandboxEnvKeys strips env_uuid and generation_env_uuid', () => {
    expect(
      omitSandboxEnvKeys({
        env_uuid: 'a',
        generation_env_uuid: 'b',
        project_id: 1,
      }),
    ).toEqual({ project_id: 1 });
  });

  it('omitEnvUuid is an alias', () => {
    expect(omitEnvUuid({ env_uuid: 'x', keep: true })).toEqual({ keep: true });
  });

  it('callWithEnvUuidRetry retries once after stale env', async () => {
    const onStaleEnv = jest.fn();
    const call = jest
      .fn()
      .mockRejectedValueOnce({ error_code: GENERATION_PREFERRED_ENV_BLOCKED })
      .mockResolvedValueOnce({ ok: true });

    const result = await callWithEnvUuidRetry(
      call,
      { env_uuid: 'stale', project_id: 1 },
      { onStaleEnv },
    );

    expect(result).toEqual({ ok: true });
    expect(call).toHaveBeenCalledTimes(2);
    expect(call.mock.calls[1][0]).toEqual({ project_id: 1 });
    expect(onStaleEnv).toHaveBeenCalledTimes(1);
  });

  it('callWithEnvUuidRetry does not retry without env_uuid', async () => {
    const call = jest.fn().mockRejectedValueOnce({ error_code: GENERATION_PREFERRED_ENV_BLOCKED });

    await expect(callWithEnvUuidRetry(call, { project_id: 1 })).rejects.toEqual({
      error_code: GENERATION_PREFERRED_ENV_BLOCKED,
    });
    expect(call).toHaveBeenCalledTimes(1);
  });
});
