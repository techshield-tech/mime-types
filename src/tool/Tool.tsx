import { useCallback, useState } from 'react';
import { SegmentedControl, Toolbar } from '@mmoall/tool-kit';
import { BrowseView } from './BrowseView';
import { DetectView } from './DetectView';
import { LookupView } from './LookupView';
import { STATS } from './mime-data';

type View = 'lookup' | 'detect' | 'browse';

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: 'lookup', label: 'Lookup' },
  { value: 'detect', label: 'Detect file' },
  { value: 'browse', label: 'Browse all' },
];

export function Tool() {
  const [view, setView] = useState<View>('lookup');
  const [extensionQuery, setExtensionQuery] = useState('png');
  const [mimeQuery, setMimeQuery] = useState('application/json');

  const openExtension = useCallback((extension: string) => {
    setExtensionQuery(extension);
    setView('lookup');
  }, []);

  const openMimeType = useCallback((type: string) => {
    setMimeQuery(type);
    setView('lookup');
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <Toolbar>
        <SegmentedControl aria-label="View" value={view} onChange={setView} options={VIEW_OPTIONS} />
        <span className="ml-auto hidden px-2 text-xs tabular-nums text-[var(--color-muted)] sm:inline">
          {STATS.types.toLocaleString()} MIME types · {STATS.extensions.toLocaleString()} extensions
        </span>
      </Toolbar>

      {view === 'lookup' && (
        <LookupView
          extensionQuery={extensionQuery}
          onExtensionQueryChange={setExtensionQuery}
          mimeQuery={mimeQuery}
          onMimeQueryChange={setMimeQuery}
        />
      )}
      {view === 'detect' && <DetectView onOpenExtension={openExtension} onOpenMimeType={openMimeType} />}
      {view === 'browse' && <BrowseView onOpenExtension={openExtension} onOpenMimeType={openMimeType} />}
    </div>
  );
}
