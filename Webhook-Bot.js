const Discord = require("discord.js");
const client = new Discord.Client();
const schedule = require("node-schedule");
const database = require("./database.js")
const autoUpdate = require("./autoUpdate.js");
const config = require("./config.json");

const autoUpdateDelay = 10; //Delay for checking monitored apps for new updates in minutes
const databaseUpdateDelay = 24; //Delay for checking Steam for new games in hours

client.on("ready", () => {	//log bot startup
	console.log("Client started")
	/*client.generateInvite(536995856)
		.then(link => console.log(`Generated bot invite link: ${link}`))
		.catch(console.error);*/
	schedule.scheduleJob(`* /${autoUpdateDelay} * * * *`, () => autoUpdate.run(client, config.monitorApps, config.channelID, delay));
	schedule.scheduleJob(`* * /${databaseUpdateDelay} * * *`, () => database.update());
});

client.on("message", (message) => {		//messages event listener
	if (message.author.bot) return;
	if (message.channel.id == config.channelID && !(parseInt(message.content) <= 100)) {
		try{
			const update = require("./update.js");
			update.run(client, message);
		} catch (err) {
			console.error(err);
		}
	}
});

client.on("error", () => {});	//bot error handling (prevents crash on loss of network connection)
try {
	require('./applist.json');
} catch {
	await database.build();
}

client.login(config.token);		//starts up bot client
