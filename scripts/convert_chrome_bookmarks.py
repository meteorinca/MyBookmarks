#!/usr/bin/env python3
"""
Chrome Bookmarks to JSON Converter
===================================

Converts Chrome's exported HTML bookmarks file to JSON format 
compatible with the Bookmark Viewer webapp.

Usage:
    python convert_chrome_bookmarks.py bookmarks.html
    python convert_chrome_bookmarks.py bookmarks.html --source "Chrome Desktop"
    python convert_chrome_bookmarks.py bookmarks.html --output my_bookmarks.json
    python convert_chrome_bookmarks.py bookmarks.html --split-by-folder
    python convert_chrome_bookmarks.py bookmarks.html --output-dir ../public/bm_json/

Chrome Export Instructions:
    1. Open Chrome
    2. Go to chrome://bookmarks
    3. Click ⋮ (three dots) in top right
    4. Select "Export bookmarks"
    5. Save the HTML file
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


class ChromeBookmarkParser(HTMLParser):
    """
    Parses Chrome's exported HTML bookmarks file.
    
    Chrome bookmark HTML structure:
    <DL>
        <DT><H3>Folder Name</H3>
            <DL>
                <DT><A HREF="url" ADD_DATE="timestamp">Title</A>
            </DL>
        </DT>
    </DL>
    """
    
    def __init__(self):
        super().__init__()
        self.bookmarks = []
        self.folder_stack = []  # Track nested folders
        self.current_bookmark = None
        self.in_anchor = False
        self.in_folder_title = False
        
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        
        if tag == 'h3':
            # Starting a folder title
            self.in_folder_title = True
            
        elif tag == 'a':
            # Starting a bookmark link
            self.in_anchor = True
            href = attrs_dict.get('href', '')
            add_date = attrs_dict.get('add_date', '')
            
            # Parse the timestamp (Chrome uses Unix timestamp in seconds)
            created_at = None
            if add_date:
                try:
                    timestamp = int(add_date)
                    created_at = datetime.fromtimestamp(timestamp).isoformat() + 'Z'
                except (ValueError, OSError):
                    pass
            
            self.current_bookmark = {
                'url': href,
                'created_at': created_at,
                'tags': list(self.folder_stack),  # Copy current folder path as tags
                'folder_path': '/'.join(self.folder_stack) if self.folder_stack else 'Uncategorized'
            }
            
        elif tag == 'dl':
            # Entering a new nested list (folder contents)
            pass
            
    def handle_endtag(self, tag):
        if tag == 'h3':
            self.in_folder_title = False
            
        elif tag == 'a':
            self.in_anchor = False
            if self.current_bookmark and self.current_bookmark.get('url'):
                # Only save bookmarks with valid URLs (skip javascript: etc)
                url = self.current_bookmark['url']
                if url.startswith(('http://', 'https://')):
                    self.bookmarks.append(self.current_bookmark)
            self.current_bookmark = None
            
        elif tag == 'dl':
            # Exiting a folder
            if self.folder_stack:
                self.folder_stack.pop()
                
    def handle_data(self, data):
        data = data.strip()
        if not data:
            return
            
        if self.in_folder_title:
            # This is a folder name
            self.folder_stack.append(data)
            
        elif self.in_anchor and self.current_bookmark:
            # This is a bookmark title
            self.current_bookmark['title'] = data


def extract_domain(url: str) -> str:
    """Extract clean domain from URL."""
    try:
        parsed = urlparse(url)
        domain = parsed.netloc
        return domain.replace('www.', '')
    except:
        return ''


def clean_tag(tag: str) -> str:
    """Clean and normalize a tag string."""
    # Remove special characters, convert to lowercase
    tag = re.sub(r'[^\w\s-]', '', tag.lower())
    tag = re.sub(r'\s+', '-', tag.strip())
    return tag


def generate_tags_from_url(url: str) -> list:
    """Generate potential tags from URL domain."""
    domain = extract_domain(url)
    if not domain:
        return []
    
    # Common domain-to-tag mappings
    tag_mappings = {
        'github.com': ['development', 'code'],
        'stackoverflow.com': ['development', 'qa'],
        'youtube.com': ['video', 'media'],
        'twitter.com': ['social'],
        'x.com': ['social'],
        'reddit.com': ['social', 'community'],
        'medium.com': ['blog', 'articles'],
        'dev.to': ['development', 'blog'],
        'docs.': ['documentation'],
        'learn.': ['learning', 'tutorial'],
        'news.': ['news'],
    }
    
    tags = []
    for pattern, mapped_tags in tag_mappings.items():
        if pattern in domain:
            tags.extend(mapped_tags)
            break
    
    return tags


def convert_bookmark(bookmark: dict, source: str) -> dict:
    """Convert parsed bookmark to webapp JSON format."""
    # Clean and dedupe tags
    folder_tags = [clean_tag(t) for t in bookmark.get('tags', []) if t]
    url_tags = generate_tags_from_url(bookmark.get('url', ''))
    
    # Combine and deduplicate tags
    all_tags = []
    seen = set()
    for tag in folder_tags + url_tags:
        if tag and tag not in seen:
            all_tags.append(tag)
            seen.add(tag)
    
    # Filter out generic folder names
    skip_tags = {'bookmarks-bar', 'bookmarks', 'other-bookmarks', 'mobile-bookmarks', 'imported'}
    all_tags = [t for t in all_tags if t not in skip_tags]
    
    return {
        'title': bookmark.get('title', 'Untitled'),
        'url': bookmark.get('url', ''),
        'tags': all_tags[:5],  # Limit to 5 tags
        'description': '',  # Chrome doesn't export descriptions
        'archived': False,
        'created_at': bookmark.get('created_at'),
        'source': source
    }


def parse_chrome_bookmarks(html_content: str) -> list:
    """Parse Chrome bookmarks HTML and return list of bookmarks."""
    parser = ChromeBookmarkParser()
    parser.feed(html_content)
    return parser.bookmarks


def group_by_folder(bookmarks: list) -> dict:
    """Group bookmarks by their top-level folder."""
    groups = {}
    for bookmark in bookmarks:
        folder_path = bookmark.get('folder_path', 'Uncategorized')
        # Get top-level folder
        top_folder = folder_path.split('/')[0] if folder_path else 'Uncategorized'
        
        if top_folder not in groups:
            groups[top_folder] = []
        groups[top_folder].append(bookmark)
    
    return groups


def save_json(data: dict, output_path: Path):
    """Save data as formatted JSON."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"✅ Saved: {output_path} ({len(data['items'])} bookmarks)")


def main():
    parser = argparse.ArgumentParser(
        description='Convert Chrome bookmarks HTML to JSON for Bookmark Viewer webapp',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s bookmarks.html
  %(prog)s bookmarks.html --source "Chrome Windows Desktop"
  %(prog)s bookmarks.html --split-by-folder --output-dir ../public/bm_json/
        """
    )
    
    parser.add_argument(
        'input_file',
        type=Path,
        help='Path to Chrome bookmarks HTML file'
    )
    
    parser.add_argument(
        '--source', '-s',
        type=str,
        default='Chrome Import',
        help='Source identifier for bookmarks (default: "Chrome Import")'
    )
    
    parser.add_argument(
        '--output', '-o',
        type=Path,
        default=None,
        help='Output JSON file path (default: <input_name>.json)'
    )
    
    parser.add_argument(
        '--output-dir', '-d',
        type=Path,
        default=None,
        help='Output directory for JSON files (used with --split-by-folder)'
    )
    
    parser.add_argument(
        '--split-by-folder',
        action='store_true',
        help='Create separate JSON files for each top-level folder'
    )
    
    parser.add_argument(
        '--min-bookmarks',
        type=int,
        default=1,
        help='Minimum bookmarks required to create a folder file (default: 1)'
    )
    
    args = parser.parse_args()
    
    # Validate input file
    if not args.input_file.exists():
        print(f"❌ Error: File not found: {args.input_file}")
        sys.exit(1)
    
    # Read and parse the HTML file
    print(f"📖 Reading: {args.input_file}")
    try:
        with open(args.input_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        sys.exit(1)
    
    # Parse bookmarks
    print("🔍 Parsing bookmarks...")
    raw_bookmarks = parse_chrome_bookmarks(html_content)
    print(f"   Found {len(raw_bookmarks)} bookmarks")
    
    if not raw_bookmarks:
        print("❌ No bookmarks found in file")
        sys.exit(1)
    
    # Convert to webapp format
    bookmarks = [convert_bookmark(b, args.source) for b in raw_bookmarks]
    
    # Determine output path(s)
    if args.output_dir:
        output_dir = args.output_dir
    else:
        output_dir = args.input_file.parent
    
    if args.split_by_folder:
        # Group by folder and save separately
        groups = group_by_folder(raw_bookmarks)
        print(f"📁 Found {len(groups)} folders")
        
        for folder_name, folder_bookmarks in groups.items():
            if len(folder_bookmarks) < args.min_bookmarks:
                print(f"   Skipping '{folder_name}' ({len(folder_bookmarks)} bookmarks < min {args.min_bookmarks})")
                continue
            
            # Convert bookmarks
            converted = [convert_bookmark(b, args.source) for b in folder_bookmarks]
            
            # Create safe filename
            safe_name = re.sub(r'[^\w\s-]', '', folder_name.lower())
            safe_name = re.sub(r'\s+', '_', safe_name.strip())
            if not safe_name:
                safe_name = 'uncategorized'
            
            output_data = {
                'title': folder_name,
                'items': converted
            }
            
            output_path = output_dir / f"{safe_name}.json"
            save_json(output_data, output_path)
    else:
        # Save all bookmarks to a single file
        if args.output:
            output_path = args.output
        else:
            output_path = output_dir / f"{args.input_file.stem}.json"
        
        output_data = {
            'title': f'Imported from {args.source}',
            'items': bookmarks
        }
        
        save_json(output_data, output_path)
    
    # Print summary
    print("\n📊 Summary:")
    print(f"   Total bookmarks processed: {len(bookmarks)}")
    
    # Count tags
    all_tags = set()
    for b in bookmarks:
        all_tags.update(b.get('tags', []))
    print(f"   Unique tags generated: {len(all_tags)}")
    
    # Show sample of tags
    if all_tags:
        sample_tags = list(all_tags)[:10]
        print(f"   Sample tags: {', '.join(sample_tags)}")
    
    print("\n✨ Done!")


if __name__ == '__main__':
    main()
