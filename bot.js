const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock').plugin;
const GoalXZ = goals.GoalXZ;

function createBotInstance() {
    console.log("Launching Fully Autonomous Exploration AI...");
    
    const bot = mineflayer.createBot({
        host: 'Potatos-andFries.Eagler.Host',
        username: 'MacroBot247',
        version: '1.12.2'
    });

    bot.loadPlugin(pathfinder);
    bot.loadPlugin(collectBlock);

    bot.on('spawn', () => {
        console.log("SUCCESS: Autonomous player initialized.");
        
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
        setTimeout(() => createBotInstance(), 5000);
    });
}

async function survivalCycleLoop(bot) {
    if (!bot) return;
    const mcData = require('minecraft-data')(bot.version);

    // Track current inventory
    const items = bot.inventory.items();
    const logs = items.filter(item => item.name.includes('log'));
    const planks = items.find(item => item.name.includes('planks'));
    const sticks = items.find(item => item.name === 'stick');
    const tableItem = items.find(item => item.name === 'crafting_table');
    const pickaxe = items.find(item => item.name.includes('pickaxe'));

    // Step 1: Chop wood if we don't have enough materials
    if (logs.length === 0 && (!planks || planks.count < 8) && !pickaxe) {
        console.log("Materials low. Gathering wood logs...");
        findAndChopTrees(bot);
        return;
    }

    // Step 2: Refine logs into planks
    if (logs.length > 0 && (!planks || planks.count < 8) && !pickaxe) {
        console.log("Refining raw logs into planks...");
        const plankRecipe = bot.recipesFor(mcData.itemsByName.oak_planks ? mcData.itemsByName.oak_planks.id : mcData.itemsByName.planks.id, null, 1, null)[0];
        if (plankRecipe) {
            try { await bot.craft(plankRecipe, 2, null); } catch (e) {}
        }
        setTimeout(() => survivalCycleLoop(bot), 1500);
        return;
    }

    // Step 3: Craft a Crafting Table if we don't have one
    if (planks && planks.count >= 4 && !tableItem && !pickaxe) {
        console.log("Crafting an official Crafting Table block...");
        const tableRecipe = bot.recipesFor(mcData.itemsByName.crafting_table.id, null, 1, null)[0];
        if (tableRecipe) {
            try { await bot.craft(tableRecipe, 1, null); } catch (e) {}
        }
        setTimeout(() => survivalCycleLoop(bot), 1500);
        return;
    }

    // Step 4: Craft Sticks
    if (planks && planks.count >= 2 && !sticks && !pickaxe) {
        console.log("Crafting sticks...");
        const stickRecipe = bot.recipesFor(mcData.itemsByName.stick.id, null, 1, null)[0];
        if (stickRecipe) {
            try { await bot.craft(stickRecipe, 1, null); } catch (e) {}
        }
        setTimeout(() => survivalCycleLoop(bot), 1500);
        return;
    }

    // Step 5: Place the Crafting Table on the ground and make tools
    if (tableItem && planks && sticks && !pickaxe) {
        console.log("Finding a safe spot to place our Crafting Table...");
        
        // Find a solid ground block right next to the bot
        const groundBlock = bot.findBlock({
            matching: (block) => block.name === 'grass_block' || block.name === 'dirt' || block.name === 'stone',
            maxDistance: 3
        });

        if (groundBlock) {
            try {
                // Hold the table item and place it on top of the ground block
                await bot.equip(mcData.itemsByName.crafting_table.id, 'hand');
                await bot.placeBlock(groundBlock, new (require('vec3'))(0, 1, 0));
                console.log("Crafting Table placed successfully!");

                setTimeout(async () => {
                    // Find the newly placed table in the world
                    const placedTable = bot.findBlock({ matching: mcData.blocksByName.crafting_table.id, maxDistance: 4 });
                    if (placedTable) {
                        const pickaxeRecipe = bot.recipesFor(mcData.itemsByName.wooden_pickaxe.id, placedTable, 1, null)[0];
                        if (pickaxeRecipe) {
                            await bot.craft(pickaxeRecipe, 1, placedTable);
                            console.log("SUCCESS: Pickaxe crafted autonomously!");
                            bot.chat("I successfully gathered resources and built a Wooden Pickaxe completely on my own!");
                            
                            // Break the table to pack it up and move on
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
                console.log(`Failed placement routine: ${err.message}`);
            }
        }
    }

    // Default fallback: keep exploring/gathering
    console.log("Maintaining status loop. Moving to gather...");
    findAndChopTrees(bot);
}

function findAndChopTrees(bot) {
    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    movements.canDig = false;
    bot.pathfinder.setMovements(movements);

    const targets = bot.findBlocks({
        matching: (block) => block.name.includes('log') || block.name.includes('wood'),
        maxDistance: 32,
        count: 1
    });

    if (targets.length > 0) {
        const targetBlock = bot.blockAt(targets);
        bot.collectBlock.collect(targetBlock, (err) => {
            setTimeout(() => survivalCycleLoop(bot), 2000);
        });
    } else {
        const currentPos = bot.entity.position;
        const randomX = currentPos.x + (Math.floor(Math.random() * 21) - 10);
        const randomZ = currentPos.z + (Math.floor(Math.random() * 21) - 10);
        bot.pathfinder.setGoal(new GoalXZ(randomX, randomZ));
        bot.once('goal_reached', () => {
            setTimeout(() => survivalCycleLoop(bot), 3000);
        });
    }
}

createBotInstance();

