// Per-tool metadata. This is the ONE file (together with `src/tool/`,
// `index.html`'s fallback <title>, and this repo's README) that changes
// when this template is copied to a new tool repo.

// Imports from '@mmoall/tool-kit/config' (a plain-JS-backed subpath), not
// the main '@mmoall/tool-kit' barrel — this file is also reachable from
// vite.config.ts's config-load chain, which cannot load the main barrel's
// .ts source from inside node_modules. See '@mmoall/tool-kit/config's
// source comment for why.
import { defineToolConfig } from '@mmoall/tool-kit/config';

export const toolConfig = defineToolConfig({
  slug: 'mime-types',
  name: 'MIME Types Lookup',
  description:
    'Look up MIME types by file extension and extensions by MIME type, search the full mime-db, and detect a file\'s real type from its magic bytes.',
  category: 'Network',
  keywords: [
    'mime types',
    'mime type lookup',
    'file extension to mime type',
    'mime type to extension',
    'content-type lookup',
    'media types list',
    'detect file type',
    'magic bytes',
    'mime-db',
  ],
});
