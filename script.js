/**
 * Bookmark Viewer
 * A minimalist bookmark viewer inspired by Hacker News
 */

// ============================================
// Configuration
// ============================================
const CONFIG = {
    jsonPath: 'public/bm_json/',
    // List of JSON files to load (GitHub Pages doesn't support directory listing)
    jsonFiles: [
        'sample_bookmarks.json',
        'dev_resources.json'
    ]
};

// ============================================
// State
// ============================================
let allBookmarks = [];
let filteredBookmarks = [];
let activeTag = null;
let currentSort = 'title-asc';
let searchQuery = '';

// ============================================
// DOM Elements
// ============================================
const elements = {
    bookmarkList: document.getElementById('bookmark-list'),
    searchInput: document.getElementById('search-input'),
    clearSearch: document.getElementById('clear-search'),
    tagFilters: document.getElementById('tag-filters'),
    sortSelect: document.getElementById('sort-select'),
    randomBtn: document.getElementById('random-btn'),
    loading: document.getElementById('loading'),
    errorMessage: document.getElementById('error-message'),
    bookmarkCount: document.getElementById('bookmark-count'),
    sourceCount: document.getElementById('source-count')
};

// ============================================
// Utility Functions
// ============================================

/**
 * Extract domain from URL
 */
function extractDomain(url) {
    try {
        const domain = new URL(url).hostname;
        return domain.replace('www.', '');
    } catch {
        return url;
    }
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return dateString;
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Highlight search matches in text
 */
function highlightText(text, query) {
    if (!query) return escapeHtml(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return escapeHtml(text).replace(regex, '<span class="highlight">$1</span>');
}

/**
 * Debounce function for search
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// Data Loading
// ============================================

/**
 * Fetch all JSON files and merge bookmarks
 */
async function loadBookmarks() {
    showLoading(true);
    hideError();
    
    try {
        const fetchPromises = CONFIG.jsonFiles.map(async (file) => {
            const response = await fetch(`${CONFIG.jsonPath}${file}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${file}`);
            }
            return response.json();
        });
        
        const results = await Promise.allSettled(fetchPromises);
        
        // Merge all bookmarks from successful fetches
        allBookmarks = [];
        let loadedFiles = 0;
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.items) {
                // Add source file info to each bookmark
                result.value.items.forEach(item => {
                    item._sourceFile = CONFIG.jsonFiles[index];
                });
                allBookmarks = allBookmarks.concat(result.value.items);
                loadedFiles++;
            }
        });
        
        if (loadedFiles === 0) {
            throw new Error('No bookmark files could be loaded');
        }
        
        // Initialize the UI
        initializeUI();
        
    } catch (error) {
        console.error('Error loading bookmarks:', error);
        showError(`Failed to load bookmarks: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// ============================================
// UI Functions
// ============================================

/**
 * Show/hide loading indicator
 */
function showLoading(show) {
    elements.loading.classList.toggle('visible', show);
}

/**
 * Show error message
 */
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.add('visible');
}

/**
 * Hide error message
 */
function hideError() {
    elements.errorMessage.classList.remove('visible');
}

/**
 * Initialize UI after data is loaded
 */
function initializeUI() {
    buildTagFilters();
    updateStats();
    applyFiltersAndSort();
}

/**
 * Build tag filter buttons
 */
function buildTagFilters() {
    // Count tags
    const tagCounts = {};
    allBookmarks.forEach(bookmark => {
        (bookmark.tags || []).forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });
    
    // Sort tags by count (descending)
    const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1]);
    
    // Create "All" button
    let html = `
        <button class="tag-filter active" data-tag="">
            All <span class="tag-count">(${allBookmarks.length})</span>
        </button>
    `;
    
    // Create tag buttons
    sortedTags.forEach(([tag, count]) => {
        html += `
            <button class="tag-filter" data-tag="${escapeHtml(tag)}">
                ${escapeHtml(tag)} <span class="tag-count">(${count})</span>
            </button>
        `;
    });
    
    elements.tagFilters.innerHTML = html;
    
    // Add click handlers
    elements.tagFilters.querySelectorAll('.tag-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            elements.tagFilters.querySelectorAll('.tag-filter').forEach(b => {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            
            // Set active tag and filter
            activeTag = btn.dataset.tag || null;
            applyFiltersAndSort();
        });
    });
}

/**
 * Update statistics display
 */
function updateStats() {
    const count = filteredBookmarks.length;
    elements.bookmarkCount.textContent = `${count} bookmark${count !== 1 ? 's' : ''}`;
    
    // Count unique sources
    const sources = new Set(allBookmarks.map(b => b.source).filter(Boolean));
    elements.sourceCount.textContent = `${sources.size} source${sources.size !== 1 ? 's' : ''}`;
}

/**
 * Apply current filters and sort, then render
 */
function applyFiltersAndSort() {
    // Start with all bookmarks
    filteredBookmarks = [...allBookmarks];
    
    // Apply tag filter
    if (activeTag) {
        filteredBookmarks = filteredBookmarks.filter(b => 
            b.tags && b.tags.includes(activeTag)
        );
    }
    
    // Apply search filter
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredBookmarks = filteredBookmarks.filter(b => {
            const searchableText = [
                b.title,
                b.description,
                b.url,
                ...(b.tags || []),
                b.source
            ].filter(Boolean).join(' ').toLowerCase();
            return searchableText.includes(query);
        });
    }
    
    // Apply sort
    filteredBookmarks = sortBookmarks(filteredBookmarks, currentSort);
    
    // Update stats and render
    updateStats();
    renderBookmarks();
}

/**
 * Sort bookmarks based on current sort option
 */
function sortBookmarks(bookmarks, sortOption) {
    const sorted = [...bookmarks];
    
    switch (sortOption) {
        case 'title-asc':
            sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            break;
        case 'title-desc':
            sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
            break;
        case 'date-newest':
            sorted.sort((a, b) => {
                const dateA = new Date(a.created_at || 0);
                const dateB = new Date(b.created_at || 0);
                return dateB - dateA;
            });
            break;
        case 'date-oldest':
            sorted.sort((a, b) => {
                const dateA = new Date(a.created_at || 0);
                const dateB = new Date(b.created_at || 0);
                return dateA - dateB;
            });
            break;
        case 'source':
            sorted.sort((a, b) => (a.source || '').localeCompare(b.source || ''));
            break;
    }
    
    return sorted;
}

/**
 * Render bookmarks to the list
 */
function renderBookmarks() {
    if (filteredBookmarks.length === 0) {
        elements.bookmarkList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-title">No bookmarks found</div>
                <div class="empty-state-text">
                    ${searchQuery ? 'Try a different search term' : 'Add some JSON files to get started'}
                </div>
            </div>
        `;
        return;
    }
    
    const html = filteredBookmarks.map((bookmark, index) => {
        const domain = extractDomain(bookmark.url);
        const tagsHtml = (bookmark.tags || []).map(tag => 
            `<span class="bookmark-tag" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`
        ).join('');
        
        return `
            <li class="bookmark-item" style="animation-delay: ${index * 0.03}s">
                <div class="bookmark-number">${index + 1}</div>
                <div class="bookmark-content">
                    <div class="bookmark-header">
                        <a href="${escapeHtml(bookmark.url)}" 
                           class="bookmark-title" 
                           target="_blank" 
                           rel="noopener noreferrer">
                            ${highlightText(bookmark.title || 'Untitled', searchQuery)}
                        </a>
                        <span class="bookmark-domain">(${escapeHtml(domain)})</span>
                    </div>
                    ${bookmark.description ? `
                        <div class="bookmark-description">
                            ${highlightText(bookmark.description, searchQuery)}
                        </div>
                    ` : ''}
                    <div class="bookmark-meta">
                        ${tagsHtml ? `<div class="bookmark-tags">${tagsHtml}</div>` : ''}
                        ${tagsHtml && (bookmark.source || bookmark.created_at) ? '<span class="meta-divider">•</span>' : ''}
                        ${bookmark.source ? `
                            <span class="bookmark-source">📱 ${escapeHtml(bookmark.source)}</span>
                        ` : ''}
                        ${bookmark.source && bookmark.created_at ? '<span class="meta-divider">•</span>' : ''}
                        ${bookmark.created_at ? `
                            <span class="bookmark-date">📅 ${formatDate(bookmark.created_at)}</span>
                        ` : ''}
                    </div>
                </div>
            </li>
        `;
    }).join('');
    
    elements.bookmarkList.innerHTML = html;
    
    // Add click handlers for inline tags
    elements.bookmarkList.querySelectorAll('.bookmark-tag').forEach(tag => {
        tag.addEventListener('click', (e) => {
            e.preventDefault();
            const tagName = tag.dataset.tag;
            
            // Activate the corresponding filter button
            elements.tagFilters.querySelectorAll('.tag-filter').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tag === tagName);
            });
            
            activeTag = tagName;
            applyFiltersAndSort();
        });
    });
}

/**
 * Go to a random bookmark
 */
function goToRandomBookmark() {
    if (filteredBookmarks.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * filteredBookmarks.length);
    const bookmark = filteredBookmarks[randomIndex];
    
    // Open in new tab
    window.open(bookmark.url, '_blank', 'noopener,noreferrer');
}

// ============================================
// Event Listeners
// ============================================

// Search input
elements.searchInput.addEventListener('input', debounce((e) => {
    searchQuery = e.target.value.trim();
    applyFiltersAndSort();
}, 200));

// Clear search button
elements.clearSearch.addEventListener('click', () => {
    elements.searchInput.value = '';
    searchQuery = '';
    applyFiltersAndSort();
    elements.searchInput.focus();
});

// Sort select
elements.sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    applyFiltersAndSort();
});

// Random button
elements.randomBtn.addEventListener('click', goToRandomBookmark);

// Keyboard shortcut for random (press 'r')
document.addEventListener('keydown', (e) => {
    // Don't trigger if typing in search
    if (e.target === elements.searchInput) return;
    
    if (e.key === 'r' || e.key === 'R') {
        goToRandomBookmark();
    }
    
    // Focus search on '/'
    if (e.key === '/') {
        e.preventDefault();
        elements.searchInput.focus();
    }
});

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', loadBookmarks);
