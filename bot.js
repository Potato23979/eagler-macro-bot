const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const GoalLookAtBlock = goals.GoalLookAtBlock;
const GoalXZ = goals.GoalXZ;

let travelGoalX = null;
let travelGoalZ = null;
let activeLoopTimeout = null;
let isStunnedByDamage = false;

function createBotInstance() {
    console.log("Launching Proxy-Bypass Gathering AI...");
    
    const bot = mineflayer.createBot({
        host: 'Potatos-andFries.Eagler.Host',
        username: 'MacroBot247',
        version: '1.12.2',
        // FIX FOR socketClosed: Emulate a real web browser connection to trick proxy firewalls
        viewDistance: 'tiny', // Lower data footprint looks like standard Eaglercraft clients
        connect: (client) => {
            if (client.setSocketOptions) {
                client.setSocketOptions({
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Origin': 'https://eagler.host'
                    }
                });
            }
        }
    });

    bot.loadPlugin(pathfinder);

    bot.on('spawn', () => {
        console.log("SUCCESS: Bot successfully logged into the server.");
        bot.physics.enabled = true;
        
        bot.clearControlStates();
        travelGoalX = null; 
        travelGoalZ = null;
        isStunnedByDamage = false;

        // Humanized randomized delays for commands to dodge automated log scans
        setTimeout(() => {
            bot.chat('/register PotatoBotPassword77! PotatoBotPassword77!');
            setTimeout(() => {
                bot.chat('/login PotatoBotPassword77!');
                setTimeout(() => {
                    mainAILoop(bot);
                }, 4000);
            }, 3500);
        }, 4500);
    });

    bot.on('health', () => {
        if (bot.health < 20) {
            console.log("ALERT: Bot took damage! Backing off AI to allow natural knockback...");
            isStunnedByDamage = true;
            if (bot.pathfinder) bot.pathfinder.setGoal(null);
            
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
        activeLoopTimeout = setTimeout(() => mainAILoop(bot), 500);
        return;
    }

    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    
    movements.canDig = true;
    movements.allowSprinting = false; 
    
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

    const treeBlock = bot.findBlock({
        matching: (block) => {
            const name = block.name.toLowerCase();
            return name === 'log' || name === 'log2' || name === 'oak_log' || name === 'spruce_log' || name === 'birch_log' || name === 'jungle_log' || name === 'acacia_log' || name === 'dark_oak_log';
        },
        maxDistance: 20 
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
            activeLoopTimeout = setTimeout(() => mainAILoop(bot), 1200); 
        });
        return;
    }

    if (travelGoalX === null || travelGoalZ === null) {
        const currentPos = bot.entity.position;
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.floor(Math.random() * 30); 
        
        travelGoalX = currentPos.x + Math.cos(angle) * distance;
        travelGoalZ = currentPos.z + Math.sin(angle) * distance;
        
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

