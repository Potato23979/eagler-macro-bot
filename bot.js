const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const GoalLookAtBlock = goals.GoalLookAtBlock;
const GoalXZ = goals.GoalXZ;

let travelGoalX = null;
let travelGoalZ = null;
let activeLoopTimeout = null;

function createBotInstance() {
    console.log("Launching Native Websocket Eaglercraft Agent...");
    
    const bot = mineflayer.createBot({
        // Changes the host to pass raw browser packets directly down the line
        connect: (client) => {
            const WebSocket = require('ws');
            return new WebSocket('ws://Potatos-andFries.Eagler.Host');
        },
        username: 'Fredbot', 
        version: '1.12.2'
    });

    bot.loadPlugin(pathfinder);

    bot.once('login', () => {
        console.log("SUCCESS: Web tunnel approved! Profile connected safely.");
        
        setTimeout(() => {
            bot.chat('/register PotatoBotPassword77! PotatoBotPassword77!');
            setTimeout(() => {
                bot.chat('/login PotatoBotPassword77!');
                setTimeout(() => {
                    bot.physics.enabled = true;
                    mainAILoop(bot);
                }, 3000);
            }, 3000);
        }, 4000); 
    });

    bot.on('health', () => {
        if (20 > bot.health) {
            travelGoalX = null;
            travelGoalZ = null;
            const escapeX = bot.entity.position.x + (Math.floor(Math.random() * 31) - 15);
            const escapeZ = bot.entity.position.z + (Math.floor(Math.random() * 31) - 15);
            bot.pathfinder.setGoal(new GoalXZ(escapeX, escapeZ));
        }
    });

    bot.on('end', () => {
        console.log("Disconnected. Reconnecting in 30 seconds...");
        if (activeLoopTimeout) clearTimeout(activeLoopTimeout);
        travelGoalX = null;
        travelGoalZ = null;
        setTimeout(() => createBotInstance(), 30000);
    });

    bot.on('error', (err) => console.log(`Handshake dropped: ${err.message}`));
}

async function mainAILoop(bot) {
    if (!bot || !bot.pathfinder) return;
    
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
        const targetPlankId = mcData.itemsByName.oak_planks ? mcData.itemsByName.oak_planks.id : mcData.itemsByName.planks.id;
        const plankRecipe = bot.recipesFor(targetPlankId, null, 1, null);
        if (plankRecipe) { try { await bot.craft(plankRecipe, 2, null); } catch (e) {} }
        activeLoopTimeout = setTimeout(() => mainAILoop(bot), 1500);
        return;
    }

    if (planks && planks.count >= 4 && !tableItem && !pickaxe) {
        const tableRecipe = bot.recipesFor(mcData.itemsByName.crafting_table.id, null, 1, null);
        if (tableRecipe) { try { await bot.craft(tableRecipe, 1, null); } catch (e) {} }
        activeLoopTimeout = setTimeout(() => mainAILoop(bot), 1500);
        return;
    }

    if (planks && planks.count >= 2 && !sticks && !pickaxe) {
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
                            setTimeout(() => {
                                bot.dig(placedTable).then(() => mainAILoop(bot)).catch(() => mainAILoop(bot));
                            }, 2000);
                            return;
                        }
                    }
                    mainAILoop(bot);
                }, 2000);
                return;
            } catch (err) { console.log(`Table error: ${err.message}`); }
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
            travelGoalX = null; 
            travelGoalZ = null;
            bot.pathfinder.setGoal(new GoalLookAtBlock(treeBlock.position, bot.world));
            bot.once('goal_reached', async () => {
                try {
                    bot.pathfinder.setGoal(null);
                    bot.clearControlStates();
                    await bot.lookAt(treeBlock.position.offset(0.5, 0.5, 0.5));
                    await bot.dig(treeBlock);
                } catch (err) {}
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
    }

    bot.pathfinder.setGoal(new GoalXZ(travelGoalX, travelGoalZ));

    activeLoopTimeout = setTimeout(() => {
        const currentPos = bot.entity.position;
        if (Math.sqrt(Math.pow(currentPos.x - travelGoalX, 2) + Math.pow(currentPos.z - travelGoalZ, 2)) < 4) {
            travelGoalX = null;
            travelGoalZ = null;
        }
        mainAILoop(bot);
    }, 2000); 
}

createBotInstance();
