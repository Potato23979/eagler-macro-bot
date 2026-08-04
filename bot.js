const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const GoalLookAtBlock = goals.GoalLookAtBlock;
const GoalXZ = goals.GoalXZ;

let travelGoalX = null;
let travelGoalZ = null;
let activeLoopTimeout = null;
let combatTarget = null;

function createBotInstance() {
    console.log("Launching Comprehensive Survival and Defense AI Agent...");
    
    const bot = mineflayer.createBot({
        host: 'Potatos-andFries.Eagler.Host',
        username: 'MacroBot247',
        version: '1.12.2'
    });

    bot.loadPlugin(pathfinder);

    bot.on('spawn', () => {
        console.log("SUCCESS: Autonomous survival agent active.");
        bot.physics.enabled = true;
        
        bot.clearControlStates();
        travelGoalX = null; 
        travelGoalZ = null;
        combatTarget = null;

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

    bot.on('health', () => {
        if (combatTarget) return; 
        
        const attacker = bot.nearestEntity((entity) => {
            return (entity.type === 'mob' || entity.type === 'player') && entity.username !== bot.username;
        });

        if (attacker && bot.entity.position.distanceTo(attacker.position) < 5) {
            console.log("ALERT: Under attack! Engaging self-defense sequence...");
            combatTarget = attacker;
            executeDefensiveCombat(bot);
        }
    });

    bot.on('end', () => {
        console.log("Bot disconnected. Waiting 30 seconds to bypass bans...");
        if (activeLoopTimeout) clearTimeout(activeLoopTimeout);
        travelGoalX = null;
        travelGoalZ = null;
        combatTarget = null;
        setTimeout(() => createBotInstance(), 30000);
    });
}

function executeDefensiveCombat(bot) {
    if (!bot || !combatTarget) return;
    
    const distance = bot.entity.position.distanceTo(combatTarget.position);
    
    if (combatTarget.health <= 0 || distance > 16) {
        console.log("Threat neutralized. Returning to normal cycles.");
        combatTarget = null;
        bot.pathfinder.setGoal(null);
        mainAILoop(bot);
        return;
    }
    
    bot.lookAt(combatTarget.position.offset(0, 1.6, 0));
    
    if (bot.health  executeDefensiveCombat(bot), 300);
}

async function mainAILoop(bot) {
    if (!bot || !bot.pathfinder || combatTarget) return; 
    
    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    movements.canDig = true;
    movements.allowSprinting = true;
    bot.pathfinder.setMovements(movements);

    if (activeLoopTimeout) clearTimeout(activeLoopTimeout);

    const items = bot.inventory.items();
    const logs = items.filter(item => item.name === 'log' || item.name === 'log2' || item.name.includes('log'));
    const planks = items.find(item => item.name.includes('planks'));
    const sticks = items.find(item => item.name === 'stick');
    const tableItem = items.find(item => item.name === 'crafting_table');
    const pickaxe = items.find(item => item.name.includes('pickaxe'));

    if (logs.length > 0 && (!planks || planks.count < 8) && !pickaxe) {
        console.log("Refining raw wood logs into planks...");
        const targetPlankId = mcData.itemsByName.oak_planks ? mcData.itemsByName.oak_planks.id : mcData.itemsByName.planks.id;
        const plankRecipe = bot.recipesFor(targetPlankId, null, 1, null);
        if (plankRecipe) { try { await bot.craft(plankRecipe, 2, null); } catch (e) {} }
        activeLoopTimeout = setTimeout(() => mainAILoop(bot), 1500);
        return;
    }

    if (planks && planks.count >= 4 && !tableItem && !pickaxe) {
        console.log("Assembling Crafting Table unit...");
        const tableRecipe = bot.recipesFor(mcData.itemsByName.crafting_table.id, null, 1, null);
        if (tableRecipe) { try { await bot.craft(tableRecipe, 1, null); } catch (e) {} }
        activeLoopTimeout = setTimeout(() => mainAILoop(bot), 1500);
        return;
    }

    if (planks && planks.count >= 2 && !sticks && !pickaxe) {
        console.log("Shaping wooden handles...");
        const stickRecipe = bot.recipesFor(mcData.itemsByName.stick.id, null, 1, null);
        if (stickRecipe) { try { await bot.craft(stickRecipe, 1, null); } catch (e) {} }
        activeLoopTimeout = setTimeout(() => mainAILoop(bot), 1500);
        return;
    }

    if (tableItem && planks && sticks && !pickaxe) {
        const groundBlock = bot.findBlock({
            matching: (block) => block.name === 'grass' || block.name === 'grass_block' || block.name === 'dirt' || block.name === 'stone',
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
                            bot.chat("Look! I crafted a Wooden Pickaxe completely autonomously!");
                            
                            setTimeout(() => {
                                bot.dig(placedTable).then(() => mainAILoop(bot)).catch(() => mainAILoop(bot));
                            }, 2000);
                            return;
                        }
                    }
                    mainAILoop(bot);
                }, 2000);
                return;
            } catch (err) {
                console.log(`Crafting placement error: ${err.message}`);
            }
        }
    }

    if (logs.length === 0 && (!planks || planks.count < 8) && !pickaxe) {
        const treeBlock = bot.findBlock({
            matching: (block) => {
                const name = block.name.toLowerCase();
                return name === 'log' || name === 'log2' || name.includes('wood') || name.includes('log');
            },
            maxDistance: 25
        });

        if (treeBlock) {
            console.log(`Wood log spotted at: ${treeBlock.position}`);
            travelGoalX = null; 
            travelGoalZ = null;

            bot.pathfinder.setGoal(new GoalLookAtBlock(treeBlock.position, bot.world));

            bot.once('goal_reached', async () => {
                try {
                    bot.pathfinder.setGoal(null);
                    bot.clearControlStates();
                    
                    await bot.lookAt(treeBlock.position.offset(0.5, 0.5, 0.5));
                    await bot.dig(treeBlock);
                    
                    await new Promise(resolve => setTimeout(resolve, 800));
                    const droppedItem = bot.nearestEntity((entity) => {
                        return entity.type === 'object' && bot.entity.position.distanceTo(entity.position) < 4;
                    });

                    if (droppedItem) {
                        bot.pathfinder.setGoal(new GoalXZ(droppedItem.position.x, droppedItem.position.z));
                        await new Promise(resolve => bot.once('goal_reached', resolve));
                    }
                } catch (err) {
                    console.log(`Mining skipped: ${err.message}`);
                }
                activeLoopTimeout = setTimeout(() => mainAILoop(bot), 1000);
            });
            return;
        }
    }

    if (travelGoalX === null || travelGoalZ === null) {
        const currentPos = bot.entity.position;
        const angle = Math.random() * Math.PI * 2;
        const distance = 80 + Math.floor(Math.random() * 70);
        
        travelGoalX = currentPos.x + Math.cos(angle) * distance;
        travelGoalZ = currentPos.z + Math.sin(angle) * distance;
        
        console.log(`Expedition active. Heading out toward coordinates: X:${Math.floor(travelGoalX)}, Z:${Math.floor(travelGoalZ)}`);
    }

    bot.pathfinder.setGoal(new GoalXZ(travelGoalX, travelGoalZ));

    activeLoopTimeout = setTimeout(() => {
        const currentPos = bot.entity.position;
        const distanceRemaining = Math.sqrt(Math.pow(currentPos.x - travelGoalX, 2) + Math.pow(currentPos.z - travelGoalZ, 2));
        
        if (distanceRemaining < 4) {
            travelGoalX = null;
            travelGoalZ = null;
        }

        mainAILoop(bot);
    }, 2000); 
}

createBotInstance();
