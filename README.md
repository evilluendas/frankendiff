# Frankendiff

**[frankendiff.com](https://frankendiff.com)** — read the 1818 and 1831 editions of Mary Shelley's *Frankenstein* and see every change between them, inline.

Mary Shelley published *Frankenstein* anonymously in 1818 and revised it substantially for the 1831 Bentley edition. Frankendiff lets you read either text chapter by chapter, switch editions at any point, and open a diff view where every insertion and deletion is marked in the flow of the novel. Everything is computed at build time; the site is static.

## Reading modes

- **Read** — `/1818/chapter/22`, `/1831/chapter/22`. One edition at a time. An edition switcher keeps you on the same chapter when you flip. Every paragraph has a permalink (hover it on desktop and click the ¶): `/1831/chapter/22#p12`.
- **Diff** — `/diff/22`. Both editions merged paragraph by paragraph, always 1818 → 1831: green was added in 1831, red was removed. Where 1831 split a chapter, the diff compares the whole 1818 chapter against all its 1831 pieces on one page and marks where each new chapter begins (`/diff/1` covers 1831 Chapters I–II).

Chapter slugs follow the 1831 numbering (`1`…`24`), plus `cover`, `introduction`, `preface`, `letter-i`…`letter-iv`, `walton-in-continuation`.

## Getting started

```bash
npm install
npm run dev        # runs the preprocessing pipeline, then next dev
```

Other scripts:

```bash
npm run preprocess     # content/raw → content/processed (parse, align, diff)
npm run align:report   # flag paragraph rows that look misaligned
npm run build          # preprocess + next build
npm run lint
```

`content/processed/` is generated and gitignored; it's rebuilt by `dev` and `build`. Scripts or tests that import `lib/data.ts` need `npm run preprocess` first.

## How the text gets on the page

```
content/original/{1818,1831}/*.xhtml   Wikisource exports — archival, used once
        │  scripts/extract-html.ts      one-time bootstrap → Markdown
        ▼
content/raw/{1818,1831}.md             the curated source of truth (hand-corrected since)
        │  scripts/parse.ts             sections → paragraphs; [tag] markers give structure
        │  scripts/align.ts             pairs paragraphs across editions (see below)
        │  scripts/diff.ts              word-level LCS diff → equal / insert / delete
        │  scripts/build.ts             orchestrates; writes the chapter index
        ▼
content/processed/chapters.json, ch<slug>.json
```

**The Markdown is the text.** `content/raw/*.md` was extracted from Wikisource once and has been corrected by hand since; the extractor is not re-run. Structural roles are marked at the start of a paragraph — `[poem]`, `[salutation]`, `[dateline]`, `[closing]`, `[signature]`, `[book-title]` — and rendered accordingly.

**Alignment is data, not code.** Paragraphs are paired positionally within a chapter, then corrected by four JSON files in `content/`:

| File | What it does |
|---|---|
| `edition-alignment.json` | Maps 1818's volume-scoped chapters (`v2-1`) onto the canonical 1831 numbering (`9`). |
| `chapter-structure.json` | The chapter table: per-edition labels, volume breaks, notes. |
| `alignment-overrides.json` | `rows`: pins naming the paragraphs of one row by identity (`"1818": "v1-1/10", "1831": ["1/11", "2/1"]`; `null` leaves a row edition-only). Paragraphs pair off positionally between pins, so a pin only affects its neighbourhood. Each entry carries a `note` explaining the editorial reason. |
| `diff-units.json` | Which sections to compare as a single diff page when one edition split a chapter. |

Paragraphs are never split, merged, or reworded to make an alignment work: a paragraph is either paired whole with one paragraph of the other edition, or shown whole as edition-only.

If you spot a misaligned pair, `npm run align:report -- --chapter <slug> --window 8` scores every row and points at likely off-by-one shifts; the fix is a pin in `alignment-overrides.json`.

## Project structure

```
app/
  page.tsx                              homepage: edition cards + chapter table
  [edition]/chapter/[chapter]/page.tsx  Read view (static, one page per edition × section)
  chapter/[chapter]/page.tsx            legacy URLs → 308 redirect
  diff/[chapter]/page.tsx               Diff view
  about/page.tsx
components/   ChapterView, DiffView, ChapterNav, EditionSwitcher, EditionSelect, SectionStartMarker, …
lib/          types.ts · data.ts (reads processed JSON) · routes.ts (URL builders) · utils.tsx (rendering)
scripts/      the pipeline above, plus align-report.ts and extract-html.ts
content/      original/ · raw/ · processed/ · the four alignment files
```

Built with Next.js (App Router), TypeScript, Tailwind CSS v4, and Lucide. Server Components by default; client code only for interaction (theme, edition switching, sticky nav, scroll-spy). Deployed on Vercel — `npm run build` includes preprocessing, no extra configuration.

## Contributing

Corrections to the text and to paragraph alignment are the most useful contributions. Open an issue or a pull request; for text fixes, cite the source page so the change can be checked against the editions. Please keep the editions' spelling and punctuation as printed — only genuine transcription errors are fixed.

## License

The code is released under the [MIT License](LICENSE). The texts of *Frankenstein* (1818 and 1831) are in the public domain, sourced from [Wikisource](https://en.wikisource.org/wiki/Frankenstein,_or_the_Modern_Prometheus); the cover images used are likewise public domain.
