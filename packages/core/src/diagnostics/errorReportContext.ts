import { getLastOpTraceTraceId } from '../utils/optrace';

export type ErrorReportContext = {
  trace_id?: string;
  client_build_id?: string;
  route_bucket?: string;
  project_id?: number;
  audience?: string;
};

export function buildErrorReportContext(input: {
  pathname?: string;
  projectId?: number;
  audience?: string;
  clientBuildId?: string;
}): ErrorReportContext {
  const path = (input.pathname || (typeof window !== 'undefined' ? window.location.pathname : '')).replace(/\/+$/, '');
  const segments = path.split('/').filter(Boolean).slice(0, 4);
  return {
    trace_id: getLastOpTraceTraceId() || undefined,
    client_build_id: input.clientBuildId,
    route_bucket: '/' + segments.join('/'),
    project_id: input.projectId,
    audience: input.audience,
  };
}