import {
  resolveAgentStackApiBase,
  AGENTSTACK_PRODUCTION_API_BASE,
  AGENTSTACK_DEV_API_BASE,
} from '../../src/config/agentstackEndpoints';

describe('agentstackEndpoints', () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  it('defaults to production api base', () => {
    delete process.env.AGENTSTACK_API_BASE;
    expect(resolveAgentStackApiBase()).toBe(AGENTSTACK_PRODUCTION_API_BASE);
  });

  it('respects AGENTSTACK_API_BASE', () => {
    process.env.AGENTSTACK_API_BASE = 'http://localhost:8000/api';
    expect(resolveAgentStackApiBase()).toBe(AGENTSTACK_DEV_API_BASE);
  });

  it('override wins over env', () => {
    process.env.AGENTSTACK_API_BASE = 'http://localhost:8000/api';
    expect(resolveAgentStackApiBase('https://custom.example/api')).toBe('https://custom.example/api');
  });
});
