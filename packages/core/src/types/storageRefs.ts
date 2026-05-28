export type StorageScope = 'user' | 'project';

export type StorageRefV1 = {
  v: 1;
  project_id: number;
  scope: StorageScope;
  owner_dna_user_id: number;
  is_temp: boolean;
  folder_key?: string | null;
  file_id: string;
};

export type ChatAttachmentKind = 'photo' | 'file' | 'audio' | 'video' | 'video_note';

export type ChatAttachmentV1 = {
  v: 1;
  kind: ChatAttachmentKind;
  storage_ref: StorageRefV1;
  meta?: {
    orig?: string;
    mime?: string;
    size_bytes?: number;
    w?: number;
    h?: number;
    duration_ms?: number | null;
  };
  url_hint?: string;
  thumb_ref?: StorageRefV1 | null;
};

