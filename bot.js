const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const GoalLookAtBlock = goals.GoalLookAtBlock;

function createBotInstance() {
    console.log("Launching Smooth Stutter-Free Survival AI...");
    
    const bot = mineflayer.createBot({
        host: 'Potatos-andFries.Eagler.Host',
        username: 'MacroBot247',
        version: '1.12.2'
    });

    bot.loadPlugin(pathfinder);

    bot.on('spawn', () => {
        console.log("SUCCESS: Bot successfully logged into the server.");
        bot.physics.enabled = true;
        
        setTimeout(() => {
            bot.chat('/register PotatoBotPassword77! PotatoBotPassword77!');
            setTimeout(() => {
                bot.chat('/login PotatoBotPassword77!');
                setTimeout(() => {
                    findAndChopTrees(bot);
                }, 3000);
            }, 3000);
        }, 3000);
    });

    bot.on('end', () => {
        console.log("Bot disconnected. Reconnecting in 5 seconds...");
        setTimeout(() => createBotInstance(), 5000);
    });
}

function findAndChopTrees(bot) {
    if (!bot || !bot.pathfinder) return;
    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    
    // Smooth navigation settings to force uninterrupted pathing loops
    movements.canDig = false;
    movements.allowSprinting = true; 
    bot.pathfinder.setMovements(movements);

    // Scan for the single closest log block within 20 blocks
    const target = bot.findBlock({
        matching: (block) => {
            const name = block.name.toLowerCase();
            return name === 'log' || name === 'log2' || name.includes('wood') || name.includes('log');
        },
        maxDistance: 20
    });

    if (target) {
        console.log(`Smooth path locked onto log at: ${target.position}`);
        
        // Command native pathfinder to navigate straight to the block seamlessly without stuttering
        bot.pathfinder.setGoal(new GoalLookAtBlock(target.position, bot.world));

        // When the bot reaches the block, mine it using native arm swings
        bot.once('goal_reached', async () => {
            console.log("Arrived at tree. Mining block...");
            try {
                // Face the block and dig it continuously until it drops
                await bot.lookAt(target.position.offset(0.5, 0.5, 0.5));
                await bot.dig(target);
                console.log("Block chopped cleanly!");
            } catch (err) {
                console.log(`Mining interrupted: ${err.message}`);
            }
            // Loop straight into the next tree with zero delays
            setTimeout(() => findAndChopTrees(bot), 400);
        });
    } else {
        // Free-roaming explore path if no wood is visible
        console.log("No wood in area. Exploring smoothly...");
        const currentPos = bot.entity.position;
        const randomX = currentPos.x + (Math.floor(Math.random() * 17) - 8);
        const randomZ = currentPos.z + (Math.floor(Math.random() * 17) - 8);
        
        bot.pathfinder.setGoal(new goals.GoalXZ(randomX, randomZ));
        bot.once('goal_reached', () => {
            setTimeout(() => findAndChopTrees(bot), 1000);
        });
    }
}

createBotInstance();
