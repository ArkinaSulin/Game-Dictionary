// campaign-data.js - Campaign manifest approach
const CAMPAIGN_DATABASE = {};

async function loadCampaignData() {
    try {
        console.log('📂 Loading campaign manifest...');
        
        // Load the campaign manifest
        const manifest = await fetch('./data/campaign-manifest.json').then(r => {
            if (!r.ok) throw new Error(`Manifest load failed: ${r.status}`);
            return r.json();
        });
        
        console.log('📋 Manifest loaded:', manifest);
        
        // Load each campaign defined in the manifest
        for (const [campaignName, campaignInfo] of Object.entries(manifest.campaigns)) {
            console.log(`📖 Loading campaign: ${campaignName}`);
            
            const campaignData = await loadSingleCampaign(campaignInfo, campaignName);
            if (campaignData) {
                CAMPAIGN_DATABASE[campaignName] = campaignData;
                console.log(`✅ Loaded ${campaignName} from ${campaignInfo.folder}/`);
            }
        }

        console.log(`🎉 Successfully loaded ${Object.keys(CAMPAIGN_DATABASE).length} campaigns:`, Object.keys(CAMPAIGN_DATABASE));
        return true;
        
    } catch (error) {
        console.error('❌ Error loading campaign data:', error);
        // Create a fallback with empty data so the app doesn't crash
        CAMPAIGN_DATABASE["Demo Campaign"] = {
            dm: "Demo DM",
            lorekeeper: "Demo Lorekeeper",
            nodes: []
        };
        return false;
    }
}

async function loadSingleCampaign(campaignInfo, campaignName) {
    try {
        const basePath = `./data/${campaignInfo.folder}`;
        console.log(`🔍 Loading from: ${basePath}`);
        
        // Load all JSON files for this campaign including items
        const [characters, locations, events, quests, items] = await Promise.all([
            fetch(`${basePath}/characters.json`).then(handleFetchError),
            fetch(`${basePath}/locations.json`).then(handleFetchError),
            fetch(`${basePath}/events.json`).then(handleFetchError),
            fetch(`${basePath}/quests.json`).then(handleFetchError),
            fetch(`${basePath}/items.json`).then(handleFetchError)
        ]);

        console.log(`📊 Campaign ${campaignName} data:`, {
            characters: characters?.length || 0,
            locations: locations?.length || 0,
            events: events?.length || 0,
            quests: quests?.length || 0,
            items: items?.length || 0
        });

        return {
            dm: campaignInfo.dm,
            lorekeeper: campaignInfo.lorekeeper,
            nodes: [
                {
                    "Character": characters || [],
                    "Location": locations || [],
                    "Event": events || [],
                    "Quest": quests || [],
                    "Item": items || []
                }
            ]
        };
        
    } catch (error) {
        console.error(`❌ Failed to load campaign ${campaignName}:`, error);
        return null;
    }
}

// Helper function to handle fetch errors gracefully
function handleFetchError(response) {
    if (!response.ok) {
        console.warn(`⚠️ File not found: ${response.url}`);
        return []; // Return empty array if file doesn't exist
    }
    return response.json();
}

// Make the function available globally
window.loadCampaignData = loadCampaignData;