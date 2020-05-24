const Discord = require("discord.js");
const client = new Discord.Client();
const https = require("https");
const fs = require("fs");
const config = require("./config.json");

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
	client.generateInvite(536995856)
		.then(link => console.log(`Generated bot invite link: ${link}`))
		.catch(console.error);
});

client.on("message", (message) => {		//messages event listener
	if (message.author.bot) return;
	if (message.channel.id == 295061260381454336 && message.content.length > 1){
		try{
			const update = require("./update.js");
			update.run(client, message);
		} catch (err) {
			console.error(err);
		}
	}
	
});

client.on("error", () => {});	//bot error handling (prevents crash on loss of network connection)

getList()

client.login(config.token);		//starts up bot client