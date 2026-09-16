# MIME Types Lookup

Look up the MIME type for a file extension, the extensions for a MIME type, browse and
fuzzy-search the whole media type database, and detect a file's real type from its magic
bytes — fast, free, and 100% client-side. The [mime-db](https://github.com/jshttp/mime-db)
dataset is bundled into the app, so nothing is fetched at runtime and dropped files never
leave your device.

**Live:** https://techshield-tech.github.io/mime-types/

Part of [MMOALL Developer Tools](https://mmoall.com/tools).

## Features

- **Extension → MIME type** — accepts `png`, `.PNG`, `report.pdf` or a full path. Shows the
  preferred type (ranked the same way as the `mime-types` package: IANA over Apache over
  nginx, standard over `vnd.`/`x-`, `video/mp4` over `application/mp4`), every other type
  registered for that extension, and its source, default charset and compressibility.
- **MIME type → extensions** — parameters such as `; charset=utf-8` are ignored; the default
  extension is highlighted. Click any extension or type to jump between the two lookups.
- **Suggestions** — unknown extensions and types get "did you mean" suggestions; both inputs
  autocomplete from the database.
- **Browse all** — fuzzy search across all ~2,500 MIME types and their extensions (typos like
  `jsn` still find `application/json`), grouped by top-level type (`application`, `audio`,
  `font`, `image`, `text`, `video`, …), with a type filter and an "only with extensions" toggle.
- **Detect file** — drop or choose one or more files. Each file is identified by extension
  *and* by content: only the first 4 KB are read and matched against signatures for common
  formats (PNG, JPEG, GIF, WebP, AVIF/HEIC, BMP, ICO, TIFF, PSD, PDF, ZIP and ZIP-based
  DOCX/XLSX/PPTX/ODF/EPUB/JAR/APK, GZIP, BZIP2, XZ, Zstandard, 7z, RAR, TAR, legacy Office,
  SQLite, MP3, AAC, Ogg/Opus, FLAC, WAV, AIFF, MIDI, MP4/MOV/M4A, WebM/MKV, AVI, FLV, MPEG,
  WOFF/WOFF2/TTF/OTF, WebAssembly, ELF, PE/EXE, Mach-O, Java class, DEB, RPM) plus text
  sniffing for SVG, HTML, XML, JSON, RTF and plain text. A verdict tells you whether the
  extension matches the content, alongside the type the browser reports and a hex dump of
  the first bytes.
- Copy buttons for types and extension lists.
- Light/dark theme toggle (remembered in `localStorage`, defaults to the OS preference).
- Responsive layout, single column on small screens.
- Embeddable in an iframe (see [Embedding](#embedding)).

## Tech stack

- [Vite 6](https://vite.dev/) + [React 19](https://react.dev/) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/) (via `@tailwindcss/vite`)
- [Bun](https://bun.sh/) as package manager / script runner
- [mime-db](https://github.com/jshttp/mime-db) — media type database, bundled at build time

## Project structure

```
src/
├── main.tsx              # Entry point
├── index.css             # Tailwind + theme tokens (light/dark)
├── tool.config.ts        # Tool metadata: slug, name, description, category
├── shell/                # Shared MMOALL tool shell (same across tool repos)
│   ├── AppShell.tsx      # Header/footer, theme handling, embed mode
│   ├── embed.ts          # iframe embed contract (postMessage)
│   └── ui.tsx            # UI primitives and icons
└── tool/                 # MIME-types–specific code
    ├── Tool.tsx          # View switcher (Lookup / Detect file / Browse all)
    ├── LookupView.tsx    # Extension ↔ MIME type lookup
    ├── DetectView.tsx    # File drop zone and detection results
    ├── BrowseView.tsx    # Searchable, grouped table of all types
    ├── Chips.tsx         # Small chip / metadata components
    ├── TextInput.tsx     # Text input styled like the shell controls
    ├── mime-data.ts      # mime-db indexes, preferred-type ranking, fuzzy search
    ├── magic.ts          # Magic-byte signatures and hex dump
    └── detect.ts         # Extension vs. content comparison for a File
```

## Running locally

Requirements: [Bun](https://bun.sh/) 1.x (Node.js 20+ with npm also works).

```bash
git clone https://github.com/techshield-tech/mime-types.git
cd mime-types
bun install
bun dev
```

Open the URL Vite prints — by default **http://localhost:5173/mime-types/**
(note the `/mime-types/` path, see [Base path](#base-path)).

To serve from the root instead:

```bash
BASE_PATH=/ bun dev        # http://localhost:5173/
```

### Scripts

| Command           | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `bun dev`         | Start the dev server with hot reload                 |
| `bun run build`   | Type-check (`tsc -b`) and build to `dist/`           |
| `bun run preview` | Serve the production build from `dist/` locally      |

With npm: `npm install`, `npm run dev`, `npm run build`, `npm run preview`.

### Base path

The asset base URL is chosen at build time in `vite.config.ts`:

| Condition               | `base`             | Used for                    |
| ----------------------- | ------------------ | --------------------------- |
| `BASE_PATH` is set      | value of `BASE_PATH` | Any custom host / sub-path |
| `VERCEL` is set         | `/`                | Vercel (set automatically)  |
| otherwise (default)     | `/mime-types/` | GitHub Pages                |

`BASE_PATH` should start and end with `/`, e.g. `/` or `/tools/mime-types/`.

## Deployment

The build output is a fully static site in `dist/` — no server or environment
secrets required.

### Vercel

#### Option 1: Import from GitHub (recommended)

1. Go to [vercel.com/new](https://vercel.com/new) and import the
   `techshield-tech/mime-types` repository.
2. Vercel auto-detects the **Vite** preset and Bun (from `bun.lock`). Defaults are fine:

   | Setting          | Value           |
   | ---------------- | --------------- |
   | Framework Preset | Vite            |
   | Install Command  | `bun install`   |
   | Build Command    | `bun run build` |
   | Output Directory | `dist`          |

3. Click **Deploy**.

No environment variables are needed: Vercel sets `VERCEL=1` during the build, so the
app is built with `base: '/'`. Afterwards, every push to `main` deploys to production
and every pull request gets a preview URL.

#### Option 2: Vercel CLI

```bash
bun add -g vercel     # or: npm i -g vercel
vercel login
vercel link           # link the folder to a (new) Vercel project
vercel                # preview deployment
vercel --prod         # production deployment
```

The CLI builds on Vercel's infrastructure, so `VERCEL=1` is set there as well.
To build locally and upload only the output:

```bash
vercel build --prod
vercel deploy --prebuilt --prod
```

#### Custom domain

In the Vercel dashboard, open **Project → Settings → Domains** and add your domain.
If you serve the tool under a sub-path of another site (e.g. via a rewrite from
`example.com/tools/mime-types/`), set the `BASE_PATH` environment variable in
**Settings → Environment Variables** to that path (e.g. `/tools/mime-types/`) and redeploy.

> The app has no client-side routing, so no SPA rewrite rules (`vercel.json`) are
> needed.

### GitHub Pages

Deployment to GitHub Pages runs automatically via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to
`main` (or manually via *Run workflow*). It installs with Bun, runs
`bun run build` with the default `/mime-types/` base, and publishes `dist/`.

To enable it on a fork: **Settings → Pages → Source: GitHub Actions**.

## Embedding

The tool can be embedded in an iframe, e.g. on mmoall.com. In embed mode it renders
only the tool itself (no header/footer) on a transparent background.

```html
<iframe
  id="mime-types"
  src="https://techshield-tech.github.io/mime-types/?embed=1&theme=dark"
  style="width: 100%; border: 0;"
  title="MIME Types Lookup"
></iframe>

<script>
  const iframe = document.getElementById('mime-types');

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (data?.slug !== 'mime-types') return;

    // Resize the iframe to fit its content.
    if (data.type === 'mmoall-tool:height') {
      iframe.style.height = `${data.height}px`;
    }
    if (data.type === 'mmoall-tool:ready') {
      // The tool has mounted and is ready.
    }
  });

  // Change the theme at runtime (only accepted from an allowed origin).
  iframe.contentWindow.postMessage({ type: 'mmoall-tool:theme', theme: 'light' }, '*');
</script>
```

### Contract

| Direction       | Message / parameter                                              | Notes |
| --------------- | ---------------------------------------------------------------- | ----- |
| URL             | `?embed=1`                                                       | Render only the tool, transparent background |
| URL             | `?theme=light` \| `?theme=dark`                                  | Initial theme; otherwise follows `prefers-color-scheme` |
| parent → iframe | `{ type: 'mmoall-tool:theme', theme: 'light' \| 'dark' }`        | Accepted only from `https://mmoall.com`, `https://www.mmoall.com`, `http://localhost:3000` |
| iframe → parent | `{ type: 'mmoall-tool:ready', slug: 'mime-types' }`          | Posted once on mount (embed mode only) |
| iframe → parent | `{ type: 'mmoall-tool:height', slug: 'mime-types', height }` | Posted whenever the document height changes (embed mode only) |

## License

MIT — see [LICENSE](./LICENSE).
