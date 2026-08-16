const mineflayer = require('mineflayer');
const WebSocket = require('ws');
const axios = require('axios');

// Automated gateway finder for Eaglercraft hosts
async function getEaglerWebSocket(webUrl) {
    try {
        console.log(`Scanning web host configuration for: ${webUrl}...`);
        const formattedUrl = webUrl.startsWith('http') ? webUrl : `https://${webUrl}`;
        const response = await axios.get(formattedUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        
        const match = response.data.match(/(wss:\/\/[^\s"']+)/i);
        if (match && match[1]) {
            console.log(`Found direct game server gateway: ${match[1]}`);
            return match[1];
        }
    } catch (e) {
        console.log(`Web scrape diagnostic failed: ${e.message}`);
    }
    return `wss://${webUrl.replace('https://', '').replace('http://', '')}/server`;
}

async function createBotInstance() {
    const realWssUrl = await getEaglerWebSocket('Potatos-andFries.Eagler.Host');
    console.log(`Opening game data pipeline via: ${realWssUrl}`);

    const ws = new WebSocket(realWssUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Origin': 'https://eagler.host'
        }
    });

    const bot = mineflayer.createBot({
        username: 'MacroBot247',
        version: '1.12.2',
        stream: ws, 
        viewDistance: 'tiny'
    });

    // Disable physics immediately on initialization
    bot.physics.enabled = false;

    bot.on('spawn', () => {
        console.log("SUCCESS: Bot successfully logged into the server.");
        bot.physics.enabled = false; 

        // Authenticate with LoginSecurity
        setTimeout(() => {
            bot.chat('/register PotatoBotPassword77! PotatoBotPassword77!');
            setTimeout(() => {
                bot.chat('/login PotatoBotPassword77!');
                console.log("Bot logged in. Standing perfectly still.");
            }, 3000);
        }, 4000);
    });

    // Keep-alive tracker inside Mineflayer to block Node.js from exiting
    bot.on('time', () => {
        // This event fires every single in-game tick (20 times a second).
        // It acts as a processing anchor forcing the server thread to stay occupied.
    });

    // Auto-reconnect loop if kicked or if the host reboots
    bot.on('end', (reason) => {
        console.log(`Bot disconnected. Reason: ${reason}. Reconnecting in 15 seconds...`);
        setTimeout(() => createBotInstance(), 15000);
    });

    ws.on('error', (err) => {
        console.log(`WebSocket Connection Failed: ${err.message}`);
    });
}

createBotInstance();

// Strict 10-second system clock loop. As long as this exists, Node.js cannot exit.
setInterval(() => {
    console.log("[Status Tracker] Bot process is active. Holding server open...");
}, 10000);

