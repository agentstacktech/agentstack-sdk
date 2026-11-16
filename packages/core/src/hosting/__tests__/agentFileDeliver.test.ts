import { describe, expect, it, vi } from 'vitest';

import { agentFileDeliver } from '../agentFileDeliver';
import type { AgentHosting } from '../../modules/AgentHosting';
import type { AgentStorage } from '../../modules/AgentStorage';

describe('agentFileDeliver', () => {
  it('routes site_zip_url to importArchive', async () => {
    const importArchive = vi.fn().mockResolvedValue({
      data: { success: true, live_changed: true },
    });
    const hosting = { importArchive, deliverSiteZip: vi.fn() } as unknown as AgentHosting;
    const storage = { uploadFile: vi.fn() } as unknown as AgentStorage;

    const out = await agentFileDeliver(
      hosting,
      storage,
      { kind: 'site_zip_url', url: 'https://cdn.example/dist.zip' },
      { project_id: 1, bucket_id: 'b1', publish: true },
    );

    expect(importArchive).toHaveBeenCalledWith(1, 'b1', expect.objectContaining({
      source_url: 'https://cdn.example/dist.zip',
      publish: true,
    }));
    expect(out.delivery).toBe('import_archive');
    expect(out.live_changed).toBe(true);
  });

  it('routes site_zip_blob to deliverSiteZip', async () => {
    const deliverSiteZip = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, files_written: 3 }), { status: 200 }),
    );
    const hosting = {
      importArchive: vi.fn(),
      deliverSiteZip,
    } as unknown as AgentHosting;
    const storage = { uploadFile: vi.fn() } as unknown as AgentStorage;
    const blob = new Blob(['zip'], { type: 'application/zip' });

    const out = await agentFileDeliver(
      hosting,
      storage,
      { kind: 'site_zip_blob', file: blob },
      { project_id: 2, bucket_id: 'b2' },
    );

    expect(deliverSiteZip).toHaveBeenCalled();
    expect(out.delivery).toBe('grant');
    expect(out.files_written).toBe(3);
  });
});