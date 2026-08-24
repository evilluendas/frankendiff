# Frankendiff — Claude operating manual

Frankendiff is a statically-generated editorial reading tool for Mary Shelley's *Frankenstein*. Readers can read the 1818 or the 1831 edition chapter by chapter, switch editions at any point, and see every insertion and deletion between them inline in a diff view. All text processing — extraction from Wikisource, parsing, paragraph alignment, word-level LCS diffing — happens at build time; the runtime app is mostly Server Components reading precomputed JSON. Public site, deployed on Vercel.

Full product and architecture spec lives in `docs/BRIEF.md` — read that when you need context on *what* to build. This file covers *how* to work on the project.

---

## Permanent rules

These rules apply to every action Claude takes on this project. Do not violate them without explicit approval from the user in the current session.

### Secrets hygiene (non-negotiable)

- No credentials, API keys, tokens, personal URLs, usernames, or identifying data anywhere in the repo. Not in source, not in comments, not in commit messages, not in test fixtures, not in screenshots, not in issue or PR descriptions, and not in `CLAUDE.md`, `docs/BRIEF.md`, `docs/DECISIONS.md`, or `docs/GOTCHAS.md`. Project memory files follow the same discipline as source code.
- Credentials at runtime live in environment variables (Vercel project settings locally pulled via `vercel env pull`), never in checked-in config files. Never logged.
- When illustrating example URLs or values in docs/code comments, use `https://example.com`, `username`, `apikey`, etc. Never real values.
- Before every commit, mentally grep: would anything in this diff reveal identifying information or secrets? If yes, stop.
- **Entry sanitization.** When writing a decision or gotcha entry, describe the *shape* of a problem, not the specific data that triggered it.

### Git workflow

- Default branch is **`trunk`**. All tooling, CI, and docs reference it.
- `trunk` is always shippable — Vercel deploys it to production. Never commit directly to it. (History before adoption on 2026-08-24 contains direct commits and merge commits; leave it as is.)
- Every change goes on a branch: `feature/<kebab>`, `fix/<kebab>`, `chore/<kebab>`, `docs/<kebab>`, `refactor/<kebab>`, `content/<kebab>` (for text/alignment edits).
- One logical change per branch. Open a PR for every branch, even solo work. Merge via **squash-and-merge**.
- Commit messages: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `content:`) adopted from 2026-08-24 onward. English, imperative mood. Body explains *why* when non-obvious. Examples:
  - `feat(diff): add changes-only toggle`
  - `fix(nav): keep sticky edition switcher above the chapter FAB`
  - `content(1831): restore missing stanza in Letter IV`
  - `docs: update CLAUDE.md state after <session description>`

### Code conventions

- Next.js 16 App Router, React 19, TypeScript `strict`. Tailwind CSS v4 with the custom theme in `app/globals.css` (semantic tokens such as `bg-bg`, `text-fg`); Lucide for icons.
- Server Components by default. Add `'use client'` only for genuine interaction (theme toggle, edition switcher/cookie sync, sticky nav, FAB). Keep client bundles small — the site's whole point is fast, mostly-static text.
- All chapter and diff pages are statically generated. No database, no runtime diffing, no API routes for content. Anything expensive is precomputed by `npm run preprocess`.
- Preprocessing lives in `scripts/` (run with `tsx`; excluded from `tsconfig.json`, so `next build` does not type-check it — keep the functions pure and small, and run `npm run preprocess` after touching them). Runtime data loading lives in `lib/`; shared types in `lib/types.ts`.
- Model all content as the typed structures in `lib/types.ts` (`BookParagraph`, `AlignedParagraphGroup`, `DiffOp`, `ChapterMeta`). No untyped JSON access.
- Lint with `npm run lint` (`eslint-config-next` core-web-vitals + TypeScript). Don't let warnings accumulate. No test framework yet; if tests are added, start with the pipeline (`parse`, `align`, `diff`) which is pure and easy to cover.
- Typography and editorial restraint come first: generous whitespace, legible serif body text (Lora), restrained ornament. Light and dark modes must both be checked for any visual change.

### Content pipeline rules

- `content/raw/1818.md` and `content/raw/1831.md` are the **curated source of truth**. They were extracted once from Wikisource XHTML (`content/original/`) by `scripts/extract-html.ts` and have been hand-corrected since. **Never re-run `extract-html.ts` over them** without diffing the result against the current files and re-applying the hand edits.
- Structural roles are expressed with `[tag]` markers in the raw Markdown (`[poem]`, `[salutation]`, `[dateline]`, `[closing]`, `[signature]`, `[book-title]`). Use those rather than ad-hoc formatting.
- Cross-edition mapping lives in four JSON files under `content/`: `edition-alignment.json` (1818 volume-scoped slugs such as `v2-1` → canonical 1831 chapter numbers), `chapter-structure.json` (navigation rows and per-edition labels), `alignment-overrides.json` (`rowOverrides` and `chapterShifts` for paragraph alignment, each with a `note`), and `diff-units.json` (when one edition split a chapter the other kept whole, list the sections to diff together as one unit — e.g. 1818 Chapter I vs 1831 Chapters I–II). Fix alignment there, not by editing the text to force a match.
- Paragraphs are never split, merged, or reworded to make an alignment work. A paragraph is either paired whole with one paragraph of the other edition or shown whole as edition-only.
- After touching alignment data, run `npm run align:report` (optionally `--chapter <slug> --window 8`): it flags weak or one-sided rows that have a clearly better neighbour, the signature of an off-by-one.
- `content/processed/` is generated and gitignored. Never edit it; never commit it.
- Text fidelity beats tidiness: reproduce the editions' spelling, punctuation, and italics faithfully; only fix genuine transcription errors, and say so in the commit message.

### Integration rules

- Vercel builds with `npm run build`, which runs preprocessing first — no separate build step to configure. Preview deployments come from PRs.
- Analytics are Plausible (script in `app/layout.tsx`), Vercel Analytics, and Vercel Speed Insights. Do not add further trackers or cookies; the only cookie is the edition preference.

### Dependencies

- Prefer stdlib, Next.js, and hand-rolled helpers. Current runtime deps are intentionally just Next/React, Lucide, and the two Vercel packages.
- Before adding any third-party dependency, stop and ask.

### Product decisions

- When you hit a question that affects user-visible behavior or editorial presentation and isn't answered by `docs/BRIEF.md`, stop and ask.
- When an assumption is forced (e.g. how a paragraph should align), flag it explicitly in the code/JSON `note` and in the PR description.

### Session rituals

- **At session start**, the user typically types `/catch-up`. Follow that skill's procedure to orient yourself and propose next steps before writing code.
- **At session end**, the user types `/wrap` (or you proactively suggest it at natural checkpoints). That skill updates the "Project state" section of this file, archives obsolete entries to `docs/DECISIONS.md` / `docs/GOTCHAS.md`, commits, and pushes.
- Do not start new feature work after `/wrap` has been invoked.

### Working style

- Plan before coding. On receiving a new piece of work, propose the approach and wait for approval before editing files.
- Small, reviewable increments. Five 200-line PRs beat one 1000-line PR.
- PR descriptions explain trade-offs, alternatives considered, and anything worth scrutinizing.
- Flag uncertainty explicitly. If you're guessing, say so.

---

## Project state

This section is dynamic. Update it via `/wrap` at the end of each session.

### Current state

Existing project, adopted 2026-08-24. 43 commits on `trunk` since 2026-03-12; last commit `dd1e07c` "Merge pull request #3 from evilluendas/add/vercel-analytics". Working tree clean. Site is live with Read and Diff modes, custom covers, About page, light/dark theme, analytics.

Housekeeping worth knowing: `README.md` predates the current pipeline (still describes purely positional alignment and a flat overrides file) and `instructions.md` is the original scaffold prompt — both are candidates for a `docs/` cleanup.

### What's next

Confirm adoption, then resume normal work. Use `/catch-up` to get oriented in a future session.

### Active decisions

Decisions that currently shape how the project works. Each entry: date, decision, one-line rationale. Oldest at top.

When a decision is superseded, reverted, or no longer applies, move the entry to `docs/DECISIONS.md` with a status note rather than deleting it. If this list grows past ~15 entries, review and archive.

- **2026-08-24 — Compare 1818 and 1831 only; 1823 is excluded.** The 1823 edition mostly fixes typography; the editorial story is 1818 vs 1831. Explained on the About page. *(codified during adoption — predates this entry)*
- **2026-08-24 — Two reading modes only: Read (`/chapter/[slug]`) and Diff (`/diff/[slug]`).** A side-by-side view was built and removed on 2026-03-13 as not useful. *(codified during adoption — predates this entry)*
- **2026-08-24 — Everything is precomputed at build time; no database, no runtime diffing.** The text never changes, so static generation gives the fastest, simplest site. *(codified during adoption — predates this entry)*
- **2026-08-24 — `content/raw/*.md` is the hand-curated source of truth, not the Wikisource XHTML.** Extraction was a one-time bootstrap; corrections since then live only in the Markdown. *(codified during adoption — predates this entry)*
- **2026-08-24 — Canonical chapter slugs follow the 1831 numbering; 1818 volume chapters map onto them via `edition-alignment.json`.** Gives one URL per chapter across both editions. *(codified during adoption — predates this entry)*
- **2026-08-24 — Git conventions switched at adoption: squash-and-merge via PR only, Conventional Commits, `feature/`-style branches.** Earlier history used merge commits, direct commits, and `add/` branches; left untouched.

### Active gotchas

API quirks, tooling surprises, and workarounds that still affect current work. Oldest at top.

When a gotcha is resolved, move the entry to `docs/GOTCHAS.md`. Same ~15-entry rule of thumb.

- **2026-08-24 — Re-running `scripts/extract-html.ts` overwrites the hand-corrected `content/raw/*.md`.** Treat the extractor as archival; diff before ever using its output. *(inferred from git history during adoption)*
- **2026-08-24 — `scripts/` is excluded from `tsconfig.json`, so type errors there only surface when `tsx` executes the script**, not from `next build` or the editor's project-wide check. Run `npm run preprocess` after any pipeline change. *(inferred during adoption)*
- **2026-08-24 — A fresh clone has no `content/processed/`;** `npm run dev` and `npm run build` regenerate it, but ad-hoc scripts or tests that import `lib/data.ts` must run `npm run preprocess` first. *(inferred during adoption)*
- **2026-08-24 — Running `npm run build` while `next dev` is up leaves the dev server serving stale Turbopack CSS** (new theme tokens missing, classes present in HTML but no rule). Both write under `.next/`. Fix: stop dev, `rm -rf .next`, `npm run dev`. Claude: check for a listening dev server (`lsof -iTCP:3000 -sTCP:LISTEN`) before building, and skip the build or ask.
- **2026-08-24 — `next dev` warns "Failed to find font override values for font `Manufacturing Consent`"**: Next has no metrics for that Google font, so it can't synthesise a size-matched fallback. `adjustFontFallback: false` is already set in `app/layout.tsx`; the warning is cosmetic and safe to ignore.
