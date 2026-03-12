I want to build a small editorial web project about Mary Shelley's Frankenstein, using Next.js, TypeScript, and deployed on Vercel.

The core idea:
This site compares the 1818, 1823 and 1831 editions of Frankenstein. I want users to be able to read one, two, or the three versions side by side, paragraph by paragraph, and also inspect the textual differences in a diff-style view.

This is a public-domain text project, so the content is static and does not change over time. Because of that, I want the architecture to prioritize:
- static generation
- very fast performance
- minimal client-side JavaScript
- clean and maintainable code
- a data pipeline that preprocesses and aligns the two texts at build time rather than computing expensive diffs at runtime

Please help me scaffold this project.

Technical requirements:
- Next.js latest stable version with App Router
- TypeScript
- No database for now
- Suitable for deployment on Vercel
- Use mostly Server Components unless client components are truly needed
- Keep the UI simple, elegant, editorial, and easy to extend later. Use Tailwind for the styling with a custom theme, support light and dark modes, and use Lucide for the icons.

Project goals:
1. Store two source texts:
   - Frankenstein 1818 edition
   - Frankenstein 1831 edition
2. Parse them into structured data:
   - edition
   - chapter
   - paragraph
   - stable id
   - text
3. Build an alignment layer between the two editions, ideally at the paragraph level
4. Precompute diffs during build time
5. Render a website with:
   - a homepage
   - a chapter-based comparison view
   - a side-by-side reading view
   - a diff view showing insertions/deletions clearly
6. Make the architecture flexible enough to support future features like:
   - “changes only” mode
   - annotations
   - search
   - manual alignment overrides
   - alternate display modes

Please generate the initial codebase structure and implement a first working version.

I want the project structure to look roughly like this:

- /app
  - /page.tsx
  - /chapter/[chapter]/page.tsx
  - /diff/[chapter]/page.tsx
- /components
- /lib
- /scripts
- /content
  - /raw
  - /processed

Please do the following:

1. Create the initial Next.js app structure
2. Create TypeScript types for:
   - BookParagraph
   - AlignedParagraphPair
   - DiffToken or DiffOp
3. Create placeholder content files and example processed JSON data so the app can run even before I add the full text
4. Create a small build/preprocessing pipeline in /scripts that:
   - reads raw text files from /content/raw
   - splits them into chapters and paragraphs
   - outputs structured JSON into /content/processed
   - includes a place for future alignment logic
   - includes a place for future diff generation logic
5. Add npm scripts so preprocessing runs before build
6. Build a minimal but polished UI with:
   - a homepage explaining the project
   - chapter navigation
   - a comparison page showing both editions side by side
   - a diff page showing highlighted insertions and deletions
7. Use a clean, editorial design aesthetic:
   - generous whitespace
   - readable typography
   - restrained visual styling
   - emphasis on text legibility
8. Keep the implementation simple and realistic:
   - no overengineering
   - no unnecessary libraries
   - comments only where useful
   - code should be easy to modify

Important architectural preferences:
- Do not use a database
- Do not compute paragraph diffs on every request if it can be avoided
- Precompute as much as possible
- Prefer JSON data files generated during preprocessing
- Make chapter pages statically generated where possible
- Keep data-loading helpers in /lib
- Keep preprocessing logic outside the runtime app

For the first version, you can make a naive alignment assumption:
- paragraph N from 1818 aligns with paragraph N from 1831 within the same chapter
- but design the types and code so manual overrides can be added later

For the diff rendering:
- create a simple structured diff format such as:
  - equal
  - insert
  - delete
- even if the first implementation is naive, structure it in a way that can be improved later

Please produce:
- the folder structure
- the main files
- the core components
- the preprocessing script
- the data-loading utilities
- enough example data for me to run and inspect the app locally

Also:
- explain briefly where I should place the raw texts
- explain how I should run the preprocessing step
- explain how I should deploy it to Vercel

Do not just describe the architecture — actually generate the code for the first version.