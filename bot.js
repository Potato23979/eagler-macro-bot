const mineflayer = require('mineflayer');
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock').plugin;

function createBotInstance() {
    console.log("Initializing Survival Gathering AI...");
    
    const bot = mineflayer.createBot({
        host: 'Potatos-andFries.Eagler.Host',
        username: 'MacroBot247',
        version: '1.12.2'
    });

    // Load AI logic systems into memory
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(collectBlock);

    bot.on('spawn', () => {
        console.log("SUCCESS: Survival agent active.");
        
        setTimeout(() => {
            bot.chat('/register PotatoBotPassword77! PotatoBotPassword77!');
            setTimeout(() => {
                bot.chat('/login PotatoBotPassword77!');
                setTimeout(() => {
                    console.log("Scanning ecosystem for resources...");
                    findAndChopTrees(bot);
                }, 3000);
            }, 3000);
        }, 3000);
    });

    bot.on('end', () => {
        setTimeout(() => createBotInstance(), 5000);
    });
}

function findAndChopTrees(bot) {
    if (!bot || !bot.collectBlock) return;

    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    
    // Safety paths config - will not leap off walls or high terrain cliffs
    movements.canDig = false;
    bot.pathfinder.setMovements(movements);

    // Look around for standard Wood Logs (log, log2 blocks matching IDs)
    const targets = bot.findBlocks({
        matching: (block) => block.name.includes('log') || block.name.includes('wood'),
        maxDistance: 32,
        count: 1
    });

    if (targets.length > 0) {
        const targetBlock = bot.blockAt(targets[0]);
        console.log(`Target locked onto tree block at coordinates: ${targetBlock.position}`);
        
        // Tells the AI engine to navigate to the tree, mine it with its hand/tool, and collect the wood item
        bot.collectBlock.collect(targetBlock, (err) => {
            if (err) {
                console.log(`Path blocked or target error: ${err.message}. Retrying scan...`);
            } else {
                console.log("Wood gathered successfully!");
            }
            setTimeout(() => findAndChopTrees(bot), 2000);
        });
    } else {
        console.log("No visible trees nearby. Shifting coordinates to scan a new sector...");
        // If no wood is nearby, walk slightly in a random direction to seek new forests
        const currentPos = bot.entity.position;
        const randomX = currentPos.x + (Math.floor(Math.random() * 21) - 10);
        const randomZ = currentPos.z + (Math.floor(Math.random() * 21) - 10);
        
        bot.pathfinder.setGoal(new (require('mineflayer-pathfinder').goals.GoalXZ)(randomX, randomZ));
        bot.once('goal_reached', () => {
            setTimeout(() => findAndChopTrees(bot), 3000);
        });
    }
}

createBotInstance();

setInterval(() => {
    console.log("Keep-alive loop operational.");
}, 10000);
