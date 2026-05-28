import { buildMessengerClientConfigFromHttpClientConfig } from '../../src/messenger/buildMessengerClientConfig';

describe('buildMessengerClientConfigFromHttpClientConfig', () => {
  it('maps apiBase and positive projectId', () => {
    expect(
      buildMessengerClientConfigFromHttpClientConfig({
        apiBase: 'https://ex.com/api/',
        baseUrl: '',
        projectId: 7,
      })
    ).toEqual({ apiBaseUrl: 'https://ex.com/api', ecosystemProjectId: 7 });
  });

  it('falls back to baseUrl when apiBase empty', () => {
    expect(
      buildMessengerClientConfigFromHttpClientConfig({
        apiBase: '',
        baseUrl: 'https://x.org/api',
        projectId: 0,
      })
    ).toEqual({ apiBaseUrl: 'https://x.org/api', ecosystemProjectId: undefined });
  });

  it('parses numeric projectId string', () => {
    expect(
      buildMessengerClientConfigFromHttpClientConfig({
        apiBase: 'https://ex.com/api',
        baseUrl: '',
        projectId: ' 42 ',
      })
    ).toEqual({ apiBaseUrl: 'https://ex.com/api', ecosystemProjectId: 42 });
  });
});
