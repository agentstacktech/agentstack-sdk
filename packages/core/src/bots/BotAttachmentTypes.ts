/** Bot Fleet attachment envelope (shared with REST/MCP). */
export type BotOutboundAttachment = {
  kind: 'image' | 'audio' | 'video' | 'document' | 'location' | 'sticker' | 'contact';
  url?: string;
  storage_file_id?: string;
  provider_media_id?: string;
  filename?: string;
  mime?: string;
  caption?: string;
  voice?: boolean;
};
