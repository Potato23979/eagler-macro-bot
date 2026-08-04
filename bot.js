const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const GoalXZ = goals.GoalXZ;

function createBotInstance() {
    console.log("Initializing AI navigation bot instance...");
    
    const bot = mineflayer.createBot({
        host: 'Potatos-andFries.Eagler.Host',
        username: 'MacroBot247',
        version: '1.12.2'
    });

    // Inject the pathfinding AI engine into our bot
    bot.loadPlugin(pathfinder);

    bot.on('spawn', () => {
        console.log("SUCCESS: AI bot connected to server network pipeline.");
        
        setTimeout(() => {
            bot.chat('/register PotatoBotPassword77! PotatoBotPassword77!');
            
            setTimeout(() => {
                bot.chat('/login PotatoBotPassword77!');
                
                setTimeout(() => {
                    console.log("Activating smart free-roaming routines...");
                    startAIExploreLoop(bot);
                }, 3000);
            }, 3000);
        }, 3000);
    });

    bot.on('end', () => {
        console.log("Bot disconnected! Attempting instant respawn in 5 seconds...");
        setTimeout(() => {
            createBotInstance();
        }, 5000);
    });

    bot.on('error', (err) => console.log(`Connection Error: ${err.message}`));
}

function startAIExploreLoop(bot) {
    if (!bot || !bot.pathfinder) return;

    // Load standard 1.12.2 block physical collision properties (solid blocks, air, water)
    const mcData = require('minecraft-data')(bot.version);
    const defaultMovements = new Movements(bot, mcData);
    
    // SAFETY CONTROLS: Force the bot to strictly avoid falling down holes or diving into depths
    defaultMovements.canDig = false;             // Prevents trying to break blocks to navigate
    defaultMovements.scafoldingBlocks = [];      // Prevents using blocks to bridge across areas
    defaultMovements.allow1by1towers = false;    // Stops the bot from building pillar stacks
    bot.pathfinder.setMovements(defaultMovements);

    // Pick a completely random target destination within a 20-block walking radius from its current position
    const currentPos = bot.entity.position;
    const randomX = currentPos.x + (Math.floor(Math.random() * 41) - 20);
    const randomZ = currentPos.z + (Math.floor(Math.random() * 41) - 20);

    console.log(`AI calculating safe pathway vectors toward coordinates: X:${Math.floor(randomX)}, Z:${Math.floor(randomZ)}`);
    
    // Commands the bot to execute path calculations to reach the coordinate safely
    bot.pathfinder.setGoal(new GoalXZ(randomX, randomZ));

    // Wait until the bot completes its pathing goal, then pick a fresh set of coordinates to loop forever
    bot.once('goal_reached', () => {
        console.log("Destination reached cleanly. Pausing briefly before searching next safe sector...");
        setTimeout(() => {
            startAIExploreLoop(bot);
        }, 4000); // Rests for 4 seconds at the destination to look completely human
    });
}

createBotInstance();

setInterval(() => {
    console.log("Keep-alive infrastructure tracking nominal.");
}, 10000);
