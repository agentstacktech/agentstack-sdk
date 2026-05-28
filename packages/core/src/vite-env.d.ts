interface ImportMeta {
  env: {
    VITE_API_BASE_URL?: string;
    VITE_API_BASE?: string;
    VITE_AGENTSTACK_API_KEY?: string;
    PROD?: boolean;
    DEV?: boolean;
    [key: string]: unknown;
  };
}

