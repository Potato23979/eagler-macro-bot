const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock').plugin;
const GoalXZ = goals.GoalXZ;

function createBotInstance() {
    console.log("Launching Optimized Lightweight Survival AI...");
    
    const bot = mineflayer.createBot({
        host: 'Potatos-andFries.Eagler.Host',
        username: 'MacroBot247',
        version: '1.12.2'
    });

    bot.loadPlugin(pathfinder);
    bot.loadPlugin(collectBlock);

    bot.on('spawn', () => {
        console.log("SUCCESS: Bot successfully logged into the server.");
        bot.physics.enabled = true;
        
        setTimeout(() => {
            bot.chat('/register PotatoBotPassword77! PotatoBotPassword77!');
            setTimeout(() => {
                bot.chat('/login PotatoBotPassword77!');
                setTimeout(() => {
                    survivalCycleLoop(bot);
                }, 3000);
            }, 3000);
        }, 3000);
    });

    bot.on('end', () => {
        console.log("Bot disconnected. Reconnecting in 5 seconds...");
        setTimeout(() => createBotInstance(), 5000);
    });
}

async function survivalCycleLoop(bot) {
    if (!bot) return;
    const mcData = require('minecraft-data')(bot.version);

    const items = bot.inventory.items();
    const logs = items.filter(item => item.name === 'log' || item.name === 'log2' || item.name.includes('log'));
    const planks = items.find(item => item.name.includes('planks'));
    const sticks = items.find(item => item.name === 'stick');
    const tableItem = items.find(item => item.name === 'crafting_table');
    const pickaxe = items.find(item => item.name.includes('pickaxe'));

    if (logs.length === 0 && (!planks || planks.count < 8) && !pickaxe) {
        findAndChopTrees(bot);
        return;
    }

    if (logs.length > 0 && (!planks || planks.count < 8) && !pickaxe) {
        const targetPlankId = mcData.itemsByName.oak_planks ? mcData.itemsByName.oak_planks.id : mcData.itemsByName.planks.id;
        const plankRecipe = bot.recipesFor(targetPlankId, null, 1, null);
        if (plankRecipe) { try { await bot.craft(plankRecipe, 2, null); } catch (e) {} }
        setTimeout(() => survivalCycleLoop(bot), 1500);
        return;
    }

    if (planks && planks.count >= 4 && !tableItem && !pickaxe) {
        const tableRecipe = bot.recipesFor(mcData.itemsByName.crafting_table.id, null, 1, null);
        if (tableRecipe) { try { await bot.craft(tableRecipe, 1, null); } catch (e) {} }
        setTimeout(() => survivalCycleLoop(bot), 1500);
        return;
    }

    if (planks && planks.count >= 2 && !sticks && !pickaxe) {
        const stickRecipe = bot.recipesFor(mcData.itemsByName.stick.id, null, 1, null);
        if (stickRecipe) { try { await bot.craft(stickRecipe, 1, null); } catch (e) {} }
        setTimeout(() => survivalCycleLoop(bot), 1500);
        return;
    }

    if (tableItem && planks && sticks && !pickaxe) {
        const groundBlock = bot.findBlock({
            matching: (block) => block.name === 'grass' || block.name === 'grass_block' || block.name === 'dirt' || block.name === 'stone',
            maxDistance: 4
        });

        if (groundBlock) {
            try {
                await bot.equip(mcData.itemsByName.crafting_table.id, 'hand');
                await bot.placeBlock(groundBlock, new (require('vec3'))(0, 1, 0));
                
                setTimeout(async () => {
                    const placedTable = bot.findBlock({ matching: mcData.blocksByName.crafting_table.id, maxDistance: 4 });
                    if (placedTable) {
                        const pickaxeRecipe = bot.recipesFor(mcData.itemsByName.wooden_pickaxe.id, placedTable, 1, null);
                        if (pickaxeRecipe) {
                            await bot.craft(pickaxeRecipe, 1, placedTable);
                            setTimeout(() => {
                                bot.collectBlock.collect(placedTable, () => survivalCycleLoop(bot));
                            }, 2000);
                            return;
                        }
                    }
                    survivalCycleLoop(bot);
                }, 2000);
                return;
            } catch (err) {
                console.log(`Placement error: ${err.message}`);
            }
        }
    }

    findAndChopTrees(bot);
}

function findAndChopTrees(bot) {
    if (!bot || !bot.collectBlock) return;
    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    
    // Smooth navigation rules to stop pathfinding crashes
    movements.canDig = false;
    movements.allowSprinting = false; 
    bot.pathfinder.setMovements(movements);

    // FIXED: Shrunk distance to 15 blocks so the bot only calculates one easy path at a time
    const target = bot.findBlock({
        matching: (block) => {
            const name = block.name.toLowerCase();
            return name === 'log' || name === 'log2' || name.includes('wood') || name.includes('log');
        },
        maxDistance: 15
    });

    if (target) {
        console.log(`Target locked onto nearby log at: ${target.position}`);
        bot.collectBlock.collect(target, (err) => {
            if (err) console.log(`Collection error: ${err.message}`);
            setTimeout(() => survivalCycleLoop(bot), 1500);
        });
    } else {
        console.log("No trees in immediate 15-block area. Walking randomly to find wood...");
        const currentPos = bot.entity.position;
        const randomX = currentPos.x + (Math.floor(Math.random() * 15) - 7);
        const randomZ = currentPos.z + (Math.floor(Math.random() * 15) - 7);
        
        bot.pathfinder.setGoal(new GoalXZ(randomX, randomZ));
        bot.once('goal_reached', () => {
            setTimeout(() => survivalCycleLoop(bot), 1500);
        });
    }
}

createBotInstance();

