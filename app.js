class CampaignWiki {
    constructor() {
        this.data = [];
        this.fuse = null;
        this.currentNode = null;
    }

    init() {
        this.loadData();
        this.initSearch();
        this.renderIndex();
        this.setupEventListeners();
        this.showApp();
    }

    showApp() {
        // Hide loading screen and show app
        document.getElementById('loading').style.display = 'none';
        document.getElementById('app').style.display = 'block';
    }

    loadData() {
        try {
            console.log('Loading campaign data...');
            
            // Check if CAMPAIGN_DATABASE is available
            if (typeof CAMPAIGN_DATABASE === 'undefined') {
                console.error('CAMPAIGN_DATABASE is not defined');
                this.showError('Campaign data not loaded. Please check campaign-data.js');
                return;
            }

            let nodes = [];
            
            // Handle different possible data structures
            if (CAMPAIGN_DATABASE.nodes && Array.isArray(CAMPAIGN_DATABASE.nodes)) {
                nodes = CAMPAIGN_DATABASE.nodes;
                console.log('Loaded from CAMPAIGN_DATABASE.nodes');
            } else if (Array.isArray(CAMPAIGN_DATABASE)) {
                nodes = CAMPAIGN_DATABASE;
                console.log('Loaded from CAMPAIGN_DATABASE array');
            } else {
                // Try to find any array in the data
                for (const key in CAMPAIGN_DATABASE) {
                    if (Array.isArray(CAMPAIGN_DATABASE[key])) {
                        nodes = CAMPAIGN_DATABASE[key].filter(item => item && typeof item === 'object' && item.id);
                        console.log(`Loaded from CAMPAIGN_DATABASE.${key}`);
                        if (nodes.length > 0) break;
                    }
                }
            }
            
            // Filter valid nodes
            this.data = nodes.filter(item => 
                item && 
                typeof item === 'object' && 
                item.id && 
                item.name && 
                item.type
            );
            
            console.log(`Successfully loaded ${this.data.length} valid nodes`);
            
            if (this.data.length === 0) {
                this.showError('No valid campaign data found. Please check the data format in campaign-data.js');
            }
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Error loading campaign data: ' + error.message);
            this.data = [];
        }
    }

    showError(message) {
        const indexList = document.getElementById('indexList');
        const contentDisplay = document.getElementById('contentDisplay');
        const relatedList = document.getElementById('relatedList');
        
        if (indexList) indexList.innerHTML = `<p class="placeholder error">${message}</p>`;
        if (contentDisplay) contentDisplay.innerHTML = `<p class="placeholder error">${message}</p>`;
        if (relatedList) relatedList.innerHTML = `<p class="placeholder error">${message}</p>`;
    }

    initSearch() {
        if (this.data.length === 0) {
            console.warn('No data available for search initialization');
            return;
        }

        const options = {
            includeScore: true,
            threshold: 0.3,
            keys: ['name', 'content', 'tags', 'type']
        };
        
        this.fuse = new Fuse(this.data, options);
        console.log('Search initialized with', this.data.length, 'items');
    }

    renderIndex() {
        const indexList = document.getElementById('indexList');
        if (!indexList) {
            console.error('indexList element not found');
            return;
        }

        indexList.innerHTML = '';

        if (this.data.length === 0) {
            indexList.innerHTML = '<p class="placeholder">No data loaded</p>';
            return;
        }

        // Sort nodes alphabetically by name
        const sortedNodes = [...this.data].sort((a, b) => 
            a.name.localeCompare(b.name)
        );

        console.log(`Rendering ${sortedNodes.length} items in index`);

        sortedNodes.forEach(node => {
            const item = document.createElement('div');
            item.className = 'index-item';
            item.textContent = node.name;
            item.draggable = true;
            item.dataset.id = node.id;
            
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', node.name);
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });

            item.addEventListener('click', () => {
                this.displayNode(node);
            });

            indexList.appendChild(item);
        });

        // Setup keyboard navigation for index
        this.setupIndexKeyboardNav();
    }

    setupIndexKeyboardNav() {
        const indexList = document.getElementById('indexList');
        const items = indexList.getElementsByClassName('index-item');
        let selectedIndex = -1;

        indexList.addEventListener('keydown', (e) => {
            if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
                // Find first item starting with the typed letter
                const letter = e.key.toLowerCase();
                for (let i = 0; i < items.length; i++) {
                    if (items[i].textContent.toLowerCase().startsWith(letter)) {
                        this.selectIndexItem(i);
                        items[i].scrollIntoView({ block: 'center' });
                        break;
                    }
                }
                e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                this.selectIndexItem(selectedIndex);
                e.preventDefault();
            } else if (e.key === 'ArrowUp') {
                selectedIndex = Math.max(selectedIndex - 1, 0);
                this.selectIndexItem(selectedIndex);
                e.preventDefault();
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                items[selectedIndex].click();
                e.preventDefault();
            }
        });

        indexList.addEventListener('click', (e) => {
            if (e.target.classList.contains('index-item')) {
                const index = Array.from(items).indexOf(e.target);
                this.selectIndexItem(index);
            }
        });
    }

    selectIndexItem(index) {
        const items = document.getElementById('indexList').getElementsByClassName('index-item');
        Array.from(items).forEach(item => item.classList.remove('selected'));
        
        if (index >= 0 && index < items.length) {
            items[index].classList.add('selected');
        }
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) {
            console.error('searchInput element not found');
            return;
        }
        
        // Search input events
        searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        searchInput.addEventListener('focus', () => {
            this.handleSearch(searchInput.value);
        });

        searchInput.addEventListener('blur', () => {
            // Hide suggestions after a short delay to allow clicking
            setTimeout(() => {
                const suggestions = document.getElementById('suggestions');
                if (suggestions) suggestions.style.display = 'none';
            }, 200);
        });

        // Drag and drop for search input
        searchInput.addEventListener('dragover', (e) => {
            e.preventDefault();
            searchInput.classList.add('drop-zone');
        });

        searchInput.addEventListener('dragleave', () => {
            searchInput.classList.remove('drop-zone');
        });

        searchInput.addEventListener('drop', (e) => {
            e.preventDefault();
            searchInput.classList.remove('drop-zone');
            const text = e.dataTransfer.getData('text/plain');
            searchInput.value = text;
            this.handleSearch(text);
        });
    }

    handleSearch(query) {
        const suggestions = document.getElementById('suggestions');
        if (!suggestions) return;
        
        if (query.length < 1) {
            suggestions.style.display = 'none';
            return;
        }

        if (!this.fuse) {
            console.warn('Search not initialized');
            return;
        }

        const results = this.fuse.search(query);
        this.showSuggestions(results.slice(0, 10)); // Show top 10 results
    }

    showSuggestions(results) {
        const suggestions = document.getElementById('suggestions');
        if (!suggestions) return;
        
        suggestions.innerHTML = '';

        if (results.length === 0) {
            suggestions.style.display = 'none';
            return;
        }

        results.forEach(result => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                ${result.item.name}
                <span class="suggestion-type">${result.item.type}</span>
            `;
            
            item.addEventListener('click', () => {
                this.displayNode(result.item);
                const searchInput = document.getElementById('searchInput');
                if (searchInput) searchInput.value = result.item.name;
                suggestions.style.display = 'none';
            });

            suggestions.appendChild(item);
        });

        suggestions.style.display = 'block';
    }

    displayNode(node) {
        this.currentNode = node;
        
        // Update content display
        const contentDisplay = document.getElementById('contentDisplay');
        if (!contentDisplay) return;
        
        contentDisplay.innerHTML = `
            <div class="content-header">
                <h2 class="content-title">${node.name}</h2>
                <span class="content-type">${node.type}</span>
            </div>
            <div class="content-body">
                <p>${node.content}</p>
            </div>
            <div class="content-tags">
                ${node.tags ? node.tags.map(tag => `<span class="tag">#${tag}</span>`).join('') : ''}
            </div>
        `;

        // Update related entries
        this.updateRelatedEntries(node);
    }

    updateRelatedEntries(currentNode) {
        const relatedList = document.getElementById('relatedList');
        if (!relatedList) return;
        
        if (!currentNode || !currentNode.tags || currentNode.tags.length === 0) {
            relatedList.innerHTML = '<p class="placeholder">No related entries found</p>';
            return;
        }

        // Find nodes that share at least one tag with the current node
        const relatedNodes = this.data.filter(node => 
            node.id !== currentNode.id && 
            node.tags && 
            node.tags.some(tag => currentNode.tags.includes(tag))
        );

        // Sort by number of matching tags (most matches first)
        relatedNodes.sort((a, b) => {
            const aMatches = a.tags.filter(tag => currentNode.tags.includes(tag)).length;
            const bMatches = b.tags.filter(tag => currentNode.tags.includes(tag)).length;
            return bMatches - aMatches;
        });

        // Take top 20
        const topRelated = relatedNodes.slice(0, 20);

        if (topRelated.length === 0) {
            relatedList.innerHTML = '<p class="placeholder">No related entries found</p>';
            return;
        }

        relatedList.innerHTML = '';
        topRelated.forEach(node => {
            const item = document.createElement('div');
            item.className = 'related-item';
            item.textContent = node.name;
            item.draggable = true;
            item.dataset.id = node.id;
            
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', node.name);
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });

            item.addEventListener('click', () => {
                this.displayNode(node);
                const searchInput = document.getElementById('searchInput');
                if (searchInput) searchInput.value = node.name;
            });

            relatedList.appendChild(item);
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing CampaignWiki...');
    const wiki = new CampaignWiki();
    wiki.init();
});