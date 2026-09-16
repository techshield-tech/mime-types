import type { ReactNode } from 'react';
import type { MimeEntry } from './mime-data';

export function Chip({
  children,
  onClick,
  tone = 'neutral',
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: 'neutral' | 'accent';
  title?: string;
}) {
  const toneClass =
    tone === 'accent'
      ? 'border-transparent bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
      : 'border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-fg)]';
  const className = `font-code inline-flex h-6 items-center rounded-md border px-2 text-xs ${toneClass}`;
  if (!onClick) {
    return (
      <span className={className} title={title}>
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`${className} cursor-pointer transition-colors outline-none hover:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]`}
    >
      {children}
    </button>
  );
}

export const SOURCE_LABELS: Record<string, string> = {
  iana: 'IANA',
  apache: 'Apache',
  nginx: 'nginx',
};

export function EntryMeta({ entry }: { entry: MimeEntry }) {
  const items: string[] = [];
  items.push(entry.source ? `Source: ${SOURCE_LABELS[entry.source]}` : 'Source: unregistered');
  if (entry.charset) items.push(`Charset: ${entry.charset}`);
  if (entry.compressible !== undefined) items.push(entry.compressible ? 'Compressible' : 'Not compressible');
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}
