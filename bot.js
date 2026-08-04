const mineflayer = require('mineflayer');

// Natively locks to 1.12.2 to completely skip server proxy checks
const bot = mineflayer.createBot({
    host: 'Potatos-andFries.Eagler.Host',
    username: 'MacroBot247',
    version: '1.12.2'
});

bot.on('spawn', () => {
    console.log("SUCCESS: Bot has successfully spawned into your server!");
    
    // Automatically runs your in-game authentication password
    setTimeout(() => {
        bot.chat('/register YourSecretBotPassword123');
        startMacroLoop();
    }, 3000);
});

function startMacroLoop() {
    console.log("Running anti-AFK movement loop...");
    
    // Simulates keypress movements to keep the bot active
    bot.setControlState('forward', true);
    setTimeout(() => {
        bot.setControlState('forward', false);
        bot.setControlState('jump', true);
        
        setTimeout(() => {
            bot.setControlState('jump', false);
            bot.setControlState('back', true);
            
            setTimeout(() => {
                bot.setControlState('back', false);
                // Loops the movement macro forever
                startMacroLoop();
            }, 2000);
        }, 1000);
    }, 2000);
}

bot.on('error', (err) => console.log(`Connection Error: ${err.message}`));
bot.on('kicked', (reason) => console.log(`Kicked from server: ${reason}`));
