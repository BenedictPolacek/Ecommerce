/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Sentry project ecommerce-web; only set for production images */
  readonly VITE_SENTRY_DSN?: string;
  /** Commit the image was built from (Dockerfile build argument GIT_SHA) */
  readonly VITE_GIT_SHA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
