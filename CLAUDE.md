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
- Lint with `npm run lint` (`eslint-config-next` core-web-vitals + TypeScript). Don't let warnings accumulate. Tests are `node:test` run through `tsx` (`npm test`, files in `tests/`, excluded from `tsconfig.json` like `scripts/`); they cover the pipeline (`parse`, `align`, `diff`), which is pure — add whole-book invariants there rather than unit fixtures when a rule must hold for every paragraph. `npm test` preprocesses first and also checks the committed HTML snapshots in `tests/snapshots/` (every Diff and Read page's content, from `scripts/snapshot.ts`): after any change to the text, alignment, diff or rendering, run `npm run snapshot` and commit the result in the same PR, since that diff is how a reviewer sees the effect. GitHub Actions (`.github/workflows/test.yml`) runs `npm test` on every PR.
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

2026-10-18: the first outside contributions were reviewed, extended and merged, along with the follow-ups they prompted (all squash-merged and live):

- #19 (contributor): curly quotes hard-coded throughout `content/raw/`, plus transcription fixes, each checked against Project Gutenberg. #22 fixed what it exposed: its paragraph-break fixes had shifted four chapters' alignment by one (three pins that described those transcription errors removed; the 1818 Rimini footnote pinned as 1818-only). `\*` is now a literal asterisk in both renderers and the diff tokenizer, with a whole-book test that italic marks pair up; curly-apostrophe words are one diff token; footnotes sit right after their paragraph.
- #21 (contributor, plus one small commit of ours): the views are called "Read" and "Diff" everywhere (homepage button "Explore the diff"); About copy tightened and its dashes spaced.
- #23: `extract-html.ts` dropped the text of Wikisource `[sic]` spans. Fixed (its output now differs only in the six marked words), and 1831's printed "been been" restored.
- #24: the header's link labels are `sr-only` below `sm` instead of `display: none`, so screen readers can name the links.
- #25 (issue #20): `<ins>`/`<del>` are styled by element in `globals.css` (base layer); diff markup is plain `<ins title>`/`<del title>` with no wrapper spans. 32 full-page screenshots (8 pages, light/dark, desktop/phone) were byte-identical before and after (headless Chrome driven over the DevTools protocol; throwaway scripts, not committed).
- #26: HTML snapshots of every Diff and Read page's content are committed (`tests/snapshots/`, 91 files, written by `scripts/snapshot.ts`). `npm test` preprocesses first and fails on stale snapshots; GitHub Actions runs it on every PR, and its `test` check is now required in the trunk ruleset next to Vercel.

The #19 contributor was told on that PR that snapshots were coming (now #26) and asked what looked "all wrong" in Chapter I; no reply yet. The likely answer: 1831 rewrote Chapter I most, and between pins paragraphs pair by position, so many of its rows are weak (`npm run align:report` shows them).

Housekeeping: `npm run lint` has 4 errors (`CoverView` unescaped quotes ×2, `ThemeToggle` setState-in-effect, `extract-html.ts` prefer-const) and 5 warnings (`StickyChapterNav` ref in effect cleanup, unused variables in `extract-html.ts`). Lint stays out of CI until they are cleared.

### What's next

1. **Reply to the #19 contributor** (the user's comment): snapshots landed in #26; follow up on the Chapter I question.
2. **Similarity-based aligner** (roadmap item carried over): dynamic programming over a paragraph similarity score, allowing 1:0, 0:1, 1:1, 1:2, 2:1, so pins are only needed for judgment calls. Chapter I is the clearest case. The pin format in `alignment-overrides.json` is what it should emit; the whole-book tests and the snapshots are the safety net (a realignment shows row by row in the snapshot diff).
3. **Content:** fix the rows `npm run align:report` flags with a better neighbour (Cover rows 5/7, Chapter III 16/17; Chapter XXIII's was fixed in #22); look for other split/merged paragraphs that deserve a grouped row (the report's weak rows are the place to start). `content/` branch.
4. **Typography:** a hair space between adjacent quote marks (“‘ and ’”), added at render time rather than in the source so the diff never counts it. Agreed with the #19 contributor.
5. **Diff polish, if wanted:** a "moved" style for a deleted clause that reappears as an insertion in the same row (today it shows as delete + insert); look at the ¶ marker and note in light mode by eye (#25's screenshots compared them but nobody viewed them).
6. Smaller items: clear the lint errors, then add `npm run lint` to the CI workflow; optional `:target` tint for permalinked paragraphs; delete the Plausible site on the Plausible side; a "How it works" write-up (text never altered; alignment as an editorial layer with stated reasons; clause-anchored diff; grouped rows).
7. The Diff view is still server-rendered per request because it reads the edition cookie for the sidebar; if that ever matters, move the edition into the diff URL or read the cookie client-side so the page prerenders.

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

- **2026-10-18 — Printed misprints are reproduced, and Wikisource's `[sic]` marks are the evidence of what was printed.** Project Gutenberg silently corrects misprints, so it confirms wording but is not the reference for them (1831 "been been", "with with", "own Our"; 1818 "did not like. overcome").
- **2026-10-18 — In `content/raw/`, `\*` is a literal asterisk (footnote mark, the "* * *" for a name); a bare `*` always delimits italics. A footnote is its own paragraph right after the one carrying its mark.** A whole-book test enforces the pairing.
- **2026-10-18 — The two views are called "Read" and "Diff" everywhere in the UI (homepage button: "Explore the diff").** "Diff" was already the site's name for the view in most places, and the About page explains the term.
- **2026-10-18 — `<ins>` and `<del>` are styled by element (base layer of `globals.css`); the markup carries only a `title`.** Keeps the HTML readable by hand; any `<ins>`/`<del>` looks like a diff mark unless utility classes override it (the logo, the ¶ marker).
- **2026-10-18 — Commit HTML snapshots of each page's content, not `next build` output, and regenerate them in the same PR as any text, alignment, diff or rendering change.** Build output is mostly hashes and React data, and the Diff pages aren't prerendered; the snapshot diff is how a reviewer sees a change's effect. Enforced by the required `test` check.

### Active gotchas

API quirks, tooling surprises, and workarounds that still affect current work. Oldest at top.

When a gotcha is resolved, move the entry to `docs/GOTCHAS.md`. Same ~15-entry rule of thumb.

- **2026-08-24 — Re-running `scripts/extract-html.ts` overwrites the hand-corrected `content/raw/*.md`.** Treat the extractor as archival; diff before ever using its output. *(inferred from git history during adoption)*
- **2026-08-24 — `scripts/` is excluded from `tsconfig.json`, so type errors there only surface when `tsx` executes the script**, not from `next build` or the editor's project-wide check. Run `npm run preprocess` after any pipeline change. *(inferred during adoption)*
- **2026-08-24 — A fresh clone has no `content/processed/`;** `npm run dev`, `npm run build` and `npm test` (since #26) regenerate it, but ad-hoc scripts that import `lib/data.ts` must run `npm run preprocess` first. *(inferred during adoption)*
- **2026-08-24 — Running `npm run build` while `next dev` is up leaves the dev server serving stale Turbopack CSS** (new theme tokens missing, classes present in HTML but no rule). Both write under `.next/`. Fix: stop dev, `rm -rf .next`, `npm run dev`. Claude: check for a listening dev server (`lsof -iTCP:3000 -sTCP:LISTEN`) before building, and skip the build or ask.
- **2026-08-24 — `next dev` warns "Failed to find font override values for font `Manufacturing Consent`"**: Next has no metrics for that Google font, so it can't synthesise a size-matched fallback. `adjustFontFallback: false` is already set in `app/layout.tsx`; the warning is cosmetic and safe to ignore.
- **2026-08-24 — The `trunk` ruleset requires PR branches to be up to date with `trunk`:** a PR opened before another one merged is refused until it is updated (`gh pr update-branch <n>`) and its checks have re-run. Since 2026-10-18 the required checks are `Vercel` and `test` (GitHub Actions); merges fail transiently while either is pending, and `mergeStateStatus` can read `UNKNOWN` for a few seconds after they pass — retry.
- **2026-08-24 — On this machine `grep` is ugrep:** patterns starting with `--` are parsed as options and `{` is a regex metacharacter. Use `grep -F -e '<pattern>'` for literal strings, or Python, when checking compiled CSS.
- **2026-08-25 — GitHub closes a stacked PR when its base branch is deleted on merge** (`gh pr merge --squash --delete-branch` of the base PR closed the next one; a closed PR's base cannot be changed). Retarget stacked PRs to `trunk` *before* merging the PR below them. Merging without `--delete-branch` is no safeguard: the repo also deletes a merged PR's head branch automatically (seen 2026-10-18).
- **2026-08-25 — `gh pr checks --watch` right after a push reports "no checks reported" and returns immediately**, so a following `gh pr merge` is refused while Vercel is still pending. Poll until the Vercel check appears, then watch.
- **2026-08-25 — A second `next dev` refuses to start ("Unable to acquire lock at `.next/dev/lock`") while the user's dev server runs.** Port 3000 may belong to another project's server; find this repo's instance with `lsof -iTCP -sTCP:LISTEN` plus each pid's cwd (it was on 3001) and verify against that instead of starting another.
- **2026-10-18 — PRs from forks need a manual Vercel authorization for every pushed commit** (the link is in `gh pr checks <n>`), including commits a maintainer pushes to the fork's branch; a first-time contributor's GitHub Actions run needs approval too. When adding to a contributor's PR, merge trunk and commit locally, then push once, so it's authorized once.
- **2026-10-18 — `tsx` compiles JSX with the classic runtime in files outside `tsconfig.json`'s `include` (`scripts/`, `tests/`, scratch files): "React is not defined".** Use `createElement` there, as `scripts/snapshot.ts` does; the imported components themselves are compiled correctly.
