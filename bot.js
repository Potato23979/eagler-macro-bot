const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock').plugin;
const GoalXZ = goals.GoalXZ;

function createBotInstance() {
    console.log("Initializing Crafting and Progression AI...");
    
    const bot = mineflayer.createBot({
        host: 'Potatos-andFries.Eagler.Host',
        username: 'MacroBot247',
        version: '1.12.2'
    });

    bot.loadPlugin(pathfinder);
    bot.loadPlugin(collectBlock);

    bot.on('spawn', () => {
        console.log("SUCCESS: Progression agent active.");
        
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

    // 1. Check inventory for raw materials
    const logs = bot.inventory.items().filter(item => item.name.includes('log'));
    const planks = bot.inventory.items().find(item => item.name.includes('planks'));
    const sticks = bot.inventory.items().find(item => item.name === 'stick');
    const pickaxe = bot.inventory.items().find(item => item.name.includes('pickaxe'));

    // 2. STAGE 1: Gather wood if we have absolutely nothing
    if (logs.length === 0 && !planks && !pickaxe) {
        console.log("No materials found. Scanning for raw wood...");
        findAndChopTrees(bot);
        return;
    }

    // 3. STAGE 2: If we have logs, craft them into planks (Done right inside inventory)
    if (logs.length > 0 && !planks && !pickaxe) {
        console.log(`Processing ${logs[0].name} into usable planks...`);
        const plankRecipe = bot.recipesFor(mcData.itemsByName.oak_planks ? mcData.itemsByName.oak_planks.id : mcData.itemsByName.planks.id, null, 1, null)[0];
        if (plankRecipe) {
            try {
                await bot.craft(plankRecipe, 1, null);
                console.log("Crafting successful: Planks acquired.");
            } catch (err) {
                console.log(`Failed to refine logs: ${err.message}`);
            }
        }
        setTimeout(() => survivalCycleLoop(bot), 2000);
        return;
    }

    // 4. STAGE 3: If we have planks, build sticks
    if (planks && planks.count >= 2 && !sticks && !pickaxe) {
        console.log("Assembling navigation crafting sticks...");
        const stickRecipe = bot.recipesFor(mcData.itemsByName.stick.id, null, 1, null)[0];
        if (stickRecipe) {
            try {
                await bot.craft(stickRecipe, 1, null);
                console.log("Sticks assembled.");
            } catch (err) {
                console.log(`Failed to craft sticks: ${err.message}`);
            }
        }
        setTimeout(() => survivalCycleLoop(bot), 2000);
        return;
    }

    // 5. STAGE 4: If we have planks and sticks, find a crafting table to build a tool!
    if (planks && planks.count >= 3 && sticks && !pickaxe) {
        console.log("Searching environment for a Crafting Table block...");
        const tableBlock = bot.findBlock({
            matching: mcData.blocksByName.crafting_table.id,
            maxDistance: 32
        });

        if (tableBlock) {
            console.log("Crafting table found! Walking over to utilize station...");
            const movements = new Movements(bot, mcData);
            bot.pathfinder.setMovements(movements);
            bot.pathfinder.setGoal(new GoalXZ(tableBlock.position.x, tableBlock.position.z));
            
            bot.once('goal_reached', async () => {
                const pickaxeRecipe = bot.recipesFor(mcData.itemsByName.wooden_pickaxe.id, tableBlock, 1, null)[0];
                if (pickaxeRecipe) {
                    try {
                        await bot.craft(pickaxeRecipe, 1, tableBlock);
                        console.log("SUCCESS: Wooden Pickaxe has been officially crafted!");
                        bot.chat("Look at my shiny new Wooden Pickaxe!");
                    } catch (err) {
                        console.log(`Crafting station failure: ${err.message}`);
                    }
                }
                setTimeout(() => survivalCycleLoop(bot), 2000);
            });
        } else {
            console.log("No crafting table nearby. We need to gather more wood to craft our own table block next!");
            findAndChopTrees(bot);
        }
        return;
    }

    // If we already have the pickaxe, maintain survival mode by continuing to gather
    console.log("Tool criteria met. Gathering resources to build inventory stash...");
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
        const targetBlock = bot.blockAt(targets[0]);
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

