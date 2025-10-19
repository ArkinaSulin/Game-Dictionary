class CampaignWiki {
    constructor() {
        this.campaigns = new Map();
        this.currentCampaign = null;
        this.currentData = [];
        this.fuse = null;
        this.currentNode = null;
        this.dataLoaded = false;
        this.currentSort = 'name'; // Track current sort method
    }

    async init() {
        console.log('🚀 Initializing CampaignWiki...');
        await this.loadAllCampaigns();
        this.setupGameSelector();
        this.setupEventListeners();
        this.showApp();
    }

    async loadAllCampaigns() {
        try {
            console.log('📂 Loading campaign data from JSON files...');
            
            // Wait for the JSON data to be loaded
            if (typeof loadCampaignData !== 'undefined') {
                this.dataLoaded = await loadCampaignData();
            }

            if (!this.dataLoaded || typeof CAMPAIGN_DATABASE === 'undefined' || Object.keys(CAMPAIGN_DATABASE).length === 0) {
                throw new Error('Failed to load campaign data from JSON files');
            }

            this.campaigns.clear();
            let totalNodes = 0;

            for (const [campaignName, campaignData] of Object.entries(CAMPAIGN_DATABASE)) {
                console.log(`📖 Processing campaign: ${campaignName}`);
                
                const nodes = this.parseCampaignNodes(campaignData);
                totalNodes += nodes.length;

                const parsedData = {
                    dm: campaignData.dm || "Unknown DM",
                    lorekeeper: campaignData.lorekeeper || "Unknown Lorekeeper",
                    nodes: nodes
                };

                if (nodes.length > 0) {
                    this.campaigns.set(campaignName, parsedData);
                    console.log(`✅ Loaded ${campaignName}: ${nodes.length} nodes`);
                } else {
                    console.warn(`⚠️ No nodes found for campaign: ${campaignName}`);
                    // Still add the campaign even if no nodes, so it shows in selector
                    this.campaigns.set(campaignName, parsedData);
                }
            }

            console.log(`🎉 Successfully loaded ${this.campaigns.size} campaigns with ${totalNodes} total nodes`);
            
        } catch (error) {
            console.error('❌ Error loading campaigns:', error);
            this.showError('Failed to load campaign data: ' + error.message);
        }
    }

    parseCampaignNodes(campaignData) {
        const nodes = [];
        
        if (!campaignData.nodes || !Array.isArray(campaignData.nodes)) {
            console.warn('No nodes array found in campaign data');
            return nodes;
        }

        // Handle the nested structure
        const campaignNodes = campaignData.nodes[0];
        if (campaignNodes && typeof campaignNodes === 'object') {
            const categories = ['Character', 'Location', 'Event', 'Quest'];
            
            categories.forEach(category => {
                if (Array.isArray(campaignNodes[category])) {
                    campaignNodes[category].forEach(node => {
                        if (node && typeof node === 'object') {
                            const normalizedNode = this.normalizeNode(node, category);
                            if (normalizedNode) {
                                nodes.push(normalizedNode);
                            }
                        }
                    });
                }
            });
        }

        console.log(`📊 Parsed ${nodes.length} nodes from campaign`);
        return nodes;
    }

    normalizeNode(node, category) {
        // Handle the Related field which is now an array instead of object
        const id = node.ID || node.id;
        const type = node.Type || node.type || category;
        const name = node.Name || node.name;
        const content = node.Content || node.content;
        const related = node.Related || [];
        const session = node.Session || node.session || 0; // Extract session number

        if (!id || !name || !type) {
            console.warn('Skipping invalid node:', node);
            return null;
        }

        // Extract tags from related entries
        const tags = this.extractTags(node, category, related);

        return {
            id: id,
            type: type,
            name: name,
            content: content || 'No description available.',
            tags: tags,
            session: this.parseSessionNumber(session), // Use proper session number parsing
            rawData: {
                ...node,
                Related: this.normalizeRelatedData(related)
            }
        };
    }

    // NEW METHOD: Properly parse session numbers
    parseSessionNumber(session) {
        if (typeof session === 'number') {
            return session;
        }
        if (typeof session === 'string') {
            // Extract numbers from strings like "25", "35-38", "0", etc.
            const match = session.match(/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        }
        return 0;
    }

    normalizeRelatedData(relatedArray) {
        // Convert the simple array into the expected object structure
        if (!Array.isArray(relatedArray)) {
            return {
                Character: [],
                Location: [],
                Event: [],
                Quest: []
            };
        }

        // Group related items by their ID prefixes
        const related = {
            Character: [],
            Location: [],
            Event: [],
            Quest: []
        };

        relatedArray.forEach(item => {
            if (typeof item === 'string') {
                if (item.startsWith('CHAR-') || item.includes('Character')) {
                    related.Character.push(item);
                } else if (item.startsWith('LOC-') || item.includes('Location')) {
                    related.Location.push(item);
                } else if (item.startsWith('EVENT-') || item.includes('Event')) {
                    related.Event.push(item);
                } else if (item.startsWith('QUEST-') || item.includes('Quest')) {
                    related.Quest.push(item);
                } else {
                    // Default to Character if no prefix detected
                    related.Character.push(item);
                }
            }
        });

        return related;
    }

    extractTags(node, category, relatedArray) {
        const tags = new Set();
        
        // Add type and category as tags
        tags.add(category.toLowerCase());
        if (node.Type || node.type) {
            tags.add((node.Type || node.type).toLowerCase().replace(' ', '-'));
        }

        // Extract related entries as tags
        if (Array.isArray(relatedArray)) {
            relatedArray.forEach(item => {
                if (item && typeof item === 'string') {
                    // Use the actual ID/name for the tag
                    tags.add(item.toLowerCase().replace(/\s+/g, '-'));
                }
            });
        }

        return Array.from(tags);
    }

    setupGameSelector() {
        const gameSelect = document.getElementById('gameSelect');
        if (!gameSelect) {
            console.error('Game select element not found');
            return;
        }

        gameSelect.innerHTML = '';

        if (this.campaigns.size === 0) {
            gameSelect.innerHTML = '<option value="">No campaigns available</option>';
            gameSelect.disabled = true;
            return;
        }

        gameSelect.innerHTML = '<option value="">Select a campaign...</option>';
        for (const [campaignName] of this.campaigns) {
            const option = document.createElement('option');
            option.value = campaignName;
            option.textContent = campaignName;
            gameSelect.appendChild(option);
        }

        gameSelect.disabled = false;

        gameSelect.addEventListener('change', (e) => {
            this.selectCampaign(e.target.value);
        });

        // Auto-select if only one campaign
        if (this.campaigns.size === 1) {
            const firstCampaign = Array.from(this.campaigns.keys())[0];
            gameSelect.value = firstCampaign;
            this.selectCampaign(firstCampaign);
        }
    }

    selectCampaign(campaignName) {
        console.log(`🎯 Selecting campaign: ${campaignName}`);
        
        if (!campaignName || !this.campaigns.has(campaignName)) {
            this.clearUI();
            return;
        }

        const campaignData = this.campaigns.get(campaignName);
        this.currentCampaign = campaignName;
        this.currentData = campaignData.nodes;
        
        this.updateHeaderInfo(campaignData.dm, campaignData.lorekeeper);
        this.initSearch();
        this.setupSortControls();
        this.renderIndex();
        this.enableUI();
        
        document.getElementById('mainTitle').textContent = `${campaignName} Dictionary`;
        
        console.log(`✅ Loaded ${this.currentData.length} entries for ${campaignName}`);
    }

    updateHeaderInfo(dm, lorekeeper) {
        document.getElementById('dmInfo').textContent = `DM: ${dm}`;
        document.getElementById('lorekeeperInfo').textContent = `Lorekeeper: ${lorekeeper}`;
    }

    clearUI() {
        this.currentCampaign = null;
        this.currentData = [];
        this.fuse = null;
        this.currentNode = null;

        document.getElementById('indexList').innerHTML = '<p class="placeholder">Select a campaign to begin</p>';
        document.getElementById('contentDisplay').innerHTML = `
            <div class="welcome-message">
                <h2>Welcome to Campaign Dictionary</h2>
                <p>Select a campaign from the dropdown to explore characters, locations, events, and quests.</p>
            </div>
        `;
        document.getElementById('relatedList').innerHTML = '<p class="placeholder">Select an entry to see related content</p>';
        
        // Remove sort controls if they exist
        const existingSortControls = document.querySelector('.sort-controls');
        if (existingSortControls) {
            existingSortControls.remove();
        }
        
        document.getElementById('searchInput').value = '';
        document.getElementById('searchInput').disabled = true;
        
        document.getElementById('dmInfo').textContent = 'DM: Not selected';
        document.getElementById('lorekeeperInfo').textContent = 'Lorekeeper: Not selected';
        document.getElementById('mainTitle').textContent = 'Campaign Dictionary';
        
        this.updateCounts(0, 0);
    }

    enableUI() {
        document.getElementById('searchInput').disabled = false;
    }

    showApp() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('app').style.display = 'block';
    }

    showError(message) {
        const contentDisplay = document.getElementById('contentDisplay');
        if (contentDisplay) {
            contentDisplay.innerHTML = `<p class="placeholder error">${message}</p>`;
        }
    }

    initSearch() {
        if (this.currentData.length === 0) {
            this.fuse = null;
            return;
        }

        const options = {
            includeScore: true,
            threshold: 0.4,
            keys: [
                { name: 'name', weight: 0.6 },
                { name: 'content', weight: 0.3 },
                { name: 'type', weight: 0.1 }
            ]
        };
        
        this.fuse = new Fuse(this.currentData, options);
        console.log('🔍 Search initialized with', this.currentData.length, 'items');
    }

    // ADD THIS METHOD - It was missing!
    renderIndex() {
        this.sortIndex('name'); // Default to alphabetical sort
    }

    setupSortControls() {
        // Remove existing sort controls if they exist
        const existingSortControls = document.querySelector('.sort-controls');
        if (existingSortControls) {
            existingSortControls.remove();
        }
        
        const sortControls = document.createElement('div');
        sortControls.className = 'sort-controls';
        sortControls.innerHTML = `
            <button class="sort-btn active" data-sort="name">A-Z</button>
            <button class="sort-btn" data-sort="type">Type</button>
            <button class="sort-btn" data-sort="session">Session#</button>
            <button class="sort-btn" data-sort="session-reverse">Rev. Session#</button>
        `;
        
        const leftPanel = document.querySelector('.left-panel');
        const indexList = document.getElementById('indexList');
        leftPanel.insertBefore(sortControls, indexList);
        
        // Add event listeners for sort buttons
        sortControls.addEventListener('click', (e) => {
            if (e.target.classList.contains('sort-btn')) {
                // Update active state
                sortControls.querySelectorAll('.sort-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');
                
                // Sort the data
                this.sortIndex(e.target.dataset.sort);
            }
        });
    }

    sortIndex(sortBy) {
        if (!this.currentData.length) return;
        
        this.currentSort = sortBy;
        let sortedNodes;
        
        console.log(`🔢 Sorting by: ${sortBy}`);
        
        switch (sortBy) {
            case 'name':
                sortedNodes = [...this.currentData].sort((a, b) => 
                    a.name.localeCompare(b.name)
                );
                break;
            case 'type':
                sortedNodes = [...this.currentData].sort((a, b) => {
                    const typeCompare = a.type.localeCompare(b.type);
                    if (typeCompare === 0) {
                        return a.name.localeCompare(b.name);
                    }
                    return typeCompare;
                });
                break;
            case 'session':
                sortedNodes = [...this.currentData].sort((a, b) => {
                    const sessionCompare = a.session - b.session;
                    if (sessionCompare === 0) {
                        return a.name.localeCompare(b.name);
                    }
                    return sessionCompare;
                });
                break;
            case 'session-reverse':
                sortedNodes = [...this.currentData].sort((a, b) => {
                    const sessionCompare = b.session - a.session;
                    if (sessionCompare === 0) {
                        return a.name.localeCompare(b.name);
                    }
                    return sessionCompare;
                });
                break;
            default:
                sortedNodes = [...this.currentData];
        }
        
        console.log(`📊 Sorted ${sortedNodes.length} nodes`);
        this.renderSortedIndex(sortedNodes);
    }

    renderSortedIndex(sortedNodes) {
        const indexList = document.getElementById('indexList');
        indexList.innerHTML = '';

        if (sortedNodes.length === 0) {
            indexList.innerHTML = '<p class="placeholder">No entries found in this campaign</p>';
            this.updateCounts(0, 0);
            return;
        }

        sortedNodes.forEach((node, index) => {
            const item = document.createElement('div');
            item.className = 'index-item';
            
            // Add session number display if available and not zero
            const sessionInfo = node.session > 0 ? `<span class="index-session">S${node.session}</span>` : '';
            
            item.innerHTML = `
                <span class="index-name">${node.name}</span>
                <span class="index-type">${node.type}</span>
                ${sessionInfo}
            `;
            item.dataset.id = node.id;
            item.dataset.index = index;
            
            item.addEventListener('click', () => {
                this.displayNode(node);
                this.highlightIndexItem(item);
            });

            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', node.name);
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });

            indexList.appendChild(item);
        });

        this.setupIndexKeyboardNav();
        this.updateCounts(this.currentData.length, 0);
    }

    highlightIndexItem(selectedItem) {
        document.querySelectorAll('.index-item').forEach(item => {
            item.classList.remove('selected');
        });
        selectedItem.classList.add('selected');
    }

    setupIndexKeyboardNav() {
        const indexList = document.getElementById('indexList');
        let selectedIndex = -1;

        indexList.addEventListener('keydown', (e) => {
            const items = indexList.getElementsByClassName('index-item');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                this.selectIndexItem(selectedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                this.selectIndexItem(selectedIndex);
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                items[selectedIndex].click();
            }
        });
    }

    selectIndexItem(index) {
        const items = document.getElementById('indexList').getElementsByClassName('index-item');
        if (index >= 0 && index < items.length) {
            items[index].scrollIntoView({ block: 'nearest' });
            this.highlightIndexItem(items[index]);
        }
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        
        searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        searchInput.addEventListener('focus', () => {
            this.handleSearch(searchInput.value);
        });

        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                const suggestions = document.getElementById('suggestions');
                if (suggestions) suggestions.style.display = 'none';
            }, 200);
        });

        // Drag and drop support
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
        
        if (!query.trim()) {
            if (suggestions) suggestions.style.display = 'none';
            return;
        }

        if (!this.fuse) {
            return;
        }

        const results = this.fuse.search(query);
        this.showSuggestions(results.slice(0, 8));
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
                <span>${result.item.name}</span>
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
        console.log('📄 Displaying node:', node);
        this.currentNode = node;
        
        const contentDisplay = document.getElementById('contentDisplay');
        contentDisplay.innerHTML = `
            <div class="content-header">
                <h2 class="content-title">${node.name}</h2>
                <span class="content-type">${node.type}</span>
                ${node.session > 0 ? `<span class="content-session">Session ${node.session}</span>` : ''}
            </div>
            <div class="content-body">
                <p>${node.content}</p>
            </div>
            ${node.tags.length > 0 ? `
            <div class="content-tags">
                ${node.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
            </div>
            ` : ''}
        `;

        this.updateRelatedEntries(node);
        this.scrollToTop();
    }

    updateRelatedEntries(currentNode) {
        const relatedList = document.getElementById('relatedList');
        
        if (!currentNode || !currentNode.rawData || !currentNode.rawData.Related) {
            relatedList.innerHTML = '<p class="placeholder">No related entries</p>';
            this.updateCounts(this.currentData.length, 0);
            return;
        }

        const related = currentNode.rawData.Related;
        const allRelatedIds = [
            ...(related.Character || []),
            ...(related.Location || []),
            ...(related.Event || []),
            ...(related.Quest || [])
        ];

        if (allRelatedIds.length === 0) {
            relatedList.innerHTML = '<p class="placeholder">No related entries</p>';
            this.updateCounts(this.currentData.length, 0);
            return;
        }

        // Find actual node objects for related IDs and get their names
        const relatedNodes = this.currentData.filter(node => 
            allRelatedIds.some(id => 
                node.name.toLowerCase() === id.toLowerCase() || 
                node.id.toLowerCase() === id.toLowerCase()
            )
        );

        relatedList.innerHTML = '';
        relatedNodes.forEach(node => {
            const item = document.createElement('div');
            item.className = 'related-item';
            item.innerHTML = `
                <span class="related-name">${node.name}</span>
                <span class="related-type">${node.type}</span>
            `;
            
            item.addEventListener('click', () => {
                this.displayNode(node);
            });

            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', node.name);
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });

            relatedList.appendChild(item);
        });

        this.updateCounts(this.currentData.length, relatedNodes.length);
    }

    updateCounts(total, related) {
        document.getElementById('indexCount').textContent = `${total} items`;
        document.getElementById('relatedCount').textContent = `${related} related`;
    }

    scrollToTop() {
        const contentDisplay = document.getElementById('contentDisplay');
        if (contentDisplay) {
            contentDisplay.scrollTop = 0;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏁 DOM loaded, starting CampaignWiki...');
    const wiki = new CampaignWiki();
    window.campaignWiki = wiki; // Make available globally for debugging
    await wiki.init();
});