class CampaignWiki {
    constructor() {
        this.data = [];
        this.fuse = null;
        this.currentNode = null;
        this.init();
    }

    init() {
        this.loadData();
        this.initSearch();
        this.renderIndex();
        this.setupEventListeners();
    }

    loadData() {
        try {
            // Load data from the embedded JavaScript variable
            if (typeof CAMPAIGN_DATABASE !== 'undefined') {
                let nodes = [];
                
                if (CAMPAIGN_DATABASE.nodes && Array.isArray(CAMPAIGN_DATABASE.nodes)) {
                    nodes = CAMPAIGN_DATABASE.nodes;
                } else if (Array.isArray(CAMPAIGN_DATABASE)) {
                    nodes = CAMPAIGN_DATABASE.filter(item => item && typeof item === 'object' && item.id);
                } else {
                    // Try to find any array in the data
                    for (const key in CAMPAIGN_DATABASE) {
                        if (Array.isArray(CAMPAIGN_DATABASE[key])) {
                            nodes = CAMPAIGN_DATABASE[key].filter(item => item && typeof item === 'object' && item.id);
                            if (nodes.length > 0) break;
                        }
                    }
                }
                
                this.data = nodes;
                console.log(`Loaded ${this.data.length} nodes from database`);
            } else {
                console.error('Campaign database not found');
                this.data = [];
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.data = [];
        }
    }

    initSearch() {
        const options = {
            includeScore: true,
            threshold: 0.3,
            keys: ['name', 'content', 'tags', 'type']
        };
        
        this.fuse = new Fuse(this.data, options);
    }

    renderIndex() {
        const indexList = document.getElementById('indexList');
        indexList.innerHTML = '';

        if (this.data.length === 0) {
            indexList.innerHTML = '<p class="placeholder">No data loaded</p>';
            return;
        }

        // Sort nodes alphabetically by name
        const sortedNodes = [...this.data].sort((a, b) => 
            a.name.localeCompare(b.name)
        );

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
                document.getElementById('suggestions').style.display = 'none';
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
        
        if (query.length < 1) {
            suggestions.style.display = 'none';
            return;
        }

        const results = this.fuse.search(query);
        this.showSuggestions(results.slice(0, 10)); // Show top 10 results
    }

    showSuggestions(results) {
        const suggestions = document.getElementById('suggestions');
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
                document.getElementById('searchInput').value = result.item.name;
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
        contentDisplay.innerHTML = `
            <div class="content-header">
                <h2 class="content-title">${node.name}</h2>
                <span class="content-type">${node.type}</span>
            </div>
            <div class="content-body">
                <p>${node.content}</p>
            </div>
            <div class="content-tags">
                ${node.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
            </div>
        `;

        // Update related entries
        this.updateRelatedEntries(node);
    }

    updateRelatedEntries(currentNode) {
        const relatedList = document.getElementById('relatedList');
        
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
                document.getElementById('searchInput').value = node.name;
            });

            relatedList.appendChild(item);
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CampaignWiki();
});