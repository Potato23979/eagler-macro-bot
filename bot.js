const mineflayer = require('mineflayer');

const bot = mineflayer.createBot({
    host: 'Potatos-andFries.Eagler.Host',
    username: 'MacroBot247',
    version: '1.12.2'
});

bot.on('spawn', () => {
    console.log("SUCCESS: Connected to server network pipeline.");
    
    // Step 1: Wait 3 seconds, then try to register the account safely
    setTimeout(() => {
        console.log("Sending safety registration command...");
        bot.chat('/register PotatoBotPassword77! PotatoBotPassword77!');
        
        // Step 2: Wait another 3 seconds before executing the login command
        setTimeout(() => {
            console.log("Authenticating player profile...");
            bot.chat('/login PotatoBotPassword77!');
            
            // Step 3: Wait another 2 seconds before moving
            setTimeout(() => {
                startMacroLoop();
            }, 2000);
        }, 3000);
    }, 3000);
});

function startMacroLoop() {
    bot.setControlState('forward', true);
    setTimeout(() => {
        bot.setControlState('forward', false);
        bot.setControlState('jump', true);
        
        setTimeout(() => {
            bot.setControlState('jump', false);
            bot.setControlState('back', true);
            
            setTimeout(() => {
                bot.setControlState('back', false);
                startMacroLoop();
            }, 2000);
        }, 1000);
    }, 2000);
}

setInterval(() => {
    if (bot && bot.entity) {
        console.log("Keep-alive baseline stable.");
    }
}, 5000);

bot.on('error', (err) => console.log(`Connection Error: ${err.message}`));
bot.on('kicked', (reason) => console.log(`Kicked from server: ${reason}`));
