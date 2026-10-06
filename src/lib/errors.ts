// Lightweight error reporting — Sentry if DSN is set, console otherwise.
// Sentry is optional: install @sentry/browser and set VITE_SENTRY_DSN to enable.

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';

type SentryModule = {
  init: (opts: Record<string, unknown>) => void;
  captureException: (err: unknown, opts?: Record<string, unknown>) => void;
};

let sentry: SentryModule | null = null;

async function ensureSentry(): Promise<SentryModule | null> {
  if (!SENTRY_DSN) return null;
  if (sentry) return sentry;
  try {
    // Optional dependency — resolved at runtime if installed (not type-checked)
    const specifier = '@sentry/browser';
    const mod = (await import(/* @vite-ignore */ specifier)) as unknown as SentryModule;
    mod.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: 0.2,
      environment: import.meta.env.MODE,
    });
    sentry = mod;
    return mod;
  } catch {
    return null;
  }
}

export async function reportError(error: unknown, context?: Record<string, unknown>): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error('[error]', err.message, context || '', err);

  const mod = await ensureSentry();
  mod?.captureException(err, { extra: context });
}

export function reportMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (level === 'error') console.error('[msg]', message);
  else if (level === 'warning') console.warn('[msg]', message);
  else console.info('[msg]', message);
}

/** Install global handlers for uncaught errors. */
export function installGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => {
    void reportError(e.error || e.message, { type: 'window.error' });
  });
  window.addEventListener('unhandledrejection', (e) => {
    void reportError(e.reason, { type: 'unhandledrejection' });
  });
}
