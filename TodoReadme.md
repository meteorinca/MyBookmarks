

> ## 📘 Bookmark Viewer  
> A super‑fast, minimalist bookmark viewer inspired by Hacker News. It scans JSON files in `public/bm_json/` and displays bookmarks in a clean, responsive layout — no backend required.

### 🗂 Folder Structure
```
/
├── index.html
├── styles.css
├── script.js
└── public/
    └── bm_json/
        ├── bookmarks_1.json
        ├── bookmarks_2.json
        └── ...
```

### 🧩 JSON Format
Each JSON file should follow this format:
```json
{
  "title": "My Bookmarks",
  "items": [
    {
      "title": "Perplexity AI",
      "url": "https://www.perplexity.ai",
      "tags": ["ai", "search"]
      "description": "Perplexity AI is a search engine that uses AI to find answers to your questions."
      "archived": false
      "created_at": "2022-01-01T00:00:00Z"
      "source": "MacbookPro 2020 Firefox"
    },
    ....
  ]
}
```

### ✅ TODO
- [ ] Write `script.js` to:
  - Fetch all `.json` files from `/public/bm_json/`.
  - Merge and render them into an HTML list.
  - Optionally add tag filtering or search.
- [ ] Style `styles.css` for a **Hacker News‑like** minimal aesthetic:
  - Simple typography (`font-family: monospace` or sans‑serif).
  - Neutral background, low‑contrast link colors.
  - Responsive list layout.
- [ ] Add loading indicator for JSON fetch.
- [ ] Host on GitHub Pages (ensure folder structure matches).
- [ ] Optimize load speed (use async fetching + minimal CSS).

### 🚀 Deployment
1. Commit your files to a GitHub repo.  
2. Enable GitHub Pages under **Settings → Pages → Source → main branch (/root)**.  
3. Access your viewer at `https://<username>.github.io/<repo-name>/`.

***

Would you like me to include a minimal working example (`index.html`, `script.js`, and `styles.css`) to go with this README?