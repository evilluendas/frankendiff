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
- Commits are authored as `hello@frankendiff.com` (repo-local `git config user.email`; the project address, not a personal one). The repository is public under the MIT License (`LICENSE`); the texts are public domain.
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
- Lint with `npm run lint` (`eslint-config-next` core-web-vitals + TypeScript). Don't let warnings accumulate. Tests are `node:test` run through `tsx` (`npm test`, files in `tests/`, excluded from `tsconfig.json` like `scripts/`); they cover the pipeline (`parse`, `align`, `diff`), which is pure — add whole-book invariants there rather than unit fixtures when a rule must hold for every paragraph.
- Typography and editorial restraint come first: generous whitespace, legible serif body text (Lora), restrained ornament. Light and dark modes must both be checked for any visual change.

### Content pipeline rules

- `content/raw/1818.md` and `content/raw/1831.md` are the **curated source of truth**. They were extracted once from Wikisource XHTML (`content/original/`) by `scripts/extract-html.ts` and have been hand-corrected since. **Never re-run `extract-html.ts` over them** without diffing the result against the current files and re-applying the hand edits.
- Structural roles are expressed with `[tag]` markers in the raw Markdown (`[poem]`, `[salutation]`, `[dateline]`, `[closing]`, `[signature]`, `[book-title]`). Use those rather than ad-hoc formatting.
- Cross-edition mapping lives in four JSON files under `content/`: `edition-alignment.json` (1818 volume-scoped slugs such as `v2-1` → canonical 1831 chapter numbers), `chapter-structure.json` (navigation rows and per-edition labels), `alignment-overrides.json` (`rows`: pins that name the paragraphs of one row by identity — `"1818": "v1-1/10"`, `"1831": ["1/11", "2/1"]`, or `null` for an edition-only row — each with a `note`; the number is the paragraph's Read-view permalink `#p<n>`; between pins paragraphs pair off positionally), and `diff-units.json` (when one edition split a chapter the other kept whole, list the sections to diff together as one unit — e.g. 1818 Chapter I vs 1831 Chapters I–II). Fix alignment there, not by editing the text to force a match.
- Paragraphs are never split, merged, or reworded to make an alignment work. A paragraph is shown whole: paired with one paragraph of the other edition, grouped with a neighbour when the other edition split or joined them (a pin listing two paragraphs on one side; the diff then shows the paragraph break as an insertion or deletion), or edition-only.
- After touching alignment data, run `npm run align:report` (optionally `--chapter <slug> --window 8`): it flags weak or one-sided rows that have a clearly better neighbour, the signature of an off-by-one.
- `content/processed/` is generated and gitignored. Never edit it; never commit it.
- Text fidelity beats tidiness: reproduce the editions' spelling, punctuation, and italics faithfully; only fix genuine transcription errors, and say so in the commit message.

### Integration rules

- Vercel builds with `npm run build`, which runs preprocessing first — no separate build step to configure. Preview deployments come from PRs.
- Analytics are Vercel Analytics and Vercel Speed Insights (both in `app/layout.tsx`); Plausible was removed on 2026-08-24. Do not add further trackers or cookies; the only cookie is the edition preference.

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

2026-08-25: a reader's detailed feedback on the diff coloring (`/diff/1`, `/diff/6`) drove three PRs, all squash-merged and live:

- PR #12 fixed a text-fidelity bug in the diff cleanup (a shared word between two same-type ops was duplicated on one side and lost on the other) and added the first tests: `npm test` (`node:test` via `tsx`, `tests/`), including whole-book invariants.
- PR #15 replaced the whole-paragraph word LCS with a two-level diff (`scripts/diff.ts`): clauses are aligned first (Needleman–Wunsch over shared words, Dice ≥ 0.45; merged 1:2/2:1/2:2/1:3/3:1 steps at ≥ 0.6 absorb moved punctuation), paired clauses are diffed with a weighted word LCS (word 100, punctuation 50, whitespace 1), any deletion/insertion run keeps long shared phrases (≥ 20 chars, ≥ 4 words) as anchors, and runs are normalised to red-then-green with shared whitespace/delimiters factored out. Book-wide: 10 rows went from full replacement to partial, none the other way.
- PR #14 let a row hold several paragraphs per edition (`paragraphs: Partial<Record<Edition, BookParagraph[]>>`) so a paragraph one edition split or joined is diffed as one unit; the break renders as an inline tinted ¶ (`ParagraphBreakMarker`), preceded by the chapter note when a chapter begins there ("…; in 1818 the paragraph continues"). `content/alignment-overrides.json` changed to identity pins (`rows`, see the content-pipeline rules); the 49 row-number entries became 26 pins that reproduce the previous 831 rows exactly, plus two content pins in Chapter I (the Elizabeth 1:2 and the electricity 2:1). Diff sidebar widened to `w-64`.

The user is replying to the reader (draft agreed in session; it says the tool is AI-built and links the repo). Light mode of the ¶ marker and the reordered note was checked only through markup, not by eye.

Housekeeping still open: `instructions.md` is the original scaffold prompt (candidate for `docs/` cleanup); `npm run lint` keeps its 4 pre-existing errors (About page unescaped quotes, `ThemeToggle` setState-in-effect, `extract-html.ts` prefer-const).

### What's next

1. **Similarity-based aligner** (roadmap item carried over): dynamic programming over a paragraph similarity score, allowing 1:0, 0:1, 1:1, 1:2, 2:1, so pins are only needed for judgment calls. The pin format in `alignment-overrides.json` is what it should emit; the whole-book tests in `tests/pipeline.test.ts` are the safety net.
2. **Content:** fix the rows `npm run align:report` flags with a better neighbour (Cover rows 5/7, Chapter III 16/17, Chapter XXIII 21); look for other split/merged paragraphs that deserve a grouped row (the report's weak rows are the place to start). `content/` branch.
3. **Diff polish, if wanted:** a "moved" style for a deleted clause that reappears as an insertion in the same row (the reader's permutation question; today it shows as delete + insert); check the ¶ marker and note in light mode by eye.
4. Smaller items: optional `:target` tint for permalinked paragraphs; clear the 4 lint errors; delete the Plausible site on the Plausible side; a "How it works" write-up (text never altered; alignment as an editorial layer with stated reasons; clause-anchored diff; grouped rows).
5. The Diff view is still server-rendered per request because it reads the edition cookie for the sidebar; if that ever matters, move the edition into the diff URL or read the cookie client-side so the page prerenders.

### Active decisions

Decisions that currently shape how the project works. Each entry: date, decision, one-line rationale. Oldest at top.

When a decision is superseded, reverted, or no longer applies, move the entry to `docs/DECISIONS.md` with a status note rather than deleting it. If this list grows past ~15 entries, review and archive.

- **2026-08-24 — Compare 1818 and 1831 only; 1823 is excluded.** The 1823 edition mostly fixes typography; the editorial story is 1818 vs 1831. Explained on the About page. *(codified during adoption — predates this entry)*
- **2026-08-24 — Two reading modes only: Read (`/[edition]/chapter/[slug]`) and Diff (`/diff/[slug]`).** A side-by-side view was built and removed on 2026-03-13 as not useful. *(codified during adoption — predates this entry)*
- **2026-08-24 — Everything is precomputed at build time; no database, no runtime diffing.** The text never changes, so static generation gives the fastest, simplest site. *(codified during adoption — predates this entry)*
- **2026-08-24 — `content/raw/*.md` is the hand-curated source of truth, not the Wikisource XHTML.** Extraction was a one-time bootstrap; corrections since then live only in the Markdown. *(codified during adoption — predates this entry)*
- **2026-08-24 — Canonical chapter slugs follow the 1831 numbering; 1818 volume chapters map onto them via `edition-alignment.json`.** Gives one URL per chapter across both editions. *(codified during adoption — predates this entry)*
- **2026-08-24 — Git conventions switched at adoption: squash-and-merge via PR only, Conventional Commits, `feature/`-style branches.** Earlier history used merge commits, direct commits, and `add/` branches; left untouched.
- **2026-08-24 — When one edition split a chapter the other kept whole, diff the whole chapter against all its pieces as one unit (`content/diff-units.json`) and mark where each piece begins.** Chosen over splitting the 1818 chapter: no paragraph straddles a boundary, both Read views stay faithful, and the diff tells one continuous story. Paragraphs are never split or reworded to make alignment work.
- **2026-08-24 — The Diff sidebar lists whichever edition's chapters the shared `frankendiff_edition` cookie says (dropdown at the top; default 1818 like the Read view); inside a unit the highlight follows scroll.** The diff itself is always 1818 → 1831.
- **2026-08-24 — In-page navigation jumps instantly; no smooth scrolling.** Every other navigation on the site is an instant cut, and smooth scroll would give the same control two behaviours depending on invisible state.
- **2026-08-24 — New theme tokens: `note-*` (highlighter yellow) for editorial notes, `ease-spring` for small reveals. Selected states reuse the diff's `ins` green rather than a new accent or a full inversion.**
- **2026-08-24 — Read URLs carry the edition in the path (`/1818/chapter/22`); the diff stays edition-less (`/diff/22`).** Makes Read pages fully static and the URL readable. Legacy `/chapter/<slug>?edition=` URLs 308 to the new shape; bare/invalid → 1818, never cookie-dependent (browsers cache permanent redirects). All Read links go through `lib/routes.ts`.
- **2026-08-24 — Paragraph permalinks are `#p<n>`, the 1-based position within the edition's section.** Stable across alignment changes; the URL already names edition and chapter.

- **2026-08-25 — The diff is two-level: clauses are aligned first, then words inside paired clauses; long shared phrases survive as anchors anywhere; one consistent threshold, never per-passage colouring.** Reader sketches are test cases for what the rules should produce, not edits applied by hand. Moved sentences still show as delete + insert.
- **2026-08-25 — Red always precedes green within a run, and shared whitespace/delimiters stay outside the coloured boxes** (`one [-adored-]{+loved+}`, `word[-old-]{+new+}.`).
- **2026-08-25 — A row may group several paragraphs of one edition when the other split or joined them; the break is a diff op, rendered as an inline tinted ¶ at the head of the paragraph it opens.** Where a chapter begins at that break, the yellow note comes first (it is about the boundary) and says the other edition's paragraph continues; the ¶ follows (it is part of the change). Paragraphs are still never split or reworded.
- **2026-08-25 — Alignment overrides pin rows by paragraph identity (`section/n`, the permalink number); paragraphs pair off positionally between pins.** Replaces row-number overrides and cumulative chapter shifts, which renumbered everything after an edit. A pin spanning two sections resolves only inside its diff unit.
- **2026-08-25 — Tests are `node:test` via `tsx`, favouring whole-book invariants over fixtures** (every pin resolves; every paragraph once per file in reading order; every unit section start marked; every row diff reconstructs both texts).

### Active gotchas

API quirks, tooling surprises, and workarounds that still affect current work. Oldest at top.

When a gotcha is resolved, move the entry to `docs/GOTCHAS.md`. Same ~15-entry rule of thumb.

- **2026-08-24 — Re-running `scripts/extract-html.ts` overwrites the hand-corrected `content/raw/*.md`.** Treat the extractor as archival; diff before ever using its output. *(inferred from git history during adoption)*
- **2026-08-24 — `scripts/` is excluded from `tsconfig.json`, so type errors there only surface when `tsx` executes the script**, not from `next build` or the editor's project-wide check. Run `npm run preprocess` after any pipeline change. *(inferred during adoption)*
- **2026-08-24 — A fresh clone has no `content/processed/`;** `npm run dev` and `npm run build` regenerate it, but ad-hoc scripts or tests that import `lib/data.ts` must run `npm run preprocess` first. *(inferred during adoption)*
- **2026-08-24 — Running `npm run build` while `next dev` is up leaves the dev server serving stale Turbopack CSS** (new theme tokens missing, classes present in HTML but no rule). Both write under `.next/`. Fix: stop dev, `rm -rf .next`, `npm run dev`. Claude: check for a listening dev server (`lsof -iTCP:3000 -sTCP:LISTEN`) before building, and skip the build or ask.
- **2026-08-24 — `next dev` warns "Failed to find font override values for font `Manufacturing Consent`"**: Next has no metrics for that Google font, so it can't synthesise a size-matched fallback. `adjustFontFallback: false` is already set in `app/layout.tsx`; the warning is cosmetic and safe to ignore.
- **2026-08-24 — The `trunk` ruleset requires PR branches to be up to date with `trunk`:** a PR opened before another one merged is refused until it is updated (`gh pr update-branch <n>`) and Vercel has re-run. Merges also fail transiently while the Vercel check is pending — retry after it passes.
- **2026-08-24 — On this machine `grep` is ugrep:** patterns starting with `--` are parsed as options and `{` is a regex metacharacter. Use `grep -F -e '<pattern>'` for literal strings, or Python, when checking compiled CSS.
- **2026-08-25 — GitHub closes a stacked PR when its base branch is deleted on merge** (`gh pr merge --squash --delete-branch` of the base PR closed the next one; a closed PR's base cannot be changed). Retarget stacked PRs to `trunk` *before* merging the PR below them, or merge without `--delete-branch`.
- **2026-08-25 — `gh pr checks --watch` right after a push reports "no checks reported" and returns immediately**, so a following `gh pr merge` is refused while Vercel is still pending. Poll until the Vercel check appears, then watch.
- **2026-08-25 — A second `next dev` refuses to start ("Unable to acquire lock at `.next/dev/lock`") while the user's dev server runs.** Port 3000 may belong to another project's server; find this repo's instance with `lsof -iTCP -sTCP:LISTEN` plus each pid's cwd (it was on 3001) and verify against that instead of starting another.
