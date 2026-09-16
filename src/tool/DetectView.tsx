import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Button, CopyButton, ErrorBox, Panel, StatusPill, type StatusTone } from '@mmoall/tool-kit';
import { Chip } from './Chips';
import { detectFile, formatBytes, type FileDetection, type Verdict } from './detect';

interface DetectViewProps {
  onOpenExtension: (extension: string) => void;
  onOpenMimeType: (type: string) => void;
}

const VERDICTS: Record<Verdict, { tone: StatusTone; label: string }> = {
  match: { tone: 'success', label: 'Extension matches content' },
  compatible: { tone: 'success', label: 'Extension is compatible with content' },
  mismatch: { tone: 'danger', label: 'Extension does not match content' },
  unknown: { tone: 'neutral', label: 'Could not compare' },
};

export function DetectView({ onOpenExtension, onOpenMimeType }: DetectViewProps) {
  const [results, setResults] = useState<(FileDetection & { id: number })[]>([]);
  const nextId = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const list = [...files];
    if (list.length === 0) return;
    try {
      const detections = await Promise.all(list.map(detectFile));
      const withIds = detections.map((detection) => ({ ...detection, id: nextId.current++ }));
      setResults((prev) => [...withIds, ...prev]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? `Could not read file: ${err.message}` : 'Could not read file.');
    }
  }, []);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void handleFiles(event.dataTransfer.files);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void handleFiles(event.target.files);
    event.target.value = '';
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
          dragging
            ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
            : 'border-[var(--color-border-strong)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="size-8 text-[var(--color-accent)]"
        >
          <path d="M14 3v4a1 1 0 0 0 1 1h4" />
          <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
          <path d="M12 11v6M9 14l3-3 3 3" />
        </svg>
        <p className="text-sm font-medium text-[var(--color-fg)]">Drop files here or click to choose</p>
        <p className="max-w-md text-xs text-[var(--color-muted)]">
          The MIME type is detected from the file extension and from the file's magic bytes (only the first
          4&nbsp;KB are read). Files never leave your device.
        </p>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={handleChange} />
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}

      {results.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-[var(--color-muted)]">
            {results.length} {results.length === 1 ? 'file' : 'files'} analyzed
          </span>
          <Button variant="ghost" size="sm" onClick={() => setResults([])}>
            Clear
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {results.map((result) => (
          <DetectionCard
            key={result.id}
            result={result}
            onOpenExtension={onOpenExtension}
            onOpenMimeType={onOpenMimeType}
          />
        ))}
      </div>
    </div>
  );
}

function DetectionCard({
  result,
  onOpenExtension,
  onOpenMimeType,
}: {
  result: FileDetection;
  onOpenExtension: (extension: string) => void;
  onOpenMimeType: (type: string) => void;
}) {
  const verdict = VERDICTS[result.verdict];
  const [preferred, ...others] = result.byExtension;
  const content = result.byContent;
  const suggestedType = content?.mime ?? preferred?.type ?? 'application/octet-stream';

  return (
    <Panel
      title={
        <span className="truncate" title={result.name}>
          {result.name}
        </span>
      }
      actions={<span className="text-xs whitespace-nowrap tabular-nums text-[var(--color-muted)]">{formatBytes(result.size)}</span>}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusPill tone={verdict.tone}>{verdict.label}</StatusPill>
          <CopyButton getText={() => suggestedType} label="Copy MIME type" />
        </div>

        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-[9rem_minmax(0,1fr)]">
          <dt className="text-xs font-medium text-[var(--color-muted)] sm:pt-1">By content</dt>
          <dd className="flex flex-wrap items-center gap-1.5">
            {content ? (
              <>
                <Chip tone="accent" onClick={() => onOpenMimeType(content.mime)}>
                  {content.mime}
                </Chip>
                <span className="text-xs text-[var(--color-muted)]">{content.name}</span>
              </>
            ) : (
              <span className="text-xs text-[var(--color-muted)]">Unrecognized binary data</span>
            )}
          </dd>

          <dt className="text-xs font-medium text-[var(--color-muted)] sm:pt-1">
            By extension{result.extension && <span className="font-code"> (.{result.extension})</span>}
          </dt>
          <dd className="flex flex-wrap items-center gap-1.5">
            {preferred ? (
              <>
                <Chip onClick={() => onOpenMimeType(preferred.type)}>{preferred.type}</Chip>
                {others.map((entry) => (
                  <Chip key={entry.type} onClick={() => onOpenMimeType(entry.type)}>
                    {entry.type}
                  </Chip>
                ))}
              </>
            ) : result.extension ? (
              <button
                type="button"
                onClick={() => onOpenExtension(result.extension)}
                className="text-xs text-[var(--color-muted)] hover:underline"
              >
                Unknown extension
              </button>
            ) : (
              <span className="text-xs text-[var(--color-muted)]">No extension</span>
            )}
          </dd>

          <dt className="text-xs font-medium text-[var(--color-muted)] sm:pt-1">Browser reports</dt>
          <dd className="flex flex-wrap items-center gap-1.5">
            {result.browserType ? (
              <Chip>{result.browserType}</Chip>
            ) : (
              <span className="text-xs text-[var(--color-muted)]">(empty)</span>
            )}
          </dd>
        </dl>

        {result.hexDump && (
          <pre className="font-code scroll-thin overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-3 text-[11px] leading-5 text-[var(--color-muted)]">
            {result.hexDump}
          </pre>
        )}
      </div>
    </Panel>
  );
}
