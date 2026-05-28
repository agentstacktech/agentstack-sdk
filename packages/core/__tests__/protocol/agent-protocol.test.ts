import { AgentProtocol } from '../../src/protocol/AgentProtocol';
import {
  createEntitySnapshotRepository,
  type SnapshotMeta,
} from '../../src/cache/entity-snapshot-repository';
import type { ProteinCommandChannel } from '../../src/modules/ProteinCommandChannel';
import type { HTTPClient } from '../../src/client/http-client';

describe('AgentProtocol', () => {
  it('readThroughSnapshot loads when missing', async () => {
    const snapshots = createEntitySnapshotRepository();
    const commands = {
      executeCommand: jest.fn(),
      executeBatchCommands: jest.fn(),
      executeDNAOperation: jest.fn(),
      getEntities: jest.fn(),
      createEntity: jest.fn(),
      getCommandStatus: jest.fn(),
      getCommandHistory: jest.fn(),
      healthCheck: jest.fn(),
    } as unknown as ProteinCommandChannel;

    const http = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    } as unknown as HTTPClient;

    const protocol = new AgentProtocol(
      { http, commands, snapshots },
      { snapshotDefaultMaxAgeMs: 60_000 }
    );

    let n = 0;
    const data = await protocol.readThroughSnapshot(
      'blob:test',
      async () => {
        n++;
        return { data: { x: 1 }, meta: { fetchedAt: Date.now(), source: 'test' } };
      }
    );
    expect(data).toEqual({ x: 1 });
    expect(n).toBe(1);

    const data2 = await protocol.readThroughSnapshot('blob:test', async () => {
      n++;
      return { data: { x: 2 }, meta: { fetchedAt: Date.now(), source: 'test2' } };
    });
    expect(data2).toEqual({ x: 1 });
    expect(n).toBe(1);
  });

  it('readThroughSnapshot refreshes when stale', async () => {
    const snapshots = createEntitySnapshotRepository();
    const commands = {} as unknown as ProteinCommandChannel;
    const http = {} as unknown as HTTPClient;
    const protocol = new AgentProtocol({ http, commands, snapshots });

    const oldMeta: SnapshotMeta = { fetchedAt: Date.now() - 120_000, source: 'old' };
    snapshots.setSnapshot('k', { v: 1 }, oldMeta);

    const data = await protocol.readThroughSnapshot(
      'k',
      async () => ({
        data: { v: 2 },
        meta: { fetchedAt: Date.now(), source: 'new' },
      }),
      { maxAgeMs: 60_000 }
    );
    expect(data).toEqual({ v: 2 });
  });

  it('searchSnapshots filters by pathPrefix and keyPrefix', () => {
    const snapshots = createEntitySnapshotRepository();
    snapshots.setSnapshot(
      'project-data:1',
      { a: { b: 1 }, c: 2 },
      { fetchedAt: Date.now() }
    );
    snapshots.setSnapshot('other:1', { a: { z: 9 } }, { fetchedAt: Date.now() });

    const protocol = new AgentProtocol({
      http: {} as HTTPClient,
      commands: {} as ProteinCommandChannel,
      snapshots,
    });

    const hits = protocol.searchSnapshots({
      keyPrefix: 'project-data:',
      pathPrefix: 'a',
      maxResults: 20,
      maxSnapshots: 10,
    });
    expect(hits.some((h) => h.path === 'a.b' && h.value === 1)).toBe(true);
    expect(hits.some((h) => h.snapshotKey.startsWith('other:'))).toBe(false);
  });

  it('dnaList delegates to AgentDNA when configured', async () => {
    const list = jest.fn().mockResolvedValue({ entities: [], total: 0 });
    const dna = { list } as any;
    const protocol = new AgentProtocol({
      http: {} as HTTPClient,
      commands: {} as ProteinCommandChannel,
      snapshots: createEntitySnapshotRepository(),
      dna,
    });
    await protocol.dnaList('data_projects_project', { limit: 5 });
    expect(list).toHaveBeenCalledWith('data_projects_project', { limit: 5 });
  });

  it('dnaList throws when AgentDNA is not configured', () => {
    const protocol = new AgentProtocol({
      http: {} as HTTPClient,
      commands: {} as ProteinCommandChannel,
      snapshots: createEntitySnapshotRepository(),
    });
    expect(() => protocol.dnaList('t')).toThrow(/AgentDNA is not configured/);
  });

  it('dnaGet, dnaPatch, dnaDelete delegate to AgentDNA', async () => {
    const dna = {
      get: jest.fn().mockResolvedValue({ uuid: 'u1' }),
      patch: jest.fn().mockResolvedValue({ uuid: 'u1', data: {} }),
      delete: jest.fn().mockResolvedValue({ success: true, message: 'ok' }),
    } as any;
    const protocol = new AgentProtocol({
      http: {} as HTTPClient,
      commands: {} as ProteinCommandChannel,
      snapshots: createEntitySnapshotRepository(),
      dna,
    });
    await protocol.dnaGet('t', 'u1');
    await protocol.dnaPatch('t', 'u1', { data: { a: 1 } });
    await protocol.dnaDelete('t', 'u1');
    expect(dna.get).toHaveBeenCalledWith('t', 'u1');
    expect(dna.patch).toHaveBeenCalledWith('t', 'u1', { data: { a: 1 } });
    expect(dna.delete).toHaveBeenCalledWith('t', 'u1');
  });

  it('dnaQuery delegates to AgentDNA.query', async () => {
    const query = jest.fn().mockResolvedValue({ entities: [], total: 0 });
    const dna = { query } as any;
    const protocol = new AgentProtocol({
      http: {} as HTTPClient,
      commands: {} as ProteinCommandChannel,
      snapshots: createEntitySnapshotRepository(),
      dna,
    });
    await protocol.dnaQuery('tbl', { limit: 1 });
    expect(query).toHaveBeenCalledWith('tbl', { limit: 1 });
  });

  it('socialPublicQuota delegates to AgentSocial when configured', async () => {
    const publicQuota = jest.fn().mockResolvedValue({
      data: { quota: { max_channels: 1, max_chats: 2, max_groups: 3 } },
    });
    const social = { publicQuota } as any;
    const http = { get: jest.fn() } as any;
    const protocol = new AgentProtocol({
      http,
      commands: {} as unknown as ProteinCommandChannel,
      snapshots: createEntitySnapshotRepository(),
      social,
    });
    await protocol.socialPublicQuota({ skipCache: true });
    expect(publicQuota).toHaveBeenCalledWith({ skipCache: true });
    expect(http.get).not.toHaveBeenCalled();
  });

  it('socialPublicQuota falls back to http when social is omitted', async () => {
    const get = jest.fn().mockResolvedValue({
      data: { quota: { max_channels: 5, max_chats: 5, max_groups: 5 } },
    });
    const http = { get } as any;
    const protocol = new AgentProtocol({
      http,
      commands: {} as unknown as ProteinCommandChannel,
      snapshots: createEntitySnapshotRepository(),
    });
    await protocol.socialPublicQuota();
    expect(get).toHaveBeenCalledWith('/api/social/public/quota', undefined, undefined);
  });

  it('socialChannelGet falls back to encoded channel path', async () => {
    const get = jest.fn().mockResolvedValue({ data: { channel: {} } });
    const http = { get } as any;
    const protocol = new AgentProtocol({
      http,
      commands: {} as unknown as ProteinCommandChannel,
      snapshots: createEntitySnapshotRepository(),
    });
    await protocol.socialChannelGet(7, 'a/b');
    expect(get).toHaveBeenCalledWith(
      '/api/social/channels/7/a%2Fb',
      undefined,
      undefined
    );
  });

  it('runMutation runs serially', async () => {
    const snapshots = createEntitySnapshotRepository();
    const protocol = new AgentProtocol({
      http: {} as HTTPClient,
      commands: {} as ProteinCommandChannel,
      snapshots,
    });
    const order: number[] = [];
    const p1 = protocol.runMutation(async () => {
      await new Promise((r) => setTimeout(r, 20));
      order.push(1);
    });
    const p2 = protocol.runMutation(async () => {
      order.push(2);
    });
    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2]);
  });
});
