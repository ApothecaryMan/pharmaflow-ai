/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  // Add more VITE_ environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
