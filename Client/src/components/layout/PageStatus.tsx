import type { ReactNode } from 'react';

/** Centered message for loading, empty and error states */
export function PageStatus({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </div>
  );
}

export function PageLoading() {
  return (
    <div role="status" className="text-muted-foreground py-24 text-center">
      Loading…
    </div>
  );
}
