const puppeteer = require('puppeteer');
var TelegramBot = require('node-telegram-bot-api');
const { User } = require('./User');

var token = process.env.TOKEN;
require('node-telegram-bot-api'),
    port = process.env.PORT || 443,
    externalUrl = process.env.CUSTOM_ENV_VARIABLE || 'https://limitless-garden-92898.herokuapp.com',
    token = process.env.TOKEN,
    bot = new TelegramBot(process.env.TOKEN, { webHook: { port: port }, polling: true });
bot.setWebHook(externalUrl + ':443/bot' + token);


// var bot = new TelegramBot(token, { polling: true });

var subscribers = [];
setInterval(function () {
    checkStatus();
}, 60000);

bot.onText(/\/start (.+)/, function (msg, match) {
    var userId = msg.from.id;
    var month = match[1];

    if (subscribers.some(s => s.id === userId && s.month == month)) {
        return;
    }

    subscribers.push(new User(userId, month))

    console.log(`start for ${userId}`);
    bot.sendMessage(userId, `I'm going to track availability of Teide entry permits for ${month}. Keep tracking.`);
});

bot.onText(/\/stop/, function (msg) {
    var userId = msg.from.id;

    console.log(`Unsubscribe ${userId}`);

    subscribers = subscribers.filter(s => s.id !== userId);

    bot.sendMessage(userId, `You have successfully unsubscribed from tracking.`);
});

bot.on('polling_error', (error) => {
    console.log(error.code);  // => 'EFATAL'
});

var checkStatus = () => {
    (async () => {
        console.log(`Start checking`);

        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });

        console.log(`Load page`);

        const page = await browser.newPage();
        await page.goto('http://www.reservasparquesnacionales.es/real/ParquesNac/usu/html/inicio-reserva-oapn.aspx?cen=2&act=+1');

        // console.log(`navigate next month 1`);
        // await Promise.all([
        //     page.waitForNavigation(),
        //     page.click('a[title="Go to the next month"]')
        // ]);
        var marchSlots = await page.$$('td.dias[style="background-color:WhiteSmoke;width:14%;"]');

        console.log(`navigate next month 2`);
        await Promise.all([
            page.waitForNavigation(),
            page.click('a[title="Go to the next month"]')
        ]);

        if (marchSlots != null && marchSlots.length > 0) {
            var screen = await page.screenshot({ fullPage: true });

            var marchSubscribers = subscribers.filter(s => s.month === 'march');
            marchSubscribers.forEach(s => sendSuccessMessage(s.id, 'march', marchSlots.length, screen))
        }

        var aprilSlots = await page.$$('td.dias[style="background-color:WhiteSmoke;width:14%;"]');
        if (aprilSlots != null && aprilSlots.length > 0) {
            var screen = await page.screenshot({ fullPage: true });

            var marchSubscribers = subscribers.filter(s => s.month === 'april');
            marchSubscribers.forEach(s => sendSuccessMessage(s.id, 'april', aprilSlots.length, screen))
        }

        // console.log('Find a');
        //  await Promise.all([
        //     page.waitForNavigation(),
        //   page.click('a[title~="14"]')
        // ]);
        console.log(`finish`);

        await browser.close();
    })();
}

var sendSuccessMessage = (userId, month, numOfSlots, photo) => {
    bot.sendMessage(userId, `Check it!!!!! There are ${numOfSlots} empty spaces for ${month}. 
    http://www.reservasparquesnacionales.es/real/ParquesNac/usu/html/inicio-reserva-oapn.aspx?cen=2&act=+1`);

    bot.sendPhoto(userId, photo);
}