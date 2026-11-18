# victorosondu.com

Edit the site at https://app.pagescms.org (or victorosondu.com/admin): case studies, articles, homepage order and Writing order.

How it fits together:
- `content/` holds the editable content (one file per case study and article, plus the homepage and Writing order).
- `build/build.mjs` turns that content into the pages, sitemap and link preview images; Vercel runs it on every change (`npm run build`, output in `dist/`).
- Every other page (about, contact, packages...) is a normal HTML file in the repo root.
