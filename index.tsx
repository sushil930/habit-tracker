import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

function isProbablyTauri() {
  return Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);
}

function FatalErrorOverlay({ error }: { error: unknown }) {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}\n\n${error.stack ?? ''}`
      : typeof error === 'string'
        ? error
        : JSON.stringify(error);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0b1220',
        color: '#e5e7eb',
        padding: 16,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        zIndex: 999999,
        overflow: 'auto',
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
          HabitFlow failed to start
        </h1>
        <p style={{ marginBottom: 12, opacity: 0.9 }}>
          This screen is shown so the desktop build doesn’t fail silently.
        </p>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message}</pre>
      </div>
    </div>
  );
}

function Root() {
  const [fatalError, setFatalError] = useState<unknown>(null);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      setFatalError(event.error ?? event.message);
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      setFatalError(event.reason);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    // Web-only: register PWA Service Worker. Never do this in Tauri.
    if (isProbablyTauri()) return;

    (async () => {
      try {
        const mod = await import('virtual:pwa-register');
        mod.registerSW({ immediate: true });
      } catch {
        // ignore - SW is optional
      }
    })();
  }, []);

  return (
    <React.StrictMode>
      <App />
      {fatalError ? <FatalErrorOverlay error={fatalError} /> : null}
    </React.StrictMode>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <Root />
);