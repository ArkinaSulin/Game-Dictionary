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
        
        // Load each campaign defined in the manifest
        for (const [campaignName, campaignInfo] of Object.entries(manifest.campaigns)) {
            console.log(`📖 Loading campaign: ${campaignName}`);
            
            const campaignData = await loadSingleCampaign(campaignInfo, campaignName);
            if (campaignData) {
                CAMPAIGN_DATABASE[campaignName] = campaignData;
                console.log(`✅ Loaded ${campaignName} from ${campaignInfo.folder}/`);
            }
        }

        console.log(`🎉 Successfully loaded ${Object.keys(CAMPAIGN_DATABASE).length} campaigns`);
        return true;
        
    } catch (error) {
        console.error('❌ Error loading campaign data:', error);
        return false;
    }
}

async function loadSingleCampaign(campaignInfo, campaignName) {
    try {
        const basePath = `./data/${campaignInfo.folder}`;
        
        // Load all JSON files for this campaign
        const [characters, locations, events, quests] = await Promise.all([
            fetch(`${basePath}/characters.json`).then(handleFetchError),
            fetch(`${basePath}/locations.json`).then(handleFetchError),
            fetch(`${basePath}/events.json`).then(handleFetchError),
            fetch(`${basePath}/quests.json`).then(handleFetchError)
        ]);

        return {
            dm: campaignInfo.dm,
            lorekeeper: campaignInfo.lorekeeper,
            nodes: [
                {
                    "Character": characters || [],
                    "Location": locations || [],
                    "Event": events || [],
                    "Quest": quests || []
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
        console.warn(`File not found: ${response.url}`);
        return []; // Return empty array if file doesn't exist
    }
    return response.json();
}