const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const GoalLookAtBlock = goals.GoalLookAtBlock;
const GoalXZ = goals.GoalXZ;

let travelGoalX = null;
let travelGoalZ = null;
let activeLoopTimeout = null;
let dangerDetected = false;

function createBotInstance() {
    console.log("Launching Stealth Miner and Progression AI...");
    
    const bot = mineflayer.createBot({
        host: 'Potatos-andFries.Eagler.Host',
        username: 'MacroBot247',
        version: '1.12.2'
    });

    bot.loadPlugin(pathfinder);

    bot.on('spawn', () => {
        console.log("SUCCESS: Stealth progression agent initialized.");
        bot.physics.enabled = true;
        
        bot.clearControlStates();
        travelGoalX = null; 
        travelGoalZ = null;
        dangerDetected = false;

        setTimeout(() => {
            bot.chat('/register PotatoBotPassword77! PotatoBotPassword77!');
            setTimeout(() => {
                bot.chat('/login PotatoBotPassword77!');
                setTimeout(() => {
                    mainAILoop(bot);
                }, 3000);
            }, 3000);
        }, 3000);
    });

    bot.on('end', () => {
        console.log("Bot disconnected. Waiting 30 seconds to bypass bans...");
        if (activeLoopTimeout) clearTimeout(activeLoopTimeout);
        travelGoalX = null;
        travelGoalZ = null;
        setTimeout(() => createBotInstance(), 30000);
    });
}

async function mainAILoop(bot) {
    if (!bot || !bot.pathfinder) return;
    
    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    
    // STRICT NAVIGATION SAFETY CRITERIA
    movements.canDig = true;           // Allow mining blocks ahead
    movements.dontMineOnFallingBlock = true; // NEVER dig gravel/sand that can suffocate him
    movements.allowSprinting = true;
    bot.pathfinder.setMovements(movements);

    if (activeLoopTimeout) clearTimeout(activeLoopTimeout);

    // 1. RADAR SECTOR: Scan 16 blocks for hostile entities, players, or arrows
    const nearbyThreat = bot.nearestEntity((entity) => {
        return (entity.type === 'mob' || entity.type === 'player') && entity.username !== bot.username;
    });

    if (nearbyThreat && bot.entity.position.distanceTo(nearbyThreat.position)  mainAILoop(bot), 1000);
        return;
    }

    // Clear danger profile if path is empty
    if (dangerDetected) {
        console.log("Area secure. Disengaging stealth locks.");
        bot.setControlState('sneak', false);
        dangerDetected = false;
    }

    // Track Inventory items
    const items = bot.inventory.items();
    const logs = items.filter(item => item.name === 'log' || item.name === 'log2' || item.name.includes('log'));
    const planks = items.find(item => item.name.includes('planks'));
    const sticks = items.find(item => item.name === 'stick');
    const tableItem = items.find(item => item.name === 'crafting_table');
    const pickaxe = items.find(item => item.name.includes('pickaxe'));
    const cobblestone = items.filter(item => item.name === 'cobblestone');

    // [WOOD CRAFTING SEQUENCE] - Runs automatically if pickaxe is missing
    if (!pickaxe) {
        if (logs.length > 0 && (!planks || planks.count < 8)) {
            const targetPlankId = mcData.itemsByName.oak_planks ? mcData.itemsByName.oak_planks.id : mcData.itemsByName.planks.id;
            const plankRecipe = bot.recipesFor(targetPlankId, null, 1, null);
            if (plankRecipe) { try { await bot.craft(plankRecipe, 2, null); } catch (e) {} }
            activeLoopTimeout = setTimeout(() => mainAILoop(bot), 1500);
            return;
        }

        if (planks && planks.count >= 4 && !tableItem) {
            const tableRecipe = bot.recipesFor(mcData.itemsByName.crafting_table.id, null, 1, null);
            if (tableRecipe) { try { await bot.craft(tableRecipe, 1, null); } catch (e) {} }
            activeLoopTimeout = setTimeout(() => mainAILoop(bot), 1500);
            return;
        }

        if (planks && planks.count >= 2 && !sticks) {
            const stickRecipe = bot.recipesFor(mcData.itemsByName.stick.id, null, 1, null);
            if (stickRecipe) { try { await bot.craft(stickRecipe, 1, null); } catch (e) {} }
            activeLoopTimeout = setTimeout(() => mainAILoop(bot), 1500);
            return;
        }

        if (tableItem && planks && sticks) {
            const groundBlock = bot.findBlock({
                matching: (block) => block.name === 'grass_block' || block.name === 'dirt' || block.name === 'stone',
                maxDistance: 4
            });

            if (groundBlock) {
                try {
                    bot.pathfinder.setGoal(null);
                    bot.clearControlStates();
                    await bot.equip(mcData.itemsByName.crafting_table.id, 'hand');
                    await bot.placeBlock(groundBlock, new (require('vec3'))(0, 1, 0));
                    
                    setTimeout(async () => {
                        const placedTable = bot.findBlock({ matching: mcData.blocksByName.crafting_table.id, maxDistance: 4 });
                        if (placedTable) {
                            const pickaxeRecipe = bot.recipesFor(mcData.itemsByName.wooden_pickaxe.id, placedTable, 1, null);
                            if (pickaxeRecipe) {
                                await bot.craft(pickaxeRecipe, 1, placedTable);
                                bot.chat("Armed and ready for mining operations!");
                                setTimeout(() => {
                                    bot.dig(placedTable).then(() => mainAILoop(bot)).catch(() => mainAILoop(bot));
                                }, 2000);
                                return;
                            }
                        }
                        mainAILoop(bot);
                    }, 2000);
                    return;
                } catch (err) { console.log(`Crafting slip: ${err.message}`); }
            }
        }

        // Chop timber if completely empty of crafting items
        if (logs.length === 0 && !planks) {
            findAndChopTrees(bot);
            return;
        }
    }

    // 2. UNDERGROUND MINING BRANCH: Triggers only when the Wooden Pickaxe is successfully equipped
    if (pickaxe) {
        // Equip pickaxe instantly into main hand tool slot
        if (bot.heldItem?.name !== pickaxe.name) {
            await bot.equip(pickaxe.id, 'hand');
        }

        // Look for stone, iron ore, or coal blocks within 15 blocks of its depth
        const stoneTarget = bot.findBlock({
            matching: [mcData.blocksByName.stone.id, mcData.blocksByName.coal_ore?.id, mcData.blocksByName.iron_ore?.id].filter(Boolean),
            maxDistance: 15
        });

        if (stoneTarget) {
            console.log(`Stone sector found at: ${stoneTarget.position}. Deploying safe pathway mining...`);
            travelGoalX = null;
            travelGoalZ = null;

            // Step smoothly right up to the block coordinate
            bot.pathfinder.setGoal(new GoalLookAtBlock(stoneTarget.position, bot.world));

            bot.once('goal_reached', async () => {
                try {
                    bot.pathfinder.setGoal(null);
                    bot.clearControlStates();
                    
                    // CRITICAL VERTICAL CHECKS: Never mine the block directly below its feet to prevent drop damage
                    if (stoneTarget.position.y  mainAILoop(bot), 500);
                        return;
                    }

                    await bot.lookAt(stoneTarget.position.offset(0.5, 0.5, 0.5));
                    await bot.dig(stoneTarget);
                    console.log("Stone block gathered successfully.");
                } catch (err) {
                    console.log(`Mining skipped: ${err.message}`);
                }
                activeLoopTimeout = setTimeout(() => mainAILoop(bot), 800);
            });
            return;
        } else {
            // SAFE CAVING EXPEDITION: If no stone is directly around him, dive deeper underground smoothly
            if (travelGoalX === null || travelGoalZ === null) {
                const currentPos = bot.entity.position;
                const angle = Math.random() * Math.PI * 2;
                
                // Seek coordinates slightly lower than current altitude to head underground naturally
                travelGoalX = currentPos.x + Math.cos(angle) * 12;
                travelGoalZ = currentPos.z + Math.sin(angle) * 12;
                console.log("Descending into low-altitude valley sectors to mine stone...");
            }
            
            bot.pathfinder.setGoal(new GoalXZ(travelGoalX, travelGoalZ));
            activeLoopTimeout = setTimeout(() => {
                const currentPos = bot.entity.position;

                if (Math.sqrt(Math.pow(currentPos.x - travelGoalX, 2) + Math.pow(currentPos.z - travelGoalZ, 2)) < 3) {travelGoalX = null;travelGoalZ = null;}mainAILoop(bot);}, 2000);return;}}// Default long distance travel exploration if stuckexecuteExpedition(bot);}function findAndChopTrees(bot) {if (!bot || !bot.pathfinder) return;const mcData = require('minecraft-data')(bot.version);const treeBlock = bot.findBlock({matching: (block) => block.name.toLowerCase().includes('log') || block.name.toLowerCase().includes('wood'),maxDistance: 25});if (treeBlock) {bot.pathfinder.setGoal(new GoalLookAtBlock(treeBlock.position, bot.world));bot.once('goal_reached', async () => {try {bot.pathfinder.setGoal(null);bot.clearControlStates();await bot.lookAt(treeBlock.position.offset(0.5, 0.5, 0.5));await bot.dig(treeBlock);} catch (e) {}setTimeout(() => mainAILoop(bot), 1000);});} else {executeExpedition(bot);}}function executeExpedition(bot) {if (travelGoalX === null || travelGoalZ === null) {const currentPos = bot.entity.position;const angle = Math.random() * Math.PI * 2;travelGoalX = currentPos.x + Math.cos(angle) * 60;travelGoalZ = currentPos.z + Math.sin(angle) * 60;}bot.pathfinder.setGoal(new GoalXZ(travelGoalX, travelGoalZ));activeLoopTimeout = setTimeout(() => {const currentPos = bot.entity.position;if (Math.sqrt(Math.pow(currentPos.x - travelGoalX, 2) + Math.pow(currentPos.z - travelGoalZ, 2)) < 4) {travelGoalX = null;travelGoalZ = null;}mainAILoop(bot);}, 2000);}createBotInstance();
