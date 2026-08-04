const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const GoalLookAtBlock = goals.GoalLookAtBlock;
const GoalXZ = goals.GoalXZ;

// Persistent long-distance targets to stop back-and-forth pacing loops
let travelGoalX = null;
let travelGoalZ = null;

function createBotInstance() {
    console.log("Launching Long-Distance Explorer AI...");
    
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
                    travelGoalX = null; // Reset targets at launch
                    travelGoalZ = null;
                    mainAILoop(bot);
                }, 3000);
            }, 3000);
        }, 3000);
    });

    bot.on('end', () => {
        console.log("Bot disconnected. Reconnecting in 5 seconds...");
        setTimeout(() => createBotInstance(), 5000);
    });
}

function mainAILoop(bot) {
    if (!bot || !bot.pathfinder) return;
    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    
    // Maximize fluid movement speed
    movements.canDig = false;
    movements.allowSprinting = true; 
    bot.pathfinder.setMovements(movements);

    // 1. SCAN FOR TREES: Check a slightly wider 25-block radar for wood logs
    const treeBlock = bot.findBlock({
        matching: (block) => {
            const name = block.name.toLowerCase();
            return name === 'log' || name === 'log2' || name.includes('wood') || name.includes('log');
        },
        maxDistance: 25
    });

    // 2. RESOURCE FOUND ROUTINE: If wood is found, abandon the long journey to chop it
    if (treeBlock) {
        console.log(`Wood spotted! Pausing expedition to harvest log at: ${treeBlock.position}`);
        travelGoalX = null; // Clear travel vectors to lock onto resource tracking
        travelGoalZ = null;

        bot.pathfinder.setGoal(new GoalLookAtBlock(treeBlock.position, bot.world));

        bot.once('goal_reached', async () => {
            try {
                await bot.lookAt(treeBlock.position.offset(0.5, 0.5, 0.5));
                await bot.dig(treeBlock);
                console.log("Harvest complete.");
            } catch (err) {
                console.log(`Mining skip: ${err.message}`);
            }
            setTimeout(() => mainAILoop(bot), 400);
        });
        return;
    }

    // 3. SECTOR LONG-DISTANCE JOURNEY ROUTINE: If no wood is found, execute long travels
    if (travelGoalX === null || travelGoalZ === null) {
        const currentPos = bot.entity.position;
        
        // Pick a massive, sweeping target vector (between 80 and 150 blocks away in a random direction)
        const angle = Math.random() * Math.PI * 2;
        const distance = 80 + Math.floor(Math.random() * 70);
        
        travelGoalX = currentPos.x + Math.cos(angle) * distance;
        travelGoalZ = currentPos.z + Math.sin(angle) * distance;
        
        console.log(`No wood found. Initiating continuous long-distance expedition toward coordinates: X:${Math.floor(travelGoalX)}, Z:${Math.floor(travelGoalZ)}`);
    }

    // Force pathfinder to continuously move toward the far target coordinate without stopping
    bot.pathfinder.setGoal(new GoalXZ(travelGoalX, travelGoalZ));

    // Monitor environment changes smoothly while walking
    setTimeout(() => {
        // If the bot reached its massive travel coordinates, clear them so it chooses a new horizon
        const currentPos = bot.entity.position;
        const distanceRemaining = Math.sqrt(Math.pow(currentPos.x - travelGoalX, 2) + Math.pow(currentPos.z - travelGoalZ, 2));
        
        if (distanceRemaining < 4) {
            console.log("Arrived safely at far coordinates sector limits. Refreshing charts...");
            travelGoalX = null;
            travelGoalZ = null;
        }

        // Keep running the main tracking engine loops
        mainAILoop(bot);
    }, 1500); // Scans the environment every 1.5 seconds while maintaining forward velocity
}

createBotInstance();

