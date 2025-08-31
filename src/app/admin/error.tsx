'use client';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ padding: 24 }}>
      <h1>Something broke on /admin</h1>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{error.message}</pre>
      <button onClick={reset} style={{ marginTop: 12, padding: '8px 12px', border: '1px solid #ccc', borderRadius: 8 }}>
        Try again
      </button>
    </div>
  );
}
