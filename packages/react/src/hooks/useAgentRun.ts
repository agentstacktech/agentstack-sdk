/**
 * Start/stop agent runs + optional SSE stream (fetch + AbortController).
 * Uses reducer state; pairs with `useAgentTraces` for polling fallback.
 */

import { useCallback, useReducer, useRef } from 'react';
import { useSDKInstance } from '../context/SDKContext';

export type AgentRunStreamEvent = { events?: unknown[]; terminal?: string };

type Phase = 'idle' | 'starting' | 'streaming' | 'error';

export interface AgentRunState {
  phase: Phase;
  runId: string | null;
  streamedEvents: unknown[];
  terminal: string | null;
  error: string | null;
}

type Action =
  | { type: 'reset' }
  | { type: 'start_ok'; runId: string }
  | { type: 'start_err'; message: string }
  | { type: 'chunk'; events: unknown[] }
  | { type: 'terminal'; status: string }
  | { type: 'stream_err'; message: string };

function reducer(state: AgentRunState, action: Action): AgentRunState {
  switch (action.type) {
    case 'reset':
      return {
        phase: 'idle',
        runId: null,
        streamedEvents: [],
        terminal: null,
        error: null,
      };
    case 'start_ok':
      return {
        ...state,
        phase: 'streaming',
        runId: action.runId,
        error: null,
        terminal: null,
        streamedEvents: [],
      };
    case 'start_err':
      return { ...state, phase: 'error', error: action.message };
    case 'chunk':
      return {
        ...state,
        streamedEvents: [...state.streamedEvents, ...(action.events || [])],
      };
    case 'terminal':
      return { ...state, phase: 'idle', terminal: action.status };
    case 'stream_err':
      return { ...state, phase: 'error', error: action.message };
    default:
      return state;
  }
}

function parseSseDataLine(line: string): AgentRunStreamEvent | null {
  if (!line.startsWith('data:')) return null;
  const json = line.slice(5).trim();
  if (!json) return null;
  try {
    return JSON.parse(json) as AgentRunStreamEvent;
  } catch {
    return null;
  }
}

export function useAgentRun(projectId: number | undefined, agentId: string | undefined) {
  const sdk = useSDKInstance();
  const [state, dispatch] = useReducer(reducer, {
    phase: 'idle',
    runId: null,
    streamedEvents: [],
    terminal: null,
    error: null,
  } satisfies AgentRunState);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: 'reset' });
  }, []);

  const startRun = useCallback(
    async (input: Record<string, unknown> = {}) => {
      if (projectId == null || !agentId) throw new Error('projectId and agentId required');
      dispatch({ type: 'reset' });
      try {
        const out = await sdk.agentsFleet.startRun(projectId, agentId, input);
        const runId = String((out as { run_uuid?: string }).run_uuid || '');
        if (!runId) throw new Error('run_uuid missing');
        dispatch({ type: 'start_ok', runId });
        return runId;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        dispatch({ type: 'start_err', message: msg });
        throw e;
      }
    },
    [agentId, projectId, sdk.agentsFleet],
  );

  const stopRun = useCallback(
    async (runId: string) => {
      if (projectId == null || !agentId) throw new Error('projectId and agentId required');
      await sdk.agentsFleet.stopRun(projectId, agentId, runId);
      abortRef.current?.abort();
    },
    [agentId, projectId, sdk.agentsFleet],
  );

  /**
   * Long-lived SSE read until terminal or abort. Call after `startRun` resolves.
   */
  const streamRun = useCallback(
    async (runId: string, signal?: AbortSignal) => {
      if (projectId == null || !agentId) throw new Error('projectId and agentId required');
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      if (signal) {
        if (signal.aborted) ac.abort();
        else signal.addEventListener('abort', () => ac.abort(), { once: true });
      }

      const path = `/agents/${agentId}/runs/${runId}/stream`;
      const url = sdk.httpClient.resolveApiUrl(path, { project_id: projectId });
      const headers = sdk.httpClient.buildFetchHeaders(
        { Accept: 'text/event-stream' },
        url,
      );

      const res = await fetch(url, { headers, signal: ac.signal, credentials: 'include' });
      if (!res.ok) {
        dispatch({ type: 'stream_err', message: `stream ${res.status}` });
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) {
        dispatch({ type: 'stream_err', message: 'no response body' });
        return;
      }
      const dec = new TextDecoder();
      let buf = '';
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            const ev = parseSseDataLine(line);
            if (!ev) continue;
            if (ev.events?.length) dispatch({ type: 'chunk', events: ev.events });
            if (ev.terminal) dispatch({ type: 'terminal', status: ev.terminal });
          }
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        dispatch({ type: 'stream_err', message: e instanceof Error ? e.message : String(e) });
      }
    },
    [agentId, projectId, sdk.httpClient],
  );

  return { state, startRun, stopRun, streamRun, reset };
}
