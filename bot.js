const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const GoalLookAtBlock = goals.GoalLookAtBlock;
const GoalXZ = goals.GoalXZ;

let travelGoalX = null;
let travelGoalZ = null;
let activeLoopTimeout = null;
let isStunnedByDamage = false; // Prevents anti-cheat combat flags

function createBotInstance() {
    console.log("Launching Anti-Cheat Safe Gathering AI...");
    
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
        isStunnedByDamage = false;

        setTimeout(() => {
            bot.chat('/register PotatoBotPassword77! PotatoBotPassword77!');
            setTimeout(() => {
                bot.chat('/login PotatoBotPassword77!');
                setTimeout(() => {
                    mainAILoop(bot);
                }, 3000);
            }, 3000);
        }, 4000);
    });

    // FIX FOR DAMAGE KICK: Listen for damage updates to pause pathfinding 
    bot.on('health', () => {
        if (bot.health < 20) { // Triggered if health drops or falls
            console.log("ALERT: Bot took damage! Backing off AI to allow natural knockback...");
            isStunnedByDamage = true;
            if (bot.pathfinder) bot.pathfinder.setGoal(null); // Abort aggressive goals instantly
            
            // Allow 1.5 seconds for vanilla physics before resuming mining engine
            setTimeout(() => {
                isStunnedByDamage = false;
            }, 1500);
        }
    });

    bot.on('end', (reason) => {
        console.log(`Bot disconnected. Reason: ${reason}. Waiting 30s to reconnect...`);
        if (activeLoopTimeout) clearTimeout(activeLoopTimeout);
        travelGoalX = null;
        travelGoalZ = null;
        setTimeout(() => createBotInstance(), 30000);
    });
}

function mainAILoop(bot) {
    if (!bot || !bot.pathfinder || isStunnedByDamage) {
        // If stunned or broken, check back in half a second
        activeLoopTimeout = setTimeout(() => mainAILoop(bot), 500);
        return;
    }

    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    
    movements.canDig = true;
    movements.allowSprinting = false; // ANTI-CHEAT FIX: Disable sprinting to stop fast-movement velocity checks
    
    const items = bot.inventory.items();
    const buildingBlocks = items.filter(i => i.name === 'dirt' || i.name === 'cobblestone' || i.name.includes('planks'));
    if (buildingBlocks.length > 0) {
        const validatedIds = [];
        buildingBlocks.forEach(item => {
            const blockInfo = mcData.blocksByName[item.name];
            if (blockInfo) validatedIds.push(blockInfo.id);
        });
        movements.scaffoldingBlocks = validatedIds;
    }
    
    bot.pathfinder.setMovements(movements);
    if (activeLoopTimeout) clearTimeout(activeLoopTimeout);

    // RADAR: Locate wood blocks
    const treeBlock = bot.findBlock({
        matching: (block) => {
            const name = block.name.toLowerCase();
            return name === 'log' || name === 'log2' || name === 'oak_log' || name === 'spruce_log' || name === 'birch_log' || name === 'jungle_log' || name === 'acacia_log' || name === 'dark_oak_log';
        },
        maxDistance: 20 // Reduced slightly to avoid sudden long-distance snaps
    });

    if (treeBlock && !isStunnedByDamage) {
        console.log(`Targeting wood block at: ${treeBlock.position}`);
        travelGoalX = null; 
        travelGoalZ = null;

        bot.pathfinder.setGoal(new GoalLookAtBlock(treeBlock.position, bot.world));

        bot.once('goal_reached', async () => {
            if (isStunnedByDamage) return;
            try {
                bot.pathfinder.setGoal(null);
                bot.clearControlStates();
                
                // ANTI-CHEAT FIX: Add humanized coordinate offset variations so it doesn't look like a robot
                const humanizedLook = treeBlock.position.offset(
                    0.4 + Math.random() * 0.2, 
                    0.4 + Math.random() * 0.2, 
                    0.4 + Math.random() * 0.2
                );
                await bot.lookAt(humanizedLook);
                await bot.dig(treeBlock);
                
                await new Promise(resolve => setTimeout(resolve, 600 + Math.floor(Math.random() * 300)));
                
                const droppedItem = bot.nearestEntity((entity) => {
                    return entity.type === 'object' && bot.entity.position.distanceTo(entity.position) < 4;
                });

                if (droppedItem && !isStunnedByDamage) {
                    bot.pathfinder.setGoal(new GoalXZ(droppedItem.position.x, droppedItem.position.z));
                    await new Promise(resolve => bot.once('goal_reached', resolve));
                }
            } catch (err) {
                console.log(`Mining action skipped: ${err.message}`);
            }
            activeLoopTimeout = setTimeout(() => mainAILoop(bot), 1200); // Slower pause loop
        });
        return;
    }

    // WANDERING LOGIC: Choose human-like roaming paths
    if (travelGoalX === null || travelGoalZ === null) {
        const currentPos = bot.entity.position;
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.floor(Math.random() * 30); // Decreased distance to look less suspicious
        
        travelGoalX = currentPos.x + Math.cos(angle) * distance;
        travelGoalZ = currentPos.z + Math.sin(angle) * distance;
        
        // Simulating human head yaw check when changing directions
        bot.look(angle, 0, false);
    }

    if (!isStunnedByDamage) {
        bot.pathfinder.setGoal(new GoalXZ(travelGoalX, travelGoalZ));
    }

    activeLoopTimeout = setTimeout(() => {
        if (isStunnedByDamage) return mainAILoop(bot);
        
        const currentPos = bot.entity.position;
        const distanceRemaining = Math.sqrt(Math.pow(currentPos.x - travelGoalX, 2) + Math.pow(currentPos.z - travelGoalZ, 2));
        
        if (distanceRemaining < 4) {
            travelGoalX = null;
            travelGoalZ = null;
        }

        mainAILoop(bot);
    }, 2500); 
}

createBotInstance();
