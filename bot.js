const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const GoalLookAtBlock = goals.GoalLookAtBlock;
const GoalXZ = goals.GoalXZ;

let travelGoalX = null;
let travelGoalZ = null;
let activeLoopTimeout = null;

function createBotInstance() {
    console.log("Launching Pure Progression Crafting AI...");
    
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
    movements.canDig = true;
    movements.allowSprinting = true;
    bot.pathfinder.setMovements(movements);

    if (activeLoopTimeout) clearTimeout(activeLoopTimeout);

    // Scan inventory holdings
    const items = bot.inventory.items();
    const logs = items.filter(item => item.name === 'log' || item.name === 'log2' || item.name.includes('log'));
    const planks = items.find(item => item.name.includes('planks'));
    const sticks = items.find(item => item.name === 'stick');
    const tableItem = items.find(item => item.name === 'crafting_table');
    const pickaxe = items.find(item => item.name.includes('pickaxe'));

    // STAGE 1: Refine Logs into Planks
    if (logs.length > 0 && (!planks || planks.count < 8) && !pickaxe) {
        console.log("Refining raw wood logs into planks...");
        const targetPlankId = mcData.itemsByName.oak_planks ? mcData.itemsByName.oak_planks.id : mcData.itemsByName.planks.id;
        const plankRecipe = bot.recipesFor(targetPlankId, null, 1, null);
        if (plankRecipe) { try { await bot.craft(plankRecipe, 2, null); } catch (e) {} }
        activeLoopTimeout = setTimeout(() => mainAILoop(bot), 1500);
        return;
    }

    // STAGE 2: Craft a Crafting Table block inside inventory
    if (planks && planks.count >= 4 && !tableItem && !pickaxe) {
        console.log("Crafting an official Crafting Table block...");
        const tableRecipe = bot.recipesFor(mcData.itemsByName.crafting_table.id, null, 1, null);
        if (tableRecipe) { try { await bot.craft(tableRecipe, 1, null); } catch (e) {} }
        activeLoopTimeout = setTimeout(() => mainAILoop(bot), 1500);
        return;
    }

    // STAGE 3: Craft Handles (Sticks)
    if (planks && planks.count >= 2 && !sticks && !pickaxe) {
        console.log("Crafting sticks...");
        const stickRecipe = bot.recipesFor(mcData.itemsByName.stick.id, null, 1, null);
        if (stickRecipe) { try { await bot.craft(stickRecipe, 1, null); } catch (e) {} }
        activeLoopTimeout = setTimeout(() => mainAILoop(bot), 1500);
        return;
    }

    // STAGE 4: Place Crafting Table on ground and assemble a Wooden Pickaxe tool
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
                            bot.chat("Successfully gathered wood and crafted a Wooden Pickaxe completely autonomously!");
                            
                            // Mine the table back up to move on
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
                console.log(`Crafting placement failure: ${err.message}`);
            }
        }
    }

    // STAGE 5: Scan and Mine Wood Logs (Only if inventory criteria aren't ready)
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
                    console.log("Harvest complete.");
                } catch (err) {
                    console.log(`Mining skipped: ${err.message}`);
                }
                activeLoopTimeout = setTimeout(() => mainAILoop(bot), 1000);
            });
            return;
        }
    }

    // STAGE 6: Continuous Long-Distance Travel Expedition
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
