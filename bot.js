const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const GoalLookAtBlock = goals.GoalLookAtBlock;
const GoalXZ = goals.GoalXZ;

let travelGoalX = null;
let travelGoalZ = null;
let activeLoopTimeout = null;

function createBotInstance() {
    console.log("Launching Advanced Column-Bridging Survival AI...");
    
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
        console.log("Bot disconnected or kicked. Reconnecting in 30 seconds...");
        if (activeLoopTimeout) clearTimeout(activeLoopTimeout);
        travelGoalX = null;
        travelGoalZ = null;
        setTimeout(() => createBotInstance(), 30000);
    });
}

function mainAILoop(bot) {
    if (!bot || !bot.pathfinder) return;
    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    
    // PERMISSIONS UPGRADE: Allow the bot to dig blocks out of its way and place bridging columns
    movements.canDig = true;
    movements.allowSprinting = true; 
    
    // Fetch usable block IDs from inventory to allow jumping/bridging scaffolding mechanics
    const items = bot.inventory.items();
    const buildingBlocks = items.filter(i => i.name === 'dirt' || i.name === 'cobblestone' || i.name.includes('planks'));
    if (buildingBlocks.length > 0) {
        movements.scafoldingBlocks = buildingBlocks.map(i => i.type);
    }
    
    bot.pathfinder.setMovements(movements);

    if (activeLoopTimeout) clearTimeout(activeLoopTimeout);

    const treeBlock = bot.findBlock({
        matching: (block) => {
            const name = block.name.toLowerCase();
            return name === 'log' || name === 'log2' || name === 'oak_log' || name === 'spruce_log' || name === 'birch_log' || name === 'jungle_log' || name === 'acacia_log' || name === 'dark_oak_log';
        },
        maxDistance: 25
    });

    if (treeBlock) {
        console.log(`True Wood spotted at: ${treeBlock.position}`);
        travelGoalX = null; 
        travelGoalZ = null;

        bot.pathfinder.setGoal(new GoalLookAtBlock(treeBlock.position, bot.world));

        bot.once('goal_reached', async () => {
            try {
                bot.pathfinder.setGoal(null);
                bot.clearControlStates();
                
                await bot.lookAt(treeBlock.position.offset(0.5, 0.5, 0.5));
                await bot.dig(treeBlock);
                console.log("Block broken! Initiating drop collection sequence...");
                
                await new Promise(resolve => setTimeout(resolve, 800));
                
                const droppedItem = bot.nearestEntity((entity) => {
                    return entity.type === 'object' && bot.entity.position.distanceTo(entity.position) < 4;
                });

                if (droppedItem) {
                    console.log("Sucking up log drops...");
                    bot.pathfinder.setGoal(new GoalXZ(droppedItem.position.x, droppedItem.position.z));
                    await new Promise(resolve => bot.once('goal_reached', resolve));
                }
            } catch (err) {
                console.log(`Mining or collection skipped: ${err.message}`);
            }
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
