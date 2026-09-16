import { useDeferredValue, useMemo, useState } from 'react';
import { Button, Panel, Select, Switch } from '@mmoall/tool-kit';
import { Chip, SOURCE_LABELS } from './Chips';
import { MIME_ENTRIES, MIME_GROUPS, groupEntries, searchEntries } from './mime-data';
import { TextInput } from './TextInput';

const PAGE_SIZE = 200;

interface BrowseViewProps {
  onOpenExtension: (extension: string) => void;
  onOpenMimeType: (type: string) => void;
}

function groupOptions(onlyWithExtensions: boolean) {
  const entries = onlyWithExtensions ? MIME_ENTRIES.filter((entry) => entry.extensions.length > 0) : MIME_ENTRIES;
  const counts: Record<string, number> = {};
  for (const entry of entries) counts[entry.group] = (counts[entry.group] ?? 0) + 1;
  return [
    { value: '', label: `All types (${entries.length})` },
    ...MIME_GROUPS.map((group) => ({ value: group, label: `${group} (${counts[group] ?? 0})` })),
  ];
}

export function BrowseView({ onOpenExtension, onOpenMimeType }: BrowseViewProps) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const [onlyWithExtensions, setOnlyWithExtensions] = useState(true);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const deferredQuery = useDeferredValue(query);
  const options = useMemo(() => groupOptions(onlyWithExtensions), [onlyWithExtensions]);

  const results = useMemo(
    () => searchEntries(deferredQuery, { group: group || undefined, onlyWithExtensions }),
    [deferredQuery, group, onlyWithExtensions],
  );
  const grouped = useMemo(() => groupEntries(results.slice(0, limit)), [results, limit]);

  const resetLimit = () => setLimit(PAGE_SIZE);

  return (
    <Panel
      flush
      title={
        <>
          All MIME types
          <span className="text-xs font-normal tabular-nums text-[var(--color-muted)]">
            {results.length.toLocaleString()} {results.length === 1 ? 'result' : 'results'}
          </span>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] p-3">
        <TextInput
          aria-label="Search MIME types and extensions"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            resetLimit();
          }}
          placeholder="Fuzzy search, e.g. svg, jsn, vnd excel…"
          className="sm:max-w-sm sm:flex-1"
        />
        <Select
          aria-label="Top-level type"
          value={group}
          onChange={(event) => {
            setGroup(event.target.value);
            resetLimit();
          }}
          options={options}
        />
        <Switch
          checked={onlyWithExtensions}
          onChange={(checked) => {
            setOnlyWithExtensions(checked);
            resetLimit();
          }}
          label="Only with extensions"
          className="px-1"
        />
        {(query || group) && (
          <Button
            variant="ghost"
            className="ml-auto"
            onClick={() => {
              setQuery('');
              setGroup('');
              resetLimit();
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {results.length === 0 ? (
        <p className="p-6 text-center text-sm text-[var(--color-muted)]">No MIME types match your search.</p>
      ) : (
        <div className="flex flex-col">
          {grouped.map(({ group: name, entries }) => (
            <section key={name}>
              <h3 className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-2 text-xs font-semibold tracking-wide text-[var(--color-muted)] uppercase">
                {name}
                <span className="font-normal normal-case tabular-nums">{entries.length}</span>
              </h3>
              <ul>
                {entries.map((entry) => (
                  <li
                    key={entry.type}
                    className="grid grid-cols-1 gap-1.5 border-b border-[var(--color-border)] px-4 py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_5rem] sm:items-center sm:gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenMimeType(entry.type)}
                      title="Open in lookup"
                      className="font-code w-fit text-left text-[13px] break-all text-[var(--color-fg)] outline-none hover:text-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                    >
                      {entry.type}
                    </button>
                    <div className="flex flex-wrap gap-1">
                      {entry.extensions.length === 0 ? (
                        <span className="text-xs text-[var(--color-subtle)]">—</span>
                      ) : (
                        entry.extensions.map((ext) => (
                          <Chip key={ext} onClick={() => onOpenExtension(ext)}>
                            .{ext}
                          </Chip>
                        ))
                      )}
                    </div>
                    <span className="text-xs text-[var(--color-muted)] sm:text-right">
                      {entry.source ? SOURCE_LABELS[entry.source] : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {results.length > limit && (
            <div className="flex justify-center p-3">
              <Button onClick={() => setLimit((current) => current + PAGE_SIZE * 5)}>
                Show more ({(results.length - limit).toLocaleString()} remaining)
              </Button>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
