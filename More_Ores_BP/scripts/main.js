import { world, EquipmentSlot, GameMode, system, ItemStack } from "@minecraft/server";

// ============================================================================
// MORE ORES! - Combined Script
// Includes: Tazerite, Hellfire, Heavenbane, and Pearlescite
// ============================================================================

// ============================================================================
// PICKAXE POWER SYSTEM
// Only applies to ores AFTER Tazerite in the progression:
// Spessartite → Garnet → Iron → Silver → Gold → Ruby → Diamond → Jade → Netherite → Tazerite → Hellfire → Heavenbane → Pearlescite → Fractalized
// 
// Ores before Tazerite use vanilla mining tiers (stone/iron/diamond level)
// Ores from Tazerite onward require pickaxe power percentages
// ============================================================================

// Pickaxe Power levels - ONLY custom pickaxes from Tazerite tier and above have power
// Vanilla pickaxes have 0 power (can mine Tazerite but nothing above)
const PICKAXE_POWER = {
    // Vanilla pickaxes - no pickaxe power (can still mine Tazerite ore via VALID_PICKAXES)
    'minecraft:wooden_pickaxe': 0,
    'minecraft:stone_pickaxe': 0,
    'minecraft:iron_pickaxe': 0,
    'minecraft:golden_pickaxe': 0,
    'minecraft:diamond_pickaxe': 0,
    'minecraft:netherite_pickaxe': 0,
    // Pre-Tazerite custom pickaxes - no pickaxe power
    'spessartite:spessartite_pickaxe': 0,
    'garnet:garnet_pickaxe': 0,
    'silver:silver_pickaxe': 0,
    'ruby:ruby_pickaxe': 0,
    'jade:jade_pickaxe': 0,
    // Tazerite and above - these have pickaxe power for mining advanced ores
    'tazerite:tazerite_pickaxe': 10,
    'hellfire:hellfire_pickaxe': 20,
    'heavenbane:heavenbane_pickaxe': 30,
    'pearlescite:pearlescite_pickaxe': 40,
    'fractalized:fractalized_pickaxe': 50
};

// Required pickaxe power to mine specific ores
// Only ores AFTER Tazerite require pickaxe power
const ORE_POWER_REQUIREMENTS = {
    // These ores don't use pickaxe power - they use vanilla tier requirements
    // (handled by destroy_speeds in the pickaxe JSON files)
    'spessartite:spessartite_ore': null,  // Vanilla stone tier
    'garnet:garnet_ore': null,            // Vanilla stone tier
    'silver:silver_ore': null,            // Vanilla iron tier
    'ruby:ruby_ore': null,                // Vanilla iron tier  
    'jade:jade_ore': null,                // Vanilla diamond tier
    // Tazerite can be mined by netherite (no power required, just netherite tier)
    'tazerite:tazerite_ore': 0,
    // These require pickaxe power
    'hellfire:hellfire_ore': 10,          // Requires Tazerite pickaxe (10 power) or higher
    'heavenbane:heavenbane_ore': 20,      // Requires Hellfire pickaxe (20 power) or higher
    'pearlescite:pearlescite_ore': 30     // Requires Heavenbane pickaxe (30 power) or higher
};

// Valid pickaxes for ores that need special handling
// Pre-Tazerite ores don't need this - they use vanilla block tags
const VALID_PICKAXES = {
    // Tazerite can be mined by netherite and all custom pickaxes
    'tazerite:tazerite_ore': [
        'minecraft:netherite_pickaxe',
        'tazerite:tazerite_pickaxe', 'hellfire:hellfire_pickaxe', 
        'heavenbane:heavenbane_pickaxe', 'pearlescite:pearlescite_pickaxe', 'fractalized:fractalized_pickaxe'
    ],
    // Hellfire requires Tazerite power (10) or higher
    'hellfire:hellfire_ore': [
        'tazerite:tazerite_pickaxe', 'hellfire:hellfire_pickaxe',
        'heavenbane:heavenbane_pickaxe', 'pearlescite:pearlescite_pickaxe', 'fractalized:fractalized_pickaxe'
    ],
    // Heavenbane requires Hellfire power (20) or higher
    'heavenbane:heavenbane_ore': [
        'hellfire:hellfire_pickaxe', 'heavenbane:heavenbane_pickaxe',
        'pearlescite:pearlescite_pickaxe', 'fractalized:fractalized_pickaxe'
    ],
    // Pearlescite requires Heavenbane power (30) or higher
    'pearlescite:pearlescite_ore': [
        'heavenbane:heavenbane_pickaxe', 'pearlescite:pearlescite_pickaxe', 'fractalized:fractalized_pickaxe'
    ]
};

// Track players with night vision from Heavenbane armor
const playersWithNightVision = new Map();

// ============================================================================
// ARMOR CHECK FUNCTIONS
// ============================================================================

function isWearingFullTazeriteArmor(player) {
    try {
        const eq = player.getComponent("minecraft:equippable");
        if (!eq) return false;
        return eq.getEquipment(EquipmentSlot.Head)?.typeId === "tazerite:tazerite_helmet" &&
               eq.getEquipment(EquipmentSlot.Chest)?.typeId === "tazerite:tazerite_chestplate" &&
               eq.getEquipment(EquipmentSlot.Legs)?.typeId === "tazerite:tazerite_leggings" &&
               eq.getEquipment(EquipmentSlot.Feet)?.typeId === "tazerite:tazerite_boots";
    } catch (e) { return false; }
}

function isWearingFullHellfireArmor(player) {
    try {
        const eq = player.getComponent("minecraft:equippable");
        if (!eq) return false;
        return eq.getEquipment(EquipmentSlot.Head)?.typeId === "hellfire:hellfire_helmet" &&
               eq.getEquipment(EquipmentSlot.Chest)?.typeId === "hellfire:hellfire_chestplate" &&
               eq.getEquipment(EquipmentSlot.Legs)?.typeId === "hellfire:hellfire_leggings" &&
               eq.getEquipment(EquipmentSlot.Feet)?.typeId === "hellfire:hellfire_boots";
    } catch (e) { return false; }
}

function isWearingFullHeavenbaneArmor(player) {
    try {
        const eq = player.getComponent("minecraft:equippable");
        if (!eq) return false;
        return eq.getEquipment(EquipmentSlot.Head)?.typeId === "heavenbane:heavenbane_helmet" &&
               eq.getEquipment(EquipmentSlot.Chest)?.typeId === "heavenbane:heavenbane_chestplate" &&
               eq.getEquipment(EquipmentSlot.Legs)?.typeId === "heavenbane:heavenbane_leggings" &&
               eq.getEquipment(EquipmentSlot.Feet)?.typeId === "heavenbane:heavenbane_boots";
    } catch (e) { return false; }
}

function isWearingFullPearlesciteArmor(player) {
    try {
        const eq = player.getComponent("minecraft:equippable");
        if (!eq) return false;
        return eq.getEquipment(EquipmentSlot.Head)?.typeId === "pearlescite:pearlescite_helmet" &&
               eq.getEquipment(EquipmentSlot.Chest)?.typeId === "pearlescite:pearlescite_chestplate" &&
               eq.getEquipment(EquipmentSlot.Legs)?.typeId === "pearlescite:pearlescite_leggings" &&
               eq.getEquipment(EquipmentSlot.Feet)?.typeId === "pearlescite:pearlescite_boots";
    } catch (e) { return false; }
}

function isWearingFullFractalizedArmor(player) {
    try {
        const eq = player.getComponent("minecraft:equippable");
        if (!eq) return false;
        return eq.getEquipment(EquipmentSlot.Head)?.typeId === "fractalized:fractalized_helmet" &&
               eq.getEquipment(EquipmentSlot.Chest)?.typeId === "fractalized:fractalized_chestplate" &&
               eq.getEquipment(EquipmentSlot.Legs)?.typeId === "fractalized:fractalized_leggings" &&
               eq.getEquipment(EquipmentSlot.Feet)?.typeId === "fractalized:fractalized_boots";
    } catch (e) { return false; }
}

function isWearingFullSpessartiteArmor(player) {
    try {
        const eq = player.getComponent("minecraft:equippable");
        if (!eq) return false;
        return eq.getEquipment(EquipmentSlot.Head)?.typeId === "spessartite:spessartite_helmet" &&
               eq.getEquipment(EquipmentSlot.Chest)?.typeId === "spessartite:spessartite_chestplate" &&
               eq.getEquipment(EquipmentSlot.Legs)?.typeId === "spessartite:spessartite_leggings" &&
               eq.getEquipment(EquipmentSlot.Feet)?.typeId === "spessartite:spessartite_boots";
    } catch (e) { return false; }
}

function isWearingFullGarnetArmor(player) {
    try {
        const eq = player.getComponent("minecraft:equippable");
        if (!eq) return false;
        return eq.getEquipment(EquipmentSlot.Head)?.typeId === "garnet:garnet_helmet" &&
               eq.getEquipment(EquipmentSlot.Chest)?.typeId === "garnet:garnet_chestplate" &&
               eq.getEquipment(EquipmentSlot.Legs)?.typeId === "garnet:garnet_leggings" &&
               eq.getEquipment(EquipmentSlot.Feet)?.typeId === "garnet:garnet_boots";
    } catch (e) { return false; }
}

function isWearingFullSilverArmor(player) {
    try {
        const eq = player.getComponent("minecraft:equippable");
        if (!eq) return false;
        return eq.getEquipment(EquipmentSlot.Head)?.typeId === "silver:silver_helmet" &&
               eq.getEquipment(EquipmentSlot.Chest)?.typeId === "silver:silver_chestplate" &&
               eq.getEquipment(EquipmentSlot.Legs)?.typeId === "silver:silver_leggings" &&
               eq.getEquipment(EquipmentSlot.Feet)?.typeId === "silver:silver_boots";
    } catch (e) { return false; }
}

function isWearingFullRubyArmor(player) {
    try {
        const eq = player.getComponent("minecraft:equippable");
        if (!eq) return false;
        return eq.getEquipment(EquipmentSlot.Head)?.typeId === "ruby:ruby_helmet" &&
               eq.getEquipment(EquipmentSlot.Chest)?.typeId === "ruby:ruby_chestplate" &&
               eq.getEquipment(EquipmentSlot.Legs)?.typeId === "ruby:ruby_leggings" &&
               eq.getEquipment(EquipmentSlot.Feet)?.typeId === "ruby:ruby_boots";
    } catch (e) { return false; }
}

function isWearingFullJadeArmor(player) {
    try {
        const eq = player.getComponent("minecraft:equippable");
        if (!eq) return false;
        return eq.getEquipment(EquipmentSlot.Head)?.typeId === "jade:jade_helmet" &&
               eq.getEquipment(EquipmentSlot.Chest)?.typeId === "jade:jade_chestplate" &&
               eq.getEquipment(EquipmentSlot.Legs)?.typeId === "jade:jade_leggings" &&
               eq.getEquipment(EquipmentSlot.Feet)?.typeId === "jade:jade_boots";
    } catch (e) { return false; }
}

// ============================================================================
// LORE UPDATE FUNCTION
// ============================================================================

function updateItemLore(itemStack, currentDamage, maxDurability) {
    if (!itemStack) return;
    
    let loreLines = [];
    
    try {
        const id = itemStack.typeId;
        const shortId = id.split(':').pop();
        const namespace = id.split(':')[0];
        
        // Get durability information
        const durabilityComp = itemStack.getComponent("minecraft:durability");
        let durabilityInfo = null;
        if (durabilityComp) {
            const current = durabilityComp.maxDurability - durabilityComp.damage;
            const max = durabilityComp.maxDurability;
            durabilityInfo = { current, max };
        } else if (currentDamage !== undefined && maxDurability !== undefined) {
            durabilityInfo = { current: maxDurability - currentDamage, max: maxDurability };
        }
        
        // Show durability fraction for all tools and armor
        if (durabilityInfo && (shortId.includes('_sword') || shortId.includes('_pickaxe') || shortId.includes('_axe') || 
                              shortId.includes('_shovel') || shortId.includes('_hoe') || shortId.includes('_helmet') || 
                              shortId.includes('_chestplate') || shortId.includes('_leggings') || shortId.includes('_boots'))) {
            const percentage = Math.floor((durabilityInfo.current / durabilityInfo.max) * 100);
            const color = percentage > 75 ? '§a' : percentage > 50 ? '§e' : percentage > 25 ? '§6' : '§c';
            loreLines.push(`${color}§oDurability: ${durabilityInfo.current}/${durabilityInfo.max}§r`);
        }
        
        // Tool attack stats (matching actual item damage values)
        const toolAttack = {
            'tazerite_sword': 9, 'tazerite_pickaxe': 7, 'tazerite_shovel': 7, 'tazerite_hoe': 2, 'tazerite_axe': 11,
            'hellfire_sword': 10, 'hellfire_pickaxe': 8, 'hellfire_shovel': 8, 'hellfire_hoe': 3, 'hellfire_axe': 12,
            'heavenbane_sword': 11, 'heavenbane_pickaxe': 9, 'heavenbane_shovel': 9, 'heavenbane_hoe': 4, 'heavenbane_axe': 13,
            'pearlescite_sword': 12, 'pearlescite_pickaxe': 10, 'pearlescite_shovel': 10, 'pearlescite_hoe': 5, 'pearlescite_axe': 14,
            'fractalized_sword': 15, 'fractalized_pickaxe': 12, 'fractalized_shovel': 11, 'fractalized_hoe': 6, 'fractalized_axe': 16,
            // New materials
            'spessartite_sword': 6, 'spessartite_pickaxe': 4, 'spessartite_shovel': 4, 'spessartite_hoe': 1, 'spessartite_axe': 8,
            'garnet_sword': 7, 'garnet_pickaxe': 5, 'garnet_shovel': 5, 'garnet_hoe': 2, 'garnet_axe': 9,
            'silver_sword': 8, 'silver_pickaxe': 6, 'silver_shovel': 6, 'silver_hoe': 2, 'silver_axe': 10,
            'ruby_sword': 9, 'ruby_pickaxe': 7, 'ruby_shovel': 7, 'ruby_hoe': 3, 'ruby_axe': 11,
            'jade_sword': 10, 'jade_pickaxe': 8, 'jade_shovel': 8, 'jade_hoe': 3, 'jade_axe': 12
        };
        
        // Armor protection stats
        const armorProt = {
            'tazerite_helmet': 4, 'tazerite_chestplate': 9, 'tazerite_leggings': 7, 'tazerite_boots': 4,
            'hellfire_helmet': 5, 'hellfire_chestplate': 10, 'hellfire_leggings': 8, 'hellfire_boots': 5,
            'heavenbane_helmet': 6, 'heavenbane_chestplate': 12, 'heavenbane_leggings': 9, 'heavenbane_boots': 6,
            'pearlescite_helmet': 7, 'pearlescite_chestplate': 13, 'pearlescite_leggings': 10, 'pearlescite_boots': 7,
            'fractalized_helmet': 9, 'fractalized_chestplate': 14, 'fractalized_leggings': 12, 'fractalized_boots': 8,
            // New materials
            'spessartite_helmet': 2, 'spessartite_chestplate': 5, 'spessartite_leggings': 4, 'spessartite_boots': 2,
            'garnet_helmet': 2, 'garnet_chestplate': 6, 'garnet_leggings': 5, 'garnet_boots': 2,
            'silver_helmet': 3, 'silver_chestplate': 7, 'silver_leggings': 6, 'silver_boots': 3,
            'ruby_helmet': 3, 'ruby_chestplate': 8, 'ruby_leggings': 7, 'ruby_boots': 3,
            'jade_helmet': 4, 'jade_chestplate': 9, 'jade_leggings': 8, 'jade_boots': 4
        };
        
        // Pickaxe power display
        if (shortId.endsWith('_pickaxe')) {
            const power = PICKAXE_POWER[id];
            if (power) {
                const colors = { 5: '§6', 7: '§8', 10: '§b', 15: '§7', 20: '§c', 25: '§4', 30: '§e', 35: '§a', 40: '§d', 50: '§9' };
                loreLines.push(`${colors[power] || '§6'}Pickaxe Power: ${power}%§r`);
            }
        }
        
        // Tool stats
        if (toolAttack[shortId] !== undefined) {
            const colors = { 'tazerite': '§b', 'hellfire': '§c', 'heavenbane': '§e', 'pearlescite': '§d', 'fractalized': '§9', 
                           'spessartite': '§6', 'garnet': '§4', 'silver': '§7', 'ruby': '§c', 'jade': '§a' };
            loreLines.push(`${colors[namespace] || '§b'}Attack Damage: +${toolAttack[shortId]}§r`);
        }
        
        // Armor stats with set bonuses
        if (armorProt[shortId] !== undefined) {
            const toughness = { 'tazerite': 3, 'hellfire': 4, 'heavenbane': 5, 'pearlescite': 6, 'fractalized': 8,
                              'spessartite': 1, 'garnet': 2, 'silver': 3, 'ruby': 4, 'jade': 5 };
            loreLines.push(`§9§oArmor Points: +${armorProt[shortId]}§r`);
            loreLines.push(`§9§oArmor Toughness: +${toughness[namespace] || 3}§r`);
            
            // Calculate total armor protection for this set to determine overflow
            const totalArmorPoints = armorProt[`${namespace}_helmet`] + armorProt[`${namespace}_chestplate`] + armorProt[`${namespace}_leggings`] + armorProt[`${namespace}_boots`];
            if (totalArmorPoints > 20) {
                loreLines.push(`§3§o⚠ Special UI displays armor overflow values§r`);
            }
            
            // ALWAYS show set bonuses for ALL armor pieces
            if (namespace === 'tazerite') {
                loreLines.push(`§5Set Bonus: 10% chance to heal on taking damage§r`);
                loreLines.push(`§7(Requires full Tazerite armor set)§r`);
            } else if (namespace === 'hellfire') {
                loreLines.push(`§cSet Bonus: Immune to fire and lava§r`);
                loreLines.push(`§c20% chance to ignite attackers (5s)§r`);
                loreLines.push(`§7(Requires full Hellfire armor set)§r`);
            } else if (namespace === 'heavenbane') {
                loreLines.push(`§eSet Bonus: Negates fall damage§r`);
                loreLines.push(`§eNight vision & glowing particles§r`);
                loreLines.push(`§7(Requires full Heavenbane armor set)§r`);
            } else if (namespace === 'pearlescite') {
                loreLines.push(`§dSet Bonus: Water breathing & conduit power§r`);
                loreLines.push(`§d50% chance for double damage attacks§r`);
                loreLines.push(`§7(Requires full Pearlescite armor set)§r`);
            } else if (namespace === 'fractalized') {
                loreLines.push(`§9Set Bonus: 5x ore multiplier & auto-smelt§r`);
                loreLines.push(`§9Extreme durability & efficiency§r`);
                loreLines.push(`§7(Requires full Fractalized armor set)§r`);
            } else if (namespace === 'spessartite') {
                loreLines.push(`§6Set Bonus: Increased mining speed in desert§r`);
                loreLines.push(`§6Heat resistance & haste effects§r`);
                loreLines.push(`§7(Requires full Spessartite armor set)§r`);
            } else if (namespace === 'garnet') {
                loreLines.push(`§4Set Bonus: Increased armor durability§r`);
                loreLines.push(`§4Stone resistance & strength§r`);
                loreLines.push(`§7(Requires full Garnet armor set)§r`);
            } else if (namespace === 'silver') {
                loreLines.push(`§7Set Bonus: Night vision & speed boost§r`);
                loreLines.push(`§7Moonlight empowerment effects§r`);
                loreLines.push(`§7(Requires full Silver armor set)§r`);
            } else if (namespace === 'ruby') {
                loreLines.push(`§cSet Bonus: Enhanced damage & critical hits§r`);
                loreLines.push(`§cFire aspect & strength boost§r`);
                loreLines.push(`§7(Requires full Ruby armor set)§r`);
            } else if (namespace === 'jade') {
                loreLines.push(`§aSet Bonus: Regeneration & poison immunity§r`);
                loreLines.push(`§7(Requires full Jade armor set)§r`);
            }
        }
    } catch (e) { }
    
    try {
        itemStack.setLore(loreLines);
    } catch (e) { }
}

// ============================================================================
// ARMOR DISPLAY OVERFLOW SYSTEM - Visual Armor Meter UI
// ============================================================================

// Armor tier colors for display
const ARMOR_TIER_COLORS = {
    'spessartite': '§6',   // Gold/Orange
    'garnet': '§c',        // Red
    'silver': '§7',        // Gray
    'ruby': '§4',          // Dark Red
    'jade': '§a',          // Green
    'tazerite': '§b',      // Aqua
    'hellfire': '§c',      // Red
    'heavenbane': '§9',    // Blue
    'pearlescite': '§d',   // Pink/Magenta
    'fractalized': '§3'    // Cyan
};

// Function to create visual armor bar
function createArmorBar(current, max, color) {
    const filled = Math.min(current, max);
    const segments = 10; // 10 segments for the bar
    const filledSegments = Math.round((filled / max) * segments);
    const emptySegments = segments - filledSegments;
    
    let bar = color;
    bar += '▰'.repeat(filledSegments);
    bar += '§8' + '▱'.repeat(emptySegments);
    return bar + '§r';
}

// Function to get armor set name from equipped pieces
function getArmorSetInfo(helmet, chestplate, leggings, boots) {
    const pieces = [helmet, chestplate, leggings, boots].filter(p => p);
    if (pieces.length === 0) return { name: null, color: '§7', count: 0 };
    
    // Count armor pieces by namespace
    const namespaces = {};
    for (const piece of pieces) {
        const ns = piece.typeId.split(':')[0];
        namespaces[ns] = (namespaces[ns] || 0) + 1;
    }
    
    // Find dominant armor set
    let dominant = null;
    let maxCount = 0;
    for (const [ns, count] of Object.entries(namespaces)) {
        if (count > maxCount && ARMOR_TIER_COLORS[ns]) {
            maxCount = count;
            dominant = ns;
        }
    }
    
    if (!dominant) return { name: null, color: '§7', count: 0 };
    
    const displayName = dominant.charAt(0).toUpperCase() + dominant.slice(1);
    return { 
        name: displayName, 
        color: ARMOR_TIER_COLORS[dominant] || '§7',
        count: maxCount,
        isFullSet: maxCount === 4
    };
}

// Function to handle armor overflow display for high-tier armor sets
function handleArmorOverflow(player) {
    try {
        const eq = player.getComponent("minecraft:equippable");
        if (!eq) return;

        // Calculate total armor protection
        let totalArmor = 0;
        const helmet = eq.getEquipment(EquipmentSlot.Head);
        const chestplate = eq.getEquipment(EquipmentSlot.Chest);
        const leggings = eq.getEquipment(EquipmentSlot.Legs);
        const boots = eq.getEquipment(EquipmentSlot.Feet);

        // Armor protection values for calculation (matches actual item values)
        const armorValues = {
            'spessartite_helmet': 2, 'spessartite_chestplate': 5, 'spessartite_leggings': 4, 'spessartite_boots': 2,  // Total: 13
            'garnet_helmet': 2, 'garnet_chestplate': 6, 'garnet_leggings': 5, 'garnet_boots': 2,                      // Total: 15
            'silver_helmet': 3, 'silver_chestplate': 7, 'silver_leggings': 6, 'silver_boots': 3,                      // Total: 19
            'ruby_helmet': 3, 'ruby_chestplate': 8, 'ruby_leggings': 7, 'ruby_boots': 3,                              // Total: 21
            'jade_helmet': 4, 'jade_chestplate': 9, 'jade_leggings': 8, 'jade_boots': 4,                              // Total: 25
            'tazerite_helmet': 4, 'tazerite_chestplate': 9, 'tazerite_leggings': 7, 'tazerite_boots': 4,              // Total: 24
            'hellfire_helmet': 5, 'hellfire_chestplate': 10, 'hellfire_leggings': 8, 'hellfire_boots': 5,             // Total: 28
            'heavenbane_helmet': 6, 'heavenbane_chestplate': 12, 'heavenbane_leggings': 9, 'heavenbane_boots': 6,     // Total: 33
            'pearlescite_helmet': 7, 'pearlescite_chestplate': 14, 'pearlescite_leggings': 11, 'pearlescite_boots': 7, // Total: 39
            'fractalized_helmet': 8, 'fractalized_chestplate': 12, 'fractalized_leggings': 10, 'fractalized_boots': 7  // Total: 37
        };

        if (helmet) {
            const shortId = helmet.typeId.split(':').pop();
            totalArmor += armorValues[shortId] || 0;
        }
        if (chestplate) {
            const shortId = chestplate.typeId.split(':').pop();
            totalArmor += armorValues[shortId] || 0;
        }
        if (leggings) {
            const shortId = leggings.typeId.split(':').pop();
            totalArmor += armorValues[shortId] || 0;
        }
        if (boots) {
            const shortId = boots.typeId.split(':').pop();
            totalArmor += armorValues[shortId] || 0;
        }

        // Only show UI for armor that exceeds vanilla max (20)
        if (totalArmor > 20) {
            const setInfo = getArmorSetInfo(helmet, chestplate, leggings, boots);
            
            // Calculate overflow beyond vanilla max (20)
            const overflowArmor = totalArmor - 20;
            
            // Build the display - only show bonus armor beyond 20
            let display = '';
            
            // Show armor set name with color
            if (setInfo.name) {
                display += `${setInfo.color}⛨ ${setInfo.name}`;
                if (setInfo.isFullSet) {
                    display += ' §e✦'; // Star for full set
                }
                display += '§r ';
            }
            
            // Show bonus bar for overflow armor (21-40 range)
            display += `§e+${overflowArmor} Bonus §f[${createArmorBar(overflowArmor, 20, '§e')}§f]`;
            
            // Show total armor value
            display += ` §7(${totalArmor} total)§r`;
            
            player.onScreenDisplay.setActionBar(display);
        }
    } catch (e) {
        // Silent error handling
    }
}

// Track which players have custom armor equipped
const playersWithCustomArmor = new Set();

// Run armor overflow check periodically for players with custom armor
system.runInterval(() => {
    try {
        for (const player of world.getAllPlayers()) {
            // Check if player has any custom armor
            const eq = player.getComponent("minecraft:equippable");
            if (!eq) continue;
            
            const armor = [
                eq.getEquipment(EquipmentSlot.Head),
                eq.getEquipment(EquipmentSlot.Chest),
                eq.getEquipment(EquipmentSlot.Legs),
                eq.getEquipment(EquipmentSlot.Feet)
            ];
            
            // Check for any custom armor pieces
            const customNamespaces = ['spessartite', 'garnet', 'silver', 'ruby', 'jade', 'tazerite', 'hellfire', 'heavenbane', 'pearlescite', 'fractalized'];
            const hasCustomArmor = armor.some(piece => {
                if (!piece) return false;
                const namespace = piece.typeId.split(':')[0];
                return customNamespaces.includes(namespace);
            });
            
            if (hasCustomArmor) {
                playersWithCustomArmor.add(player.id);
                handleArmorOverflow(player);
            } else {
                playersWithCustomArmor.delete(player.id);
            }
        }
    } catch (e) {
        // Silent error handling
    }
}, 20); // Check every second (20 ticks) for smoother updates

// ============================================================================
// PERIODIC LORE UPDATES FOR DURABILITY DISPLAY
// ============================================================================

// Ensure all items have up-to-date lore with durability information
system.runInterval(() => {
    try {
        for (const player of world.getAllPlayers()) {
            const eq = player.getComponent("minecraft:equippable");
            if (!eq) continue;
            
            // Update all equipped items
            const slots = [EquipmentSlot.Mainhand, EquipmentSlot.Offhand, EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet];
            
            for (const slot of slots) {
                const item = eq.getEquipment(slot);
                if (!item) continue;
                
                // Check if it's a custom item that needs lore updates
                const id = item.typeId;
                const isCustomItem = ['tazerite:', 'hellfire:', 'heavenbane:', 'pearlescite:', 'fractalized:', 
                                    'spessartite:', 'garnet:', 'silver:', 'ruby:', 'jade:'].some(prefix => id.startsWith(prefix));
                
                if (isCustomItem) {
                    const durabilityComp = item.getComponent("minecraft:durability");
                    if (durabilityComp) {
                        updateItemLore(item, durabilityComp.damage, durabilityComp.maxDurability);
                        eq.setEquipment(slot, item); // Refresh the item to show updated lore
                    }
                }
            }
            
            // Also update items in inventory
            const inventory = player.getComponent("minecraft:inventory");
            if (inventory && inventory.container) {
                for (let i = 0; i < inventory.container.size; i++) {
                    const item = inventory.container.getItem(i);
                    if (!item) continue;
                    
                    const id = item.typeId;
                    const isCustomItem = ['tazerite:', 'hellfire:', 'heavenbane:', 'pearlescite:', 'fractalized:', 
                                        'spessartite:', 'garnet:', 'silver:', 'ruby:', 'jade:'].some(prefix => id.startsWith(prefix));
                    
                    if (isCustomItem) {
                        const durabilityComp = item.getComponent("minecraft:durability");
                        if (durabilityComp) {
                            updateItemLore(item, durabilityComp.damage, durabilityComp.maxDurability);
                            inventory.container.setItem(i, item);
                        }
                    }
                }
            }
        }
    } catch (e) {
        // Silent error handling
    }
}, 200); // Update every 10 seconds (200 ticks)

// ============================================================================
// COMPONENT REGISTRATION
// ============================================================================

// Helper function to handle durability reduction
function handleDurabilityReduction(arg) {
    const itemStack = arg.itemStack;
    if (!itemStack) return;
    
    const durability = itemStack.getComponent("minecraft:durability");
    if (!durability) return;
    
    // Check for unbreaking enchantment
    const enchantable = itemStack.getComponent("minecraft:enchantable");
    const unbreakingLevel = enchantable?.getEnchantment('unbreaking')?.level ?? 0;
    
    // With unbreaking, there's a chance to not take damage
    if (unbreakingLevel > 0 && Math.random() < (unbreakingLevel / (unbreakingLevel + 1))) {
        return; // Tool survives without damage
    }
    
    let newDamage = durability.damage + 1;
    
    // Check if tool should break
    if (newDamage >= durability.maxDurability) {
        // Tool breaks - we need to clear it in the next tick
        if (arg.source) {
            system.run(() => {
                try {
                    const eq = arg.source.getComponent("minecraft:equippable");
                    if (eq) {
                        eq.setEquipment(EquipmentSlot.Mainhand, undefined);
                        arg.source.playSound('random.break');
                    }
                } catch (e) {}
            });
        }
        return;
    }
    
    durability.damage = newDamage;
    updateItemLore(itemStack, newDamage, durability.maxDurability);
}

world.beforeEvents.worldInitialize.subscribe((event) => {
    // Register unified durability components for each ore type
    // These handle both mining and combat durability reduction
    
    // Tazerite durability component
    event.itemComponentRegistry.registerCustomComponent("tazerite:durability", {
        onMineBlock(arg) { handleDurabilityReduction(arg); },
        onHitEntity(arg) { handleDurabilityReduction(arg); }
    });
    
    // Hellfire durability component
    event.itemComponentRegistry.registerCustomComponent("hellfire:durability", {
        onMineBlock(arg) { handleDurabilityReduction(arg); },
        onHitEntity(arg) { handleDurabilityReduction(arg); }
    });
    
    // Heavenbane durability component
    event.itemComponentRegistry.registerCustomComponent("heavenbane:durability", {
        onMineBlock(arg) { handleDurabilityReduction(arg); },
        onHitEntity(arg) { handleDurabilityReduction(arg); }
    });
    
    // Pearlescite durability component
    event.itemComponentRegistry.registerCustomComponent("pearlescite:durability", {
        onMineBlock(arg) { handleDurabilityReduction(arg); },
        onHitEntity(arg) { handleDurabilityReduction(arg); }
    });
    
    // Fractalized durability component
    event.itemComponentRegistry.registerCustomComponent("fractalized:durability", {
        onMineBlock(arg) { handleDurabilityReduction(arg); },
        onHitEntity(arg) { handleDurabilityReduction(arg); }
    });
    
    // Fractalized armor set bonus (5x ore drops when wearing full set)
    event.itemComponentRegistry.registerCustomComponent("fractalized:armor_set_bonus", {});
    
    // Fractalized armor durability
    event.itemComponentRegistry.registerCustomComponent("fractalized:armor_durability", {
        onHitEntity(arg) { if (arg.itemStack) updateItemLore(arg.itemStack); }
    });
    
    // Fractalized pickaxe auto-smelt component
    event.itemComponentRegistry.registerCustomComponent("fractalized:auto_smelt", {});
    
    // Fractalized tool interaction components
    event.itemComponentRegistry.registerCustomComponent("fractalized:strip_logs", {});
    event.itemComponentRegistry.registerCustomComponent("fractalized:till_soil", {});
    event.itemComponentRegistry.registerCustomComponent("fractalized:create_path", {});
    
    // Keep legacy component registrations for backward compatibility
    event.itemComponentRegistry.registerCustomComponent("tazerite:pickaxe_durability", {
        onMineBlock(arg) { handleDurabilityReduction(arg); },
        onHitEntity(arg) { handleDurabilityReduction(arg); }
    });
    event.itemComponentRegistry.registerCustomComponent("tazerite:tool_durability", {
        onMineBlock(arg) { handleDurabilityReduction(arg); },
        onHitEntity(arg) { handleDurabilityReduction(arg); }
    });
    event.itemComponentRegistry.registerCustomComponent("tazerite:armor_durability", {
        onHitEntity(arg) { if (arg.itemStack) updateItemLore(arg.itemStack); }
    });
    
    event.itemComponentRegistry.registerCustomComponent("hellfire:pickaxe_durability", {
        onMineBlock(arg) { handleDurabilityReduction(arg); },
        onHitEntity(arg) { handleDurabilityReduction(arg); }
    });
    event.itemComponentRegistry.registerCustomComponent("hellfire:tool_durability", {
        onMineBlock(arg) { handleDurabilityReduction(arg); },
        onHitEntity(arg) { handleDurabilityReduction(arg); }
    });
    event.itemComponentRegistry.registerCustomComponent("hellfire:armor_durability", {
        onHitEntity(arg) { if (arg.itemStack) updateItemLore(arg.itemStack); }
    });
    
    event.itemComponentRegistry.registerCustomComponent("heavenbane:pickaxe_durability", {
        onMineBlock(arg) { handleDurabilityReduction(arg); },
        onHitEntity(arg) { handleDurabilityReduction(arg); }
    });
    event.itemComponentRegistry.registerCustomComponent("heavenbane:tool_durability", {
        onMineBlock(arg) { handleDurabilityReduction(arg); },
        onHitEntity(arg) { handleDurabilityReduction(arg); }
    });
    event.itemComponentRegistry.registerCustomComponent("heavenbane:armor_durability", {
        onHitEntity(arg) { if (arg.itemStack) updateItemLore(arg.itemStack); }
    });
    
    event.itemComponentRegistry.registerCustomComponent("pearlescite:pickaxe_durability", {
        onMineBlock(arg) { handleDurabilityReduction(arg); },
        onHitEntity(arg) { handleDurabilityReduction(arg); }
    });
    event.itemComponentRegistry.registerCustomComponent("pearlescite:tool_durability", {
        onMineBlock(arg) { handleDurabilityReduction(arg); },
        onHitEntity(arg) { handleDurabilityReduction(arg); }
    });
    event.itemComponentRegistry.registerCustomComponent("pearlescite:armor_durability", {
        onHitEntity(arg) { if (arg.itemStack) updateItemLore(arg.itemStack); }
    });
    
    // Register custom components for new materials
    event.itemComponentRegistry.registerCustomComponent("spessartite:durability", {
        onMineBlock(arg) { handleDurabilityReduction(arg); },
        onHitEntity(arg) { handleDurabilityReduction(arg); }
    });
    event.itemComponentRegistry.registerCustomComponent("spessartite:armor_durability", {
        onHitEntity(arg) { if (arg.itemStack) updateItemLore(arg.itemStack); }
    });
    
    event.itemComponentRegistry.registerCustomComponent("garnet:durability", {
        onMineBlock(arg) { handleDurabilityReduction(arg); },
        onHitEntity(arg) { handleDurabilityReduction(arg); }
    });
    event.itemComponentRegistry.registerCustomComponent("garnet:armor_durability", {
        onHitEntity(arg) { if (arg.itemStack) updateItemLore(arg.itemStack); }
    });
    
    event.itemComponentRegistry.registerCustomComponent("silver:durability", {
        onMineBlock(arg) { handleDurabilityReduction(arg); },
        onHitEntity(arg) { handleDurabilityReduction(arg); }
    });
    event.itemComponentRegistry.registerCustomComponent("silver:armor_durability", {
        onHitEntity(arg) { if (arg.itemStack) updateItemLore(arg.itemStack); }
    });
    
    event.itemComponentRegistry.registerCustomComponent("ruby:durability", {
        onMineBlock(arg) { handleDurabilityReduction(arg); },
        onHitEntity(arg) { handleDurabilityReduction(arg); }
    });
    event.itemComponentRegistry.registerCustomComponent("ruby:armor_durability", {
        onHitEntity(arg) { if (arg.itemStack) updateItemLore(arg.itemStack); }
    });
    
    event.itemComponentRegistry.registerCustomComponent("jade:durability", {
        onMineBlock(arg) { handleDurabilityReduction(arg); },
        onHitEntity(arg) { handleDurabilityReduction(arg); }
    });
    event.itemComponentRegistry.registerCustomComponent("jade:armor_durability", {
        onHitEntity(arg) { if (arg.itemStack) updateItemLore(arg.itemStack); }
    });
});

// ============================================================================
// MINING RESTRICTIONS - Only for Tazerite+ ores that require pickaxe power
// Pre-Tazerite ores (spessartite, garnet, silver, ruby, jade) use vanilla mining tiers
// ============================================================================

world.beforeEvents.playerBreakBlock.subscribe((event) => {
    const blockId = event.block.typeId;
    
    // Only check ores that require pickaxe power (Tazerite and above)
    if (!VALID_PICKAXES[blockId]) return;
    
    const player = event.player;
    if (player.getGameMode() === GameMode.creative) return;
    
    const eq = player.getComponent("minecraft:equippable");
    if (!eq) {
        event.cancel = true;
        return;
    }
    
    const mainhand = eq.getEquipment(EquipmentSlot.Mainhand);
    const toolId = mainhand?.typeId;
    
    // Check if tool is valid for this ore
    if (!toolId || !VALID_PICKAXES[blockId].includes(toolId)) {
        event.cancel = true;
        
        // Send message about required pickaxe
        system.run(() => {
            const oreNames = {
                'tazerite:tazerite_ore': '§bTazerite Ore§r requires a §fNetherite Pickaxe§r or a §bTazerite Pickaxe§r!',
                'hellfire:hellfire_ore': '§cHellfire Ore§r requires a §bTazerite Pickaxe§r (10% power) or better!',
                'heavenbane:heavenbane_ore': '§9Heavenbane Ore§r requires a §cHellfire Pickaxe§r (20% power) or better!',
                'pearlescite:pearlescite_ore': '§dPearlescite Ore§r requires a §9Heavenbane Pickaxe§r (30% power) or better!'
            };
            if (oreNames[blockId]) {
                player.sendMessage(oreNames[blockId]);
            }
        });
    }
});

// ============================================================================
// TOOL DURABILITY - Block Breaking
// ============================================================================

world.afterEvents.playerBreakBlock.subscribe((event) => {
    try {
        const { player, itemStackBeforeBreak, brokenBlockPermutation } = event;
        if (!player || player.getGameMode() === GameMode.creative) return;
        
        const eq = player.getComponent("minecraft:equippable");
        if (!eq) return;
        
        const tool = eq.getEquipment(EquipmentSlot.Mainhand);
        const toolId = tool?.typeId;
        
        // Check for Fractalized armor set bonus (5x SMELTED ore) - works with ANY pickaxe
        const wearingFractalizedSet = isWearingFullFractalizedArmor(player);
        if (wearingFractalizedSet && brokenBlockPermutation) {
            const blockId = brokenBlockPermutation.type.id;
            
            // Map ores to their smelted/processed items
            const oreToSmeltedMap = {
                // Vanilla smelted ores
                'minecraft:iron_ore': 'minecraft:iron_ingot',
                'minecraft:deepslate_iron_ore': 'minecraft:iron_ingot',
                'minecraft:gold_ore': 'minecraft:gold_ingot',
                'minecraft:deepslate_gold_ore': 'minecraft:gold_ingot',
                'minecraft:copper_ore': 'minecraft:copper_ingot',
                'minecraft:deepslate_copper_ore': 'minecraft:copper_ingot',
                'minecraft:nether_gold_ore': 'minecraft:gold_ingot',
                // Vanilla raw drop ores (don't smelt)
                'minecraft:coal_ore': 'minecraft:coal',
                'minecraft:deepslate_coal_ore': 'minecraft:coal',
                'minecraft:diamond_ore': 'minecraft:diamond',
                'minecraft:deepslate_diamond_ore': 'minecraft:diamond',
                'minecraft:emerald_ore': 'minecraft:emerald',
                'minecraft:deepslate_emerald_ore': 'minecraft:emerald',
                'minecraft:lapis_ore': 'minecraft:lapis_lazuli',
                'minecraft:deepslate_lapis_ore': 'minecraft:lapis_lazuli',
                'minecraft:redstone_ore': 'minecraft:redstone',
                'minecraft:deepslate_redstone_ore': 'minecraft:redstone',
                'minecraft:nether_quartz_ore': 'minecraft:quartz',
                // Custom ores
                'tazerite:tazerite_ore': 'tazerite:tazerite_crystal',
                'hellfire:hellfire_ore': 'hellfire:hellfire_fractal',
                'heavenbane:heavenbane_ore': 'heavenbane:shard_of_heaven',
                'pearlescite:pearlescite_ore': 'pearlescite:pearlescite_orb',
                'silver:silver_ore': 'silver:silver_clump',
                'ruby:ruby_ore': 'ruby:ruby',
                'jade:jade_ore': 'jade:jadestone',
                'spessartite:spessartite_ore': 'spessartite:spessartite',
                'garnet:garnet_ore': 'garnet:garnet'
            };
            
            if (oreToSmeltedMap[blockId]) {
                // Give 5 smelted items
                system.run(() => {
                    try {
                        const container = player.getComponent('minecraft:inventory').container;
                        const smeltedItem = new ItemStack(oreToSmeltedMap[blockId], 5);
                        container.addItem(smeltedItem);
                    } catch (e) {}
                });
            }
        }
        
        // Only process custom tools beyond this point
        if (!tool) return;
        const customPrefixes = ['tazerite:', 'hellfire:', 'heavenbane:', 'pearlescite:', 'fractalized:', 'spessartite:', 'garnet:', 'silver:', 'ruby:', 'jade:'];
        if (!toolId || !customPrefixes.some(p => toolId.startsWith(p))) return;
        
        const cDurability = tool.getComponent("minecraft:durability");
        if (!cDurability) return;
        
        const maxDmg = cDurability.maxDurability;
        let dmg = cDurability.damage || 0;
        
        // Apply unbreaking enchantment
        const cEnchantable = tool.getComponent('minecraft:enchantable');
        const unbreakingLvl = cEnchantable?.getEnchantment('unbreaking')?.level ?? 0;
        
        if (unbreakingLvl > 0) {
            if (1 / (unbreakingLvl + 1) >= Math.random()) {
                dmg = Math.min(maxDmg, dmg + 1);
            }
        } else {
            dmg = Math.min(maxDmg, dmg + 1);
        }
        
        // Apply damage first
        cDurability.damage = dmg;
        
        // Check if tool should break
        if (dmg >= maxDmg) {
            eq.setEquipment(EquipmentSlot.Mainhand, undefined);
            player.playSound("random.break");
            return;
        }
        
        // Update lore display
        updateItemLore(tool, dmg, maxDmg);
        
        // Save changes
        eq.setEquipment(EquipmentSlot.Mainhand, tool);
    } catch (e) { 
        console.error('playerBreakBlock durability error:', e); 
    }
});

// ============================================================================
// TOOL DURABILITY - Entity Hitting
// ============================================================================

world.afterEvents.entityHitEntity.subscribe((event) => {
    try {
        const { damagingEntity, hitEntity } = event;
        if (!damagingEntity || damagingEntity.typeId !== "minecraft:player") return;
        
        const player = damagingEntity;
        if (player.getGameMode() === GameMode.creative) return;
        
        const eq = player.getComponent("minecraft:equippable");
        if (!eq) return;
        
        const tool = eq.getEquipment(EquipmentSlot.Mainhand);
        if (!tool) return;
        
        // Only process our custom tools
        const toolId = tool.typeId;
        const customPrefixes = ['tazerite:', 'hellfire:', 'heavenbane:', 'pearlescite:'];
        if (!toolId || !customPrefixes.some(p => toolId.startsWith(p))) return;
        
        const cDurability = tool.getComponent("minecraft:durability");
        if (!cDurability) return;
        
        const maxDmg = cDurability.maxDurability;
        let dmg = cDurability.damage || 0;
        
        // Apply unbreaking enchantment
        const cEnchantable = tool.getComponent('minecraft:enchantable');
        const unbreakingLvl = cEnchantable?.getEnchantment('unbreaking')?.level ?? 0;
        
        if (unbreakingLvl > 0) {
            if (1 / (unbreakingLvl + 1) >= Math.random()) {
                dmg = Math.min(maxDmg, dmg + 1);
            }
        } else {
            dmg = Math.min(maxDmg, dmg + 1);
        }
        
        // Apply damage first
        cDurability.damage = dmg;
        
        // Check if tool should break
        if (dmg >= maxDmg) {
            eq.setEquipment(EquipmentSlot.Mainhand, undefined);
            player.playSound("random.break");
            return;
        }
        
        // Update lore display
        updateItemLore(tool, dmg, maxDmg);
        
        // Save changes
        eq.setEquipment(EquipmentSlot.Mainhand, tool);
        
        // === ARMOR SET ATTACK BONUSES ===
        
        // Ruby Armor: Enhanced damage & critical hits with fire aspect
        if (isWearingFullRubyArmor(player)) {
            // 30% chance for critical hit (1.5x damage)
            if (Math.random() < 0.30) {
                try {
                    hitEntity.applyDamage(2); // Extra damage
                    hitEntity.setOnFire(60, true); // Fire aspect
                    player.runCommand('particle minecraft:critical_hit_emitter ~ ~1 ~');
                    player.runCommand('title @s actionbar §c§l⚡ CRITICAL HIT! §r§f+2 damage');
                } catch (e) { }
            }
            
            // Fire aspect on all attacks
            if (Math.random() < 0.50) {
                try {
                    hitEntity.setOnFire(40, true);
                } catch (e) { }
            }
        }
        
        // Jade Armor: Poison attacks in jungle
        if (isWearingFullJadeArmor(player)) {
            // Check if in jungle-like environment
            const loc = player.location;
            try {
                const blockBelow = player.dimension.getBlock({ x: Math.floor(loc.x), y: Math.floor(loc.y - 1), z: Math.floor(loc.z) });
                if (blockBelow && (blockBelow.typeId.includes("jungle") || blockBelow.typeId.includes("vine") || blockBelow.typeId.includes("leaves"))) {
                    hitEntity.addEffect("poison", 100, { amplifier: 1, showParticles: true });
                    player.runCommand('title @s actionbar §a§l🗡 JADE POISON! §r§7Jungle stealth activated');
                }
            } catch (e) { }
        }
        
        // === PEARLESCITE DOUBLE DAMAGE ===
        if (isWearingFullPearlesciteArmor(player) && Math.random() < 0.5) {
            const damageValues = {
                "pearlescite:pearlescite_sword": 16,
                "pearlescite:pearlescite_axe": 15,
                "pearlescite:pearlescite_pickaxe": 12,
                "pearlescite:pearlescite_shovel": 11,
                "pearlescite:pearlescite_hoe": 7
            };
            
            const baseDamage = damageValues[toolId] || 5;
            
            try {
                hitEntity.applyDamage(baseDamage, { cause: "entityAttack", damagingEntity: player });
                player.runCommand(`title @s actionbar §d§l✦ DOUBLE STRIKE! §r§f+${baseDamage} §7(${baseDamage * 2} total)§r`);
                
                const loc = hitEntity.location;
                player.dimension.spawnParticle("minecraft:critical_hit_emitter", { x: loc.x, y: loc.y + 1, z: loc.z });
            } catch (e) { }
        }
    } catch (e) { 
        console.error('entityHitEntity durability error:', e); 
    }
});

// ============================================================================
// ARMOR SET EFFECTS - INTERVAL BASED
// ============================================================================

system.runInterval(() => {
    try {
        for (const player of world.getAllPlayers()) {
            const playerId = player.id;
            
            // Hellfire: Fire resistance
            if (isWearingFullHellfireArmor(player)) {
                player.runCommand('effect @s fire_resistance 2 1 true');
            }
            
            // Heavenbane: Night vision and particles
            const hasHeavenbane = isWearingFullHeavenbaneArmor(player);
            if (hasHeavenbane) {
                const lastApplied = playersWithNightVision.get(playerId) || 0;
                const now = Date.now();
                if (now - lastApplied > 25 * 60 * 1000) {
                    player.runCommand('effect @s night_vision 1800 0 true');
                    playersWithNightVision.set(playerId, now);
                }
                if (Math.random() < 0.3) {
                    player.runCommand('particle minecraft:endrod ~ ~1 ~');
                }
            } else if (playersWithNightVision.has(playerId)) {
                playersWithNightVision.delete(playerId);
                try { player.runCommand('effect @s night_vision 0'); } catch (e) { }
            }
            
            // Pearlescite: Water breathing and conduit power
            if (isWearingFullPearlesciteArmor(player)) {
                player.addEffect("water_breathing", 220, { amplifier: 0, showParticles: false });
                player.addEffect("conduit_power", 220, { amplifier: 0, showParticles: false });
                
                if (player.isInWater && Math.random() < 0.3) {
                    const loc = player.location;
                    try {
                        player.dimension.spawnParticle("minecraft:bubble_column_up_particle", {
                            x: loc.x + (Math.random() - 0.5),
                            y: loc.y + Math.random() * 2,
                            z: loc.z + (Math.random() - 0.5)
                        });
                    } catch (e) { }
                }
            }
            
            // NEW ARMOR SET EFFECTS
            
            // Spessartite: Desert mining speed boost & heat resistance
            if (isWearingFullSpessartiteArmor(player)) {
                player.addEffect("fire_resistance", 220, { amplifier: 0, showParticles: false });
                
                // Check if in desert biome for haste
                const loc = player.location;
                try {
                    const blockBelow = player.dimension.getBlock({ x: Math.floor(loc.x), y: Math.floor(loc.y - 1), z: Math.floor(loc.z) });
                    if (blockBelow && (blockBelow.typeId.includes("sand") || blockBelow.typeId.includes("sandstone"))) {
                        player.addEffect("haste", 220, { amplifier: 0, showParticles: false });
                    }
                } catch (e) { }
            }
            
            // Garnet: Stone resistance & strength
            if (isWearingFullGarnetArmor(player)) {
                player.addEffect("resistance", 220, { amplifier: 0, showParticles: false });
                player.addEffect("strength", 220, { amplifier: 0, showParticles: false });
            }
            
            // Silver: Night vision & speed boost (moonlight empowerment)
            if (isWearingFullSilverArmor(player)) {
                player.addEffect("night_vision", 220, { amplifier: 0, showParticles: false });
                player.addEffect("speed", 220, { amplifier: 0, showParticles: false });
                
                // Extra effects at night
                const timeOfDay = player.dimension.getTimeOfDay();
                if (timeOfDay > 13000 || timeOfDay < 1000) { // Night time
                    player.addEffect("jump_boost", 220, { amplifier: 0, showParticles: false });
                }
            }
            
            // Ruby: Enhanced damage & fire aspect (strength boost)
            if (isWearingFullRubyArmor(player)) {
                player.addEffect("strength", 220, { amplifier: 1, showParticles: false });
                player.addEffect("fire_resistance", 220, { amplifier: 0, showParticles: false });
            }
            
            // Jade: Regeneration & poison immunity (jungle stealth)
            if (isWearingFullJadeArmor(player)) {
                player.addEffect("regeneration", 220, { amplifier: 0, showParticles: false });
                player.addEffect("poison", 1, { amplifier: 0, showParticles: false }); // Clear poison
                
                // Jungle camouflage - invisibility when sneaking in jungle
                if (player.isSneaking) {
                    const loc = player.location;
                    try {
                        const blockBelow = player.dimension.getBlock({ x: Math.floor(loc.x), y: Math.floor(loc.y - 1), z: Math.floor(loc.z) });
                        if (blockBelow && (blockBelow.typeId.includes("jungle") || blockBelow.typeId.includes("vine") || blockBelow.typeId.includes("leaves"))) {
                            player.addEffect("invisibility", 220, { amplifier: 0, showParticles: false });
                        }
                    } catch (e) { }
                }
            }
        }
    } catch (e) { }
}, 20);

// ============================================================================
// ARMOR SET EFFECTS - DAMAGE BASED
// ============================================================================

world.afterEvents.entityHurt.subscribe((event) => {
    try {
        const { hurtEntity, damage, damageSource } = event;
        
        if (!hurtEntity || hurtEntity.typeId !== "minecraft:player") return;
        if (hurtEntity.getGameMode() === GameMode.creative) return;
        
        const player = hurtEntity;
        
        // ============================================================================
        // CUSTOM ARMOR DAMAGE REDUCTION
        // Apply damage reduction based on armor protection values
        // ============================================================================
        const armorProtection = {
            // Helmet protection values
            'spessartite:spessartite_helmet': 2,
            'garnet:garnet_helmet': 2,
            'silver:silver_helmet': 3,
            'ruby:ruby_helmet': 3,
            'jade:jade_helmet': 4,
            'tazerite:tazerite_helmet': 4,
            'hellfire:hellfire_helmet': 5,
            'heavenbane:heavenbane_helmet': 4,
            'pearlescite:pearlescite_helmet': 3,
            'fractalized:fractalized_helmet': 5,
            
            // Chestplate protection values
            'spessartite:spessartite_chestplate': 5,
            'garnet:garnet_chestplate': 6,
            'silver:silver_chestplate': 6,
            'ruby:ruby_chestplate': 9,
            'jade:jade_chestplate': 9,
            'tazerite:tazerite_chestplate': 9,
            'hellfire:hellfire_chestplate': 10,
            'heavenbane:heavenbane_chestplate': 9,
            'pearlescite:pearlescite_chestplate': 9,
            'fractalized:fractalized_chestplate': 11,
            
            // Leggings protection values
            'spessartite:spessartite_leggings': 4,
            'garnet:garnet_leggings': 5,
            'silver:silver_leggings': 5,
            'ruby:ruby_leggings': 7,
            'jade:jade_leggings': 7,
            'tazerite:tazerite_leggings': 7,
            'hellfire:hellfire_leggings': 8,
            'heavenbane:heavenbane_leggings': 7,
            'pearlescite:pearlescite_leggings': 6,
            'fractalized:fractalized_leggings': 9,
            
            // Boots protection values
            'spessartite:spessartite_boots': 1,
            'garnet:garnet_boots': 2,
            'silver:silver_boots': 2,
            'ruby:ruby_boots': 3,
            'jade:jade_boots': 3,
            'tazerite:tazerite_boots': 4,
            'hellfire:hellfire_boots': 4,
            'heavenbane:heavenbane_boots': 4,
            'pearlescite:pearlescite_boots': 3,
            'fractalized:fractalized_boots': 4
        };
        
        // Calculate total armor points
        let totalArmorPoints = 0;
        const eq = player.getComponent("minecraft:equippable");
        if (eq) {
            const head = eq.getEquipment(EquipmentSlot.Head);
            const chest = eq.getEquipment(EquipmentSlot.Chest);
            const legs = eq.getEquipment(EquipmentSlot.Legs);
            const feet = eq.getEquipment(EquipmentSlot.Feet);
            
            if (head?.typeId) totalArmorPoints += armorProtection[head.typeId] || 0;
            if (chest?.typeId) totalArmorPoints += armorProtection[chest.typeId] || 0;
            if (legs?.typeId) totalArmorPoints += armorProtection[legs.typeId] || 0;
            if (feet?.typeId) totalArmorPoints += armorProtection[feet.typeId] || 0;
        }
        
        // Apply damage reduction if wearing custom armor
        // Uses diminishing returns formula: reduction = armor / (armor + 5)
        // This gives more spaced out protection values:
        // Spessartite (12) = 70.6%, Garnet (15) = 75%, Silver (16) = 76.2%
        // Ruby (22) = 81.5%, Jade (23) = 82.1%, Tazerite (24) = 82.8%
        // Pearlescite (21) = 80.8%, Hellfire (27) = 84.4%, Fractalized (29) = 85.3%
        if (totalArmorPoints > 0) {
            const damageReduction = totalArmorPoints / (totalArmorPoints + 5);
            const reducedDamage = damage * damageReduction;
            
            // Heal back the reduced damage amount
            const healthComp = player.getComponent("minecraft:health");
            if (healthComp && reducedDamage > 0) {
                const newHealth = Math.min(healthComp.effectiveMax, healthComp.currentValue + reducedDamage);
                healthComp.setCurrentValue(newHealth);
            }
        }
        
        // Tazerite: 10% heal on damage
        if (isWearingFullTazeriteArmor(player)) {
            if (Math.random() < 0.10) {
                const healthComp = player.getComponent("minecraft:health");
                if (healthComp && damage > 0) {
                    const newHealth = Math.min(healthComp.effectiveMax, healthComp.currentValue + damage);
                    healthComp.setCurrentValue(newHealth);
                    player.runCommand('particle minecraft:heart_particle ~ ~1 ~');
                }
            }
        }
        
        // Hellfire: 20% ignite attacker
        if (isWearingFullHellfireArmor(player) && damageSource.damagingEntity) {
            if (Math.random() < 0.20) {
                try {
                    damageSource.damagingEntity.setOnFire(100, true);
                    player.runCommand('particle minecraft:flame_particle ~ ~1 ~');
                } catch (e) { }
            }
        }
        
        // Heavenbane: Negate fall damage
        if (isWearingFullHeavenbaneArmor(player) && damageSource.cause === "fall") {
            const healthComp = player.getComponent("minecraft:health");
            if (healthComp) {
                const newHealth = Math.min(healthComp.effectiveMax, healthComp.currentValue + damage);
                healthComp.setCurrentValue(newHealth);
                player.runCommand('particle minecraft:endrod ~ ~0.5 ~');
            }
        }
        
        // Process armor durability for all custom armor types
        if (!eq) return;
        
        const armorSlots = [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet];
        const customPrefixes = [
            'spessartite:', 'garnet:', 'silver:', 'ruby:', 'jade:',
            'tazerite:', 'hellfire:', 'heavenbane:', 'pearlescite:', 'fractalized:'
        ];
        
        for (const slot of armorSlots) {
            const armor = eq.getEquipment(slot);
            if (!armor) continue;
            
            const armorId = armor.typeId;
            if (!armorId || !customPrefixes.some(p => armorId.startsWith(p))) continue;
            
            const cDurability = armor.getComponent("minecraft:durability");
            if (!cDurability) continue;
            
            const maxDmg = cDurability.maxDurability;
            let dmg = cDurability.damage || 0;
            
            const cEnchantable = armor.getComponent('minecraft:enchantable');
            const unbreakingLvl = cEnchantable?.getEnchantment('unbreaking')?.level ?? 0;
            
            if (unbreakingLvl > 0) {
                if (1 / (unbreakingLvl + 1) >= Math.random()) {
                    dmg = Math.min(maxDmg, dmg + 1);
                }
            } else {
                dmg = Math.min(maxDmg, dmg + 1);
            }
            
            updateItemLore(armor, dmg, maxDmg);
            
            if (dmg >= maxDmg) {
                eq.setEquipment(slot, undefined);
                player.playSound("random.break");
                continue;
            }
            
            cDurability.damage = dmg;
            eq.setEquipment(slot, armor);
        }
    } catch (e) { }
});

// ============================================================================
// INITIALIZE LORE ON SPAWN
// ============================================================================

world.afterEvents.playerSpawn.subscribe((event) => {
    const player = event.player;
    
    system.runTimeout(() => {
        const eq = player.getComponent("minecraft:equippable");
        if (!eq) return;
        
        const allSlots = [
            EquipmentSlot.Mainhand, EquipmentSlot.Offhand,
            EquipmentSlot.Head, EquipmentSlot.Chest, 
            EquipmentSlot.Legs, EquipmentSlot.Feet
        ];
        
        const customPrefixes = ['tazerite:', 'hellfire:', 'heavenbane:', 'pearlescite:'];
        
        for (const slot of allSlots) {
            const item = eq.getEquipment(slot);
            if (!item) continue;
            
            if (customPrefixes.some(p => item.typeId.startsWith(p))) {
                const dur = item.getComponent("minecraft:durability");
                if (dur) {
                    updateItemLore(item, dur.damage || 0, dur.maxDurability);
                    eq.setEquipment(slot, item);
                }
            }
        }
    }, 20);
});

// Periodic lore update for all players
system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        try {
            const eq = player.getComponent("minecraft:equippable");
            if (!eq) continue;
            
            const allSlots = [
                EquipmentSlot.Mainhand, EquipmentSlot.Offhand,
                EquipmentSlot.Head, EquipmentSlot.Chest,
                EquipmentSlot.Legs, EquipmentSlot.Feet
            ];
            
            const customPrefixes = ['tazerite:', 'hellfire:', 'heavenbane:', 'pearlescite:'];
            
            for (const slot of allSlots) {
                const item = eq.getEquipment(slot);
                if (!item) continue;
                
                if (customPrefixes.some(p => item.typeId.startsWith(p))) {
                    const dur = item.getComponent("minecraft:durability");
                    if (dur) {
                        updateItemLore(item, dur.damage || 0, dur.maxDurability);
                        eq.setEquipment(slot, item);
                    }
                }
            }
        } catch (e) { }
    }
}, 100);

// ============================================================================
// TOOL INTERACTIONS (Strip Logs, Till Soil, Create Paths)
// ============================================================================

// Custom axes that can strip logs
const CUSTOM_AXES = [
    'tazerite:tazerite_axe',
    'hellfire:hellfire_axe',
    'heavenbane:heavenbane_axe',
    'pearlescite:pearlescite_axe',
    'fractalized:fractalized_axe',
    'spessartite:spessartite_axe',
    'garnet:garnet_axe',
    'silver:silver_axe',
    'ruby:ruby_axe',
    'jade:jade_axe'
];

// Custom hoes that can till soil
const CUSTOM_HOES = [
    'tazerite:tazerite_hoe',
    'hellfire:hellfire_hoe',
    'heavenbane:heavenbane_hoe',
    'pearlescite:pearlescite_hoe',
    'fractalized:fractalized_hoe',
    'spessartite:spessartite_hoe',
    'garnet:garnet_hoe',
    'silver:silver_hoe',
    'ruby:ruby_hoe',
    'jade:jade_hoe'
];

// Custom shovels that can create paths
const CUSTOM_SHOVELS = [
    'tazerite:tazerite_shovel',
    'hellfire:hellfire_shovel',
    'heavenbane:heavenbane_shovel',
    'pearlescite:pearlescite_shovel',
    'fractalized:fractalized_shovel',
    'spessartite:spessartite_shovel',
    'garnet:garnet_shovel',
    'silver:silver_shovel',
    'ruby:ruby_shovel',
    'jade:jade_shovel'
];

// Log to stripped log mapping
const STRIP_MAP = {
    'minecraft:oak_log': 'minecraft:stripped_oak_log',
    'minecraft:spruce_log': 'minecraft:stripped_spruce_log',
    'minecraft:birch_log': 'minecraft:stripped_birch_log',
    'minecraft:jungle_log': 'minecraft:stripped_jungle_log',
    'minecraft:acacia_log': 'minecraft:stripped_acacia_log',
    'minecraft:dark_oak_log': 'minecraft:stripped_dark_oak_log',
    'minecraft:mangrove_log': 'minecraft:stripped_mangrove_log',
    'minecraft:cherry_log': 'minecraft:stripped_cherry_log',
    'minecraft:crimson_stem': 'minecraft:stripped_crimson_stem',
    'minecraft:warped_stem': 'minecraft:stripped_warped_stem',
    'minecraft:oak_wood': 'minecraft:stripped_oak_wood',
    'minecraft:spruce_wood': 'minecraft:stripped_spruce_wood',
    'minecraft:birch_wood': 'minecraft:stripped_birch_wood',
    'minecraft:jungle_wood': 'minecraft:stripped_jungle_wood',
    'minecraft:acacia_wood': 'minecraft:stripped_acacia_wood',
    'minecraft:dark_oak_wood': 'minecraft:stripped_dark_oak_wood',
    'minecraft:mangrove_wood': 'minecraft:stripped_mangrove_wood',
    'minecraft:cherry_wood': 'minecraft:stripped_cherry_wood',
    'minecraft:crimson_hyphae': 'minecraft:stripped_crimson_hyphae',
    'minecraft:warped_hyphae': 'minecraft:stripped_warped_hyphae',
    'minecraft:bamboo_block': 'minecraft:stripped_bamboo_block'
};

// Blocks that can be tilled into farmland
const TILLABLE_BLOCKS = [
    'minecraft:dirt',
    'minecraft:grass_block',
    'minecraft:grass',
    'minecraft:dirt_with_roots',
    'minecraft:coarse_dirt'
];

// Blocks that can be turned into paths
const PATH_BLOCKS = [
    'minecraft:dirt',
    'minecraft:grass_block',
    'minecraft:grass',
    'minecraft:dirt_with_roots',
    'minecraft:coarse_dirt',
    'minecraft:mycelium',
    'minecraft:podzol',
    'minecraft:rooted_dirt'
];

// Handle tool interactions
world.beforeEvents.itemUseOn.subscribe((event) => {
    const player = event.source;
    const item = event.itemStack;
    const block = event.block;
    
    if (!item || !block) return;
    
    const itemId = item.typeId;
    const blockId = block.typeId;
    
    // Axe stripping logs
    if (CUSTOM_AXES.includes(itemId) && STRIP_MAP[blockId]) {
        event.cancel = true;
        system.run(() => {
            try {
                const strippedType = STRIP_MAP[blockId];
                const blockLocation = block.location;
                const dimension = block.dimension;
                
                // Get block states (for log axis orientation)
                const permutation = block.permutation;
                let axisState = null;
                try {
                    axisState = permutation.getState('pillar_axis');
                } catch (e) { }
                
                // Set the stripped variant
                dimension.runCommand(`setblock ${blockLocation.x} ${blockLocation.y} ${blockLocation.z} ${strippedType}${axisState ? ` ["pillar_axis"="${axisState}"]` : ''}`);
                
                // Play sound
                player.playSound('use.wood');
                
                // Damage the tool
                damageTool(player, item);
            } catch (e) { }
        });
        return;
    }
    
    // Hoe tilling soil
    if (CUSTOM_HOES.includes(itemId) && TILLABLE_BLOCKS.includes(blockId)) {
        // Check if there's air above the block
        const aboveBlock = block.above();
        if (aboveBlock && aboveBlock.typeId !== 'minecraft:air') return;
        
        event.cancel = true;
        system.run(() => {
            try {
                const blockLocation = block.location;
                const dimension = block.dimension;
                
                dimension.runCommand(`setblock ${blockLocation.x} ${blockLocation.y} ${blockLocation.z} farmland`);
                player.playSound('use.gravel');
                damageTool(player, item);
            } catch (e) { }
        });
        return;
    }
    
    // Shovel creating paths
    if (CUSTOM_SHOVELS.includes(itemId) && PATH_BLOCKS.includes(blockId)) {
        // Check if there's air above the block
        const aboveBlock = block.above();
        if (aboveBlock && aboveBlock.typeId !== 'minecraft:air') return;
        
        event.cancel = true;
        system.run(() => {
            try {
                const blockLocation = block.location;
                const dimension = block.dimension;
                
                dimension.runCommand(`setblock ${blockLocation.x} ${blockLocation.y} ${blockLocation.z} grass_path`);
                player.playSound('use.grass');
                damageTool(player, item);
            } catch (e) { }
        });
        return;
    }
});

// Helper function to damage tools after use
function damageTool(player, item) {
    try {
        const eq = player.getComponent("minecraft:equippable");
        if (!eq) return;
        
        const mainhand = eq.getEquipment(EquipmentSlot.Mainhand);
        if (!mainhand || mainhand.typeId !== item.typeId) return;
        
        const durability = mainhand.getComponent("minecraft:durability");
        if (!durability) return;
        
        // Check for unbreaking enchantment
        const enchantable = mainhand.getComponent("minecraft:enchantable");
        const unbreakingLevel = enchantable?.getEnchantment('unbreaking')?.level ?? 0;
        
        // With unbreaking, there's a chance to not take damage
        if (unbreakingLevel > 0 && Math.random() < (unbreakingLevel / (unbreakingLevel + 1))) {
            return; // Tool survives without damage
        }
        
        let newDamage = durability.damage + 1;
        
        // Check if tool breaks
        if (newDamage >= durability.maxDurability) {
            eq.setEquipment(EquipmentSlot.Mainhand, undefined);
            player.playSound('random.break');
            return;
        }
        
        durability.damage = newDamage;
        updateItemLore(mainhand, newDamage, durability.maxDurability);
        eq.setEquipment(EquipmentSlot.Mainhand, mainhand);
    } catch (e) { }
}
