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

    bot.physics.enabled = false;

    bot.on('spawn', () => {
        console.log("SUCCESS: Bot successfully logged into the server.");
        bot.physics.enabled = false; 

        setTimeout(() => {
            bot.chat('/register PotatoBotPassword77! PotatoBotPassword77!');
            setTimeout(() => {
                bot.chat('/login PotatoBotPassword77!');
                console.log("Bot logged in. Standing perfectly still.");
            }, 3000);
        }, 4000);
    });

    bot.on('time', () => {
        // Keeps Mineflayer listening actively to the server tick stream
    });

    bot.on('end', (reason) => {
        console.log(`Bot disconnected. Reason: ${reason}. Reconnecting in 15 seconds...`);
        setTimeout(() => createBotInstance(), 15000);
    });

    ws.on('error', (err) => {
        console.log(`WebSocket Connection Failed: ${err.message}`);
    });
}

createBotInstance();

setInterval(() => {
    console.log("[Status Tracker] Bot process is active. Holding server open...");
}, 10000);
