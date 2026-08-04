const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const GoalLookAtBlock = goals.GoalLookAtBlock;
const GoalXZ = goals.GoalXZ;

let travelGoalX = null;
let travelGoalZ = null;
let activeLoopTimeout = null;

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
        console.log("Bot disconnected or kicked. Waiting 30 seconds to bypass proxy bans...");
        if (activeLoopTimeout) clearTimeout(activeLoopTimeout);
        travelGoalX = null;
        travelGoalZ = null;
        
        setTimeout(() => {
            createBotInstance();
        }, 30000);
    });
}

function mainAILoop(bot) {
    if (!bot || !bot.pathfinder) return;
    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    
    movements.canDig = true;
    movements.allowSprinting = true; 
    bot.pathfinder.setMovements(movements);

    if (activeLoopTimeout) clearTimeout(activeLoopTimeout);

    const treeBlock = bot.findBlock({
        matching: (block) => {
            const name = block.name.toLowerCase();
            return name === 'log' || name === 'log2' || name.includes('wood') || name.includes('log');
        },
        maxDistance: 25
    });

    if (treeBlock) {
        console.log(`Wood spotted at: ${treeBlock.position}`);
        travelGoalX = null; 
        travelGoalZ = null;

        bot.pathfinder.setGoal(new GoalLookAtBlock(treeBlock.position, bot.world));

        bot.once('goal_reached', async () => {
            try {
                // FIXED: Forcefully stop all pathfinder movements and control states to let the server process the fist packets
                bot.pathfinder.setGoal(null);
                bot.clearControlStates();
                
                await bot.lookAt(treeBlock.position.offset(0.5, 0.5, 0.5));
                
                // Mine the block while completely frozen in place
                await bot.dig(treeBlock);
                console.log("Harvest complete.");
            } catch (err) {
                console.log(`Mining skipped: ${err.message}`);
            }
            // Wait 1 second after mining before turning movement back on
            activeLoopTimeout = setTimeout(() => mainAILoop(bot), 1000);
        });
        return;
    }

    if (travelGoalX === null || travelGoalZ === null) {
        const currentPos = bot.entity.position;
        const angle = Math.random() * Math.PI * 2;
        const distance = 80 + Math.floor(Math.random() * 70);
        
        travelGoalX = currentPos.x + Math.cos(angle) * distance;
        travelGoalZ = currentPos.z + Math.sin(angle) * distance;
        
        console.log(`Searching for forest tracks. Moving toward: X:${Math.floor(travelGoalX)}, Z:${Math.floor(travelGoalZ)}`);
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
