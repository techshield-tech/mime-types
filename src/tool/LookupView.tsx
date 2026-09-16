import { useMemo, type ReactNode } from 'react';
import { Button, CopyButton, Panel, StatusPill } from '@mmoall/tool-kit';
import { Chip, EntryMeta } from './Chips';
import {
  ALL_EXTENSIONS,
  MIME_ENTRIES,
  lookupExtension,
  lookupMimeType,
  normalizeExtension,
  normalizeMimeType,
  searchEntries,
  suggestExtensions,
} from './mime-data';
import { TextInput } from './TextInput';

const EXTENSION_EXAMPLES = ['png', 'svg', 'mp4', 'woff2', 'docx', 'webmanifest'];
const MIME_EXAMPLES = ['image/jpeg', 'text/html', 'application/pdf', 'audio/mpeg', 'font/woff2'];

interface LookupViewProps {
  extensionQuery: string;
  onExtensionQueryChange: (value: string) => void;
  mimeQuery: string;
  onMimeQueryChange: (value: string) => void;
}

export function LookupView({
  extensionQuery,
  onExtensionQueryChange,
  mimeQuery,
  onMimeQueryChange,
}: LookupViewProps) {
  const extension = normalizeExtension(extensionQuery);
  const extensionResults = useMemo(() => lookupExtension(extensionQuery), [extensionQuery]);
  const extensionSuggestions = useMemo(
    () => (extension && extensionResults.length === 0 ? suggestExtensions(extension) : []),
    [extension, extensionResults],
  );

  const mimeType = normalizeMimeType(mimeQuery);
  const mimeEntry = useMemo(() => lookupMimeType(mimeQuery), [mimeQuery]);
  const mimeSuggestions = useMemo(
    () => (mimeType && !mimeEntry ? searchEntries(mimeType).slice(0, 8) : []),
    [mimeType, mimeEntry],
  );

  const [preferred, ...alternatives] = extensionResults;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <Panel
        title="Extension → MIME type"
        actions={
          <Button variant="ghost" size="sm" onClick={() => onExtensionQueryChange('')} disabled={!extensionQuery}>
            Clear
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="extension-input" className="text-xs font-medium text-[var(--color-muted)]">
              File extension or file name
            </label>
            <TextInput
              id="extension-input"
              list="extension-options"
              value={extensionQuery}
              onChange={(event) => onExtensionQueryChange(event.target.value)}
              placeholder="e.g. .png, mp4, report.pdf"
              className="font-code"
            />
            <datalist id="extension-options">
              {ALL_EXTENSIONS.map((ext) => (
                <option key={ext} value={ext} />
              ))}
            </datalist>
            <Examples items={EXTENSION_EXAMPLES} format={(ext) => `.${ext}`} onPick={onExtensionQueryChange} />
          </div>

          {!extension ? (
            <Hint>Type an extension to see its MIME type.</Hint>
          ) : preferred ? (
            <div className="flex flex-col gap-3">
              <ResultCard
                label={
                  <>
                    MIME type for <span className="font-code">.{extension}</span>
                    {alternatives.length > 0 && <StatusPill tone="success">Preferred</StatusPill>}
                  </>
                }
                value={preferred.type}
                onOpen={() => onMimeQueryChange(preferred.type)}
              >
                <EntryMeta entry={preferred} />
              </ResultCard>
              {alternatives.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-[var(--color-muted)]">
                    Also registered for .{extension}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {alternatives.map((entry) => (
                      <Chip key={entry.type} onClick={() => onMimeQueryChange(entry.type)} title="Show extensions">
                        {entry.type}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <NotFound
              message={
                <>
                  No MIME type is registered for <span className="font-code">.{extension}</span>. Servers
                  usually fall back to <span className="font-code">application/octet-stream</span>.
                </>
              }
              suggestions={extensionSuggestions.map((ext) => ({ key: ext, label: `.${ext}`, onPick: () => onExtensionQueryChange(ext) }))}
            />
          )}
        </div>
      </Panel>

      <Panel
        title="MIME type → Extensions"
        actions={
          <Button variant="ghost" size="sm" onClick={() => onMimeQueryChange('')} disabled={!mimeQuery}>
            Clear
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="mime-input" className="text-xs font-medium text-[var(--color-muted)]">
              MIME type (parameters like <span className="font-code">; charset=utf-8</span> are ignored)
            </label>
            <TextInput
              id="mime-input"
              list="mime-options"
              value={mimeQuery}
              onChange={(event) => onMimeQueryChange(event.target.value)}
              placeholder="e.g. application/json"
              className="font-code"
            />
            <datalist id="mime-options">
              {MIME_ENTRIES.map((entry) => (
                <option key={entry.type} value={entry.type} />
              ))}
            </datalist>
            <Examples items={MIME_EXAMPLES} format={(type) => type} onPick={onMimeQueryChange} />
          </div>

          {!mimeType ? (
            <Hint>Type a MIME type to see its file extensions.</Hint>
          ) : mimeEntry ? (
            <div className="flex flex-col gap-3">
              <ResultCard
                label={
                  <>
                    Extensions for <span className="font-code break-all">{mimeEntry.type}</span>
                  </>
                }
                value={mimeEntry.extensions.map((ext) => `.${ext}`).join(', ')}
                copyText={mimeEntry.extensions.map((ext) => `.${ext}`).join(',')}
                emptyText="No file extensions associated with this type."
              >
                <EntryMeta entry={mimeEntry} />
              </ResultCard>
              {mimeEntry.extensions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-[var(--color-muted)]">
                    Click an extension to look it up
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {mimeEntry.extensions.map((ext, index) => (
                      <Chip
                        key={ext}
                        tone={index === 0 ? 'accent' : 'neutral'}
                        onClick={() => onExtensionQueryChange(ext)}
                        title={index === 0 ? 'Default extension' : undefined}
                      >
                        .{ext}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <NotFound
              message={
                <>
                  <span className="font-code break-all">{mimeType}</span> is not in the database
                  {!mimeType.includes('/') && ' — a MIME type looks like type/subtype'}.
                </>
              }
              suggestions={mimeSuggestions.map((entry) => ({
                key: entry.type,
                label: entry.type,
                onPick: () => onMimeQueryChange(entry.type),
              }))}
            />
          )}
        </div>
      </Panel>
    </div>
  );
}

function Examples({
  items,
  format,
  onPick,
}: {
  items: string[];
  format: (item: string) => string;
  onPick: (item: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-[var(--color-subtle)]">Try:</span>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPick(item)}
          className="font-code rounded px-1 text-xs text-[var(--color-accent)] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          {format(item)}
        </button>
      ))}
    </div>
  );
}

function ResultCard({
  label,
  value,
  copyText,
  emptyText,
  onOpen,
  children,
}: {
  label: ReactNode;
  value: string;
  copyText?: string;
  emptyText?: string;
  onOpen?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-medium text-[var(--color-muted)]">{label}</span>
        {value && <CopyButton getText={() => copyText ?? value} />}
      </div>
      {value ? (
        onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            title="Show all extensions for this type"
            className="font-code w-fit text-left text-lg font-semibold break-all text-[var(--color-fg)] outline-none hover:text-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            {value}
          </button>
        ) : (
          <span className="font-code text-lg font-semibold break-all text-[var(--color-fg)]">{value}</span>
        )
      ) : (
        <span className="text-sm text-[var(--color-muted)]">{emptyText}</span>
      )}
      {children}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-sm text-[var(--color-muted)]">{children}</p>;
}

function NotFound({
  message,
  suggestions,
}: {
  message: ReactNode;
  suggestions: { key: string; label: string; onPick: () => void }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <StatusPill tone="danger">Not found</StatusPill>
      </div>
      <p className="text-sm text-[var(--color-muted)]">{message}</p>
      {suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[var(--color-muted)]">Did you mean</span>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((suggestion) => (
              <Chip key={suggestion.key} onClick={suggestion.onPick}>
                {suggestion.label}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
