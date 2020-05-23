const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");
const https = require("https");
const fs = require("fs");

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
	let data = await httpsget("https://api.steampowered.com/ISteamApps/GetAppList/v2");
	await fs.promises.writeFile("applist.json", data);
}

client.on("ready", () => {	//log bot startup
	console.log("Client started");
});

client.on("message", (message) => {		//messages event listener
	const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
	try{
		let command = require('./update.js');
		command.run(client, args);
	} catch (err) {
		console.error(err);
	}
});

client.on("error", () => {});	//bot error handling (prevents crash on loss of network connection)

getList()

client.login(config.token);		//starts up bot client