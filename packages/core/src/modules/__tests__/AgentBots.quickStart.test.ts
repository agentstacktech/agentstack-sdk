import { describe, expect, it, jest } from '@jest/globals';

import { AgentBots } from '../AgentBots';
import type { HTTPClient } from '../client/http-client';

describe('AgentBots.quickStartCreate', () => {
  it('maps use case to template and posts create body', async () => {
    const post = jest.fn().mockResolvedValue({ data: { bot: { uuid: 'b1' } } });
    const client = { post } as unknown as HTTPClient;
    const bots = new AgentBots(client);

    await bots.quickStartCreate(7, {
      channel: 'telegram',
      useCase: 'store',
      name: 'Shop bot',
      variables: { store_url: 'https://x.test/s/7/' },
    });

    expect(post).toHaveBeenCalledWith('/projects/7/bots', {
      name: 'Shop bot',
      brain_mode: 'echo',
      template_id: 'store_front',
      template_variables: { store_url: 'https://x.test/s/7/' },
    });
  });
});
