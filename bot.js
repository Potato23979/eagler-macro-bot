const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const WebSocket = require('ws');
const axios = require('axios'); // Used to read web data
const GoalLookAtBlock = goals.GoalLookAtBlock;
const GoalXZ = goals.GoalXZ;

let travelGoalX = null;
let travelGoalZ = null;
let activeLoopTimeout = null;
let isStunnedByDamage = false;

// Automated gateway finder for Eaglercraft hosts
async function getEaglerWebSocket(webUrl) {
    try {
        console.log(`Scanning web host configuration for: ${webUrl}...`);
        const formattedUrl = webUrl.startsWith('http') ? webUrl : `https://${webUrl}`;
        const response = await axios.get(formattedUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        
        // Search the web page text for common hidden Eaglercraft address formats
        const match = response.data.match(/(wss:\/\/[^\s"']+)/i);
        if (match && match[1]) {
            console.log(`Found direct game server gateway: ${match[1]}`);
            return match[1];
        }
    } catch (e) {
        console.log(`Web scrape diagnostic failed: ${e.message}`);
    }
    
    // Fallback: If scraper is blocked, try the standard hosting direct network protocol format
    return `wss://${webUrl.replace('https://', '').replace('http://', '')}/server`;
}

async function createBotInstance() {
    // Resolve the real game port address from the URL
    const realWssUrl = await getEaglerWebSocket('Potatos-andFries.Eagler.Host');
    console.log(`Opening game data pipeline via: ${realWssUrl}`);

    const ws = new WebSocket(realWssUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'https://eagler.host'
        }
    });

    const bot = mineflayer.createBot({
        username: 'MacroBot247',
        version: '1.12.2',
        stream: ws, // Link the extracted WebSocket stream directly to Mineflayer
        viewDistance: 'tiny'
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

    ws.on('error', (err) => {
        console.log(`WebSocket Connection Failed: ${err.message}`);
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

setInterval(() => {
    console.log("[Keep-Alive] Keeping GitHub Actions runner alive...");
}, 60000);

