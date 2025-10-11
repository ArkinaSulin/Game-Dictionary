// Paste your complete CoS_campaign_database.json content here
// Replace this example with your actual data
const CAMPAIGN_DATABASE = {
  "nodes": [
    {
      "id": "arkini_character",
      "type": "character",
      "name": "Arkini",
      "content": "Tiefling Warlock, follower of the Raven Queen. Cunning, flirtatious, pragmatic survivor. Uses charm and manipulation as weapons. Goal: Survive Barovia and gain power to save her mother from poverty. Secretly dreams of controlling the domain. Beautiful, blue-skinned, keeps a detailed diary. Carries a sentimental whip and has a pet salamander named Hexagon. Obsessed with collecting 'blood red' makeup. Relationships: Considers Eclipse her 'best sister.' Flirts with Mykieal ('Sunshine') and Davi ('My Knight') but is growing infatuated with the Abbot.",
      "tags": ["tiefling", "warlock", "raven queen", "manipulative", "survivor", "blue skin", "hexagon", "diary"]
    },
    {
      "id": "barovia_village_location",
      "type": "location", 
      "name": "Village of Barovia",
      "content": "The miserable, fog-bound capital of Barovia. A place of decay and despair. Key Spots: Blood of the Vine Tavern (grim social hub), Bildrath's Mercantile (notoriously overpriced store), The Church (dilapidated, with a grieving priest and vampire spawn in basement), Death House (sentient haunted mansion). Significance: The party's introduction to Barovia. Where they met Ismark and Ireena and received their first major quest.",
      "tags": ["capital", "foggy", "decaying", "tavern", "church", "death house", "starting area"]
    },
    {
      "id": "eclipse_character",
      "type": "character",
      "name": "Eclipse",
      "content": "Half-elf Rogue with a mysterious past. Skilled in stealth and deception. Has a hidden agenda connected to the Shadowfell.",
      "tags": ["half-elf", "rogue", "stealth", "shadowfell", "mysterious"]
    },
    {
      "id": "mykieal_character", 
      "type": "character",
      "name": "Mykieal",
      "content": "Human Paladin devoted to the Morninglord. Noble and courageous, but struggles with the darkness of Barovia.",
      "tags": ["human", "paladin", "morninglord", "noble", "courageous"]
    }
    // Add all your other nodes here...
  ],
  "search_config": {
    "fuzzy_matching": true,
    "searchable_fields": ["name", "content", "tags", "type"],
    "min_score": 0.3
  }
};