/** App Studio pipeline payloads. Genetic tag: core.app_studio.pipeline.gen1 */

export interface AppStudioDiagnostic {
  file: string;
  line: number;
  column?: number;
  message: string;
}

export interface AppStudioBuildStatus {
  status: 'queued' | 'building' | 'completed' | 'failed' | 'cached' | 'not_found' | 'pending' | string;
  build_uuid?: string | null;
  content_sha256?: string;
  errors?: AppStudioDiagnostic[];
  error?: string | null;
  error_code?: 'syntax_error' | 'dependency_error' | 'build_failed' | string;
  branch?: string;
}

export interface AppStudioSourceFile {
  path: string;
  content?: string;
  sha256: string;
  bytes?: number;
  dry_run?: boolean;
  branch?: string;
}
