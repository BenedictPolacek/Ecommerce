import { useApiWaking } from '@/lib/api-waking';

/**
 * Explains the wait while the sleeping API starts, instead of an empty page.
 * The live region is always rendered, so screen readers announce the text when it appears.
 */
export function ApiWakingNotice() {
  const waking = useApiWaking();

  return (
    <div role="status">
      {waking && (
        <div className="border-b border-sky-200 bg-sky-50 text-sky-900">
          <p className="container mx-auto px-4 py-2 text-sm">
            <strong>Waking up the shop…</strong> On free hosting this can take up to a minute after
            a quiet period. The page loads by itself.
          </p>
        </div>
      )}
    </div>
  );
}
