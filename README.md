# 📘 Bookmark Viewer

A super-fast, minimalist bookmark viewer inspired by Hacker News. It scans JSON files in `public/bm_json/` and displays bookmarks in a clean, responsive layout — no backend required.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-green.svg)

## ✨ Features

- **Zero Backend** - Pure client-side JavaScript
- **JSON-Based Storage** - Easy to manage and version control
- **Tag Filtering** - Filter bookmarks by tags
- **Search** - Quick search through all bookmarks
- **Random Bookmark** - Discover a random bookmark
- **Responsive Design** - Works on desktop and mobile
- **Minimal Aesthetic** - Clean, Hacker News-inspired UI

## 🗂 Folder Structure

```
/
├── index.html          # Main page
├── styles.css          # Styling
├── script.js           # Core functionality
├── README.md           # This file
└── public/
    └── bm_json/
        ├── bookmarks_1.json
        ├── bookmarks_2.json
        └── ...
```

## 🧩 JSON Format

Each JSON file should follow this format:

```json
{
  "title": "My Bookmarks",
  "items": [
    {
      "title": "Perplexity AI",
      "url": "https://www.perplexity.ai",
      "tags": ["ai", "search"],
      "description": "Perplexity AI is a search engine that uses AI to find answers.",
      "archived": false,
      "created_at": "2022-01-01T00:00:00Z",
      "source": "MacBook Pro 2020 Firefox"
    }
  ]
}
```

## 🚀 Deployment

### GitHub Pages

1. Push your files to a GitHub repository
2. Go to **Settings → Pages → Source → main branch (/ root)**
3. Access your viewer at `https://<username>.github.io/<repo-name>/`

### Local Development

Simply open `index.html` in your browser (use a local server for best results):

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve
```

## 📝 Adding Bookmarks

1. Create a new `.json` file in `public/bm_json/`
2. Follow the JSON format above
3. Commit and push to update your site

## 📄 License

MIT License - feel free to use and modify as you wish.
