const mineflayer = require('mineflayer');

// Wrap everything in a launcher function so it can be restarted instantly
function createBotInstance() {
    console.log("Initializing brand new bot instance...");
    
    const bot = mineflayer.createBot({
        host: 'Potatos-andFries.Eagler.Host',
        username: 'MacroBot247',
        version: '1.12.2'
    });

    bot.on('spawn', () => {
        console.log("SUCCESS: Connected to server network pipeline.");
        
        setTimeout(() => {
            bot.chat('/register PotatoBotPassword77! PotatoBotPassword77!');
            
            setTimeout(() => {
                bot.chat('/login PotatoBotPassword77!');
                
                setTimeout(() => {
                    startMacroLoop(bot);
                }, 2000);
            }, 3000);
        }, 3000);
    });

    // INSTANT RECONNECT TRIGGER
    // If the bot gets punched out, kicked, or disconnected, this triggers immediately
    bot.on('end', () => {
        console.log("Bot disconnected! Attempting instant respawn in 5 seconds...");
        setTimeout(() => {
            createBotInstance(); // Fires up a brand new bot automatically
        }, 5000);
    });

    bot.on('error', (err) => console.log(`Connection Error: ${err.message}`));
}

function startMacroLoop(bot) {
    // Check to ensure the bot hasn't been disconnected before executing actions
    if (!bot || !bot.setControlState) return;

    bot.setControlState('forward', true);
    setTimeout(() => {
        if (!bot.setControlState) return;
        bot.setControlState('forward', true);
        bot.setControlState('jump', true);
        
        setTimeout(() => {
            if (!bot.setControlState) return;
            bot.setControlState('jump', false);
            bot.setControlState('back', true);
            
            setTimeout(() => {
                if (!bot.setControlState) return;
                bot.setControlState('back', false);
                startMacroLoop(bot);
            }, 2000);
        }, 1000);
    }, 2000);
}

// Start the initial bot lifecycle
createBotInstance();

// Keep-alive tracker to anchor GitHub runner processes
setInterval(() => {
    console.log("Keep-alive baseline stable.");
}, 10000);
