const Discord = require("discord.js");
const client = new Discord.Client();
const https = require("https");
const fs = require("fs");
const schedule = require("node-schedule");
const autoUpdate = require("./autoUpdate.js");
const config = require("./config.json");

const delay = 10;

async function sleep(milliseconds) {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function httpsget(url) {	//async function for http get requests url in data out. It just works
	return new Promise((resolve, reject) => {
		https.get(url, (res) => {
			let data = '';
			res.on('data', (chunk) => {
				data += chunk;
			});
			res.on('end', () => resolve(data));
			res.on('error', reject);
		}).on('error', reject);
	});
}

async function getList() {	//function to get and save list of all apps registered on steam
	let data = JSON.parse(await httpsget("https://api.steampowered.com/ISteamApps/GetAppList/v2")).applist.apps.map(({ name, appid }) => {
		return { cleanname: name.replace(/[^\da-zA-Z]/g, '').toLowerCase(), name, appid, apptype: undefined, developers: undefined };
	});
	let applist = require("./applist.json");
	let i = 1
	for(searchApp of data) {
		process.stdout.write(`Checking app ${i} of ${data.length}`);
		let listApp = applist.find(app => app.appid == searchApp.appid);
		if (listApp === undefined) applist.push(searchApp);
		i++;
		process.stdout.write("\r\x1b[K");
	}
	i = 1;
	for(app of applist) {
		process.stdout.write(`Downloading data for app ${i} of ${applist.length}`);
		if (app.apptype === undefined) {
			try {
				let appdata = JSON.parse(await httpsget(`https://store.steampowered.com/api/appdetails/?appids=${app.appid}`))[app.appid.toString()];
				if (appdata.success) app.apptype = appdata.data.type, app.developers = appdata.developers;	
			} catch {
				console.log(`Error downloading data for ${app.name}`);
			}
		}
		if (i%10 == 0) await sleep(5000);		
		i++;
		process.stdout.write("\r\x1b[K");
	}
	await fs.promises.writeFile("applist.json", JSON.stringify(applist));
	await fs.promises.writeFile('gamelist.json', JSON.stringify(applist.filter(app => app.apptype === 'game')))	
}

client.on("ready", () => {	//log bot startup
	console.log("Client started")
	/*client.generateInvite(536995856)
		.then(link => console.log(`Generated bot invite link: ${link}`))
		.catch(console.error);*/
	//schedule.scheduleJob(`* /${delay} * * * *`, () => autoUpdate.run(client, config.monitorApps, config.channelID, delay));
	
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

getList();

client.login(config.token);		//starts up bot client
