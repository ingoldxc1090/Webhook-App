const https = require('https');
const leven = require('leven');
const discord = require('discord.js');
const applist = require('./applist.json');

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

function getCandidates(arg) {	//gets a list of candidates for the query
	arg = arg.replace(/[^\da-zA-Z]/g, '').toLowerCase();	//strips names in app list of non alphanumeric characters
	let sorted = applist.applist.apps.map(({ name }, i) => {	//maps two new values to the app list: original index and levenshtein distance
		name = name.replace(/[^\da-zA-Z]/g, '').toLowerCase();
		return { l:leven(arg,name), i }							//sorts the app list by ascending levenshtein distance
	}).sort(({ l: a }, { l: b }) => {
		return a - b
	});
	let out = [];
	let l = sorted[0].l;
	for (e of sorted) {		//creates an output array of all of the results with the lowest levenshtein number
		if (e.l != l) break;
		out.push(e);
	}
	return out.map((e) => {
		return applist.applist.apps[e.i];
	});
}

function messageValidate(message, candidates, i) {		// verifies that user input in game selection is a valid input (moved to function to enable recursive structure)
	const filter = m => m.author.id === message.author.id;
	message.channel.awaitMessages(filter, {max: 1, time: 60000, errors: ['time']})
		.then((collected) => {
			let j = parseInt(collected.first().content.trim(),10);
			console.log(j);
			if (j >= 1 && j <= i) {
				return candidates[j-1].appid;
			} else {
				message.channel.send(`Please enter a number between 1 and ${i}`);
				return meessageValidate(message, candidates, i);
			}
		});
}

function getUpdate(arg) {	//gets the latest update for the selected game and formats it for sending as an embed
	data = httpsget(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appid}&count=1`)
	while (!(data.appnews.newsitems[0].feedname === "steam_community_announcements")) {
		data = httpsget(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appid}&count=1&enddate=${data.appnews.newsitems[0].date}`)
	}
	totalLength = data.appnews.newsitems[0].title.length + data.appnews.newsitems[0].url.length + data.appnews.newsitems[0].author.length + data.appnews.newsitems[0].date.toString().length + content.length;
	if(totalLength > 6000) {

	}else{
		let embed = new discord.MessageEmbed()
			.setTitle(data.appnews.newsitems[0].title)
			.setAuthor(data.appnews.newsitems[0].author)
			.setURL(data.appnews.newsitems[0].url)
			.setTimestamp(data.appnews.newsitems[0].date)
	}
}

exports.run = (client, message) => {
	let candidates = getCandidates(message.content);
	let appid = "";

	if (candidates.length > 1) {		//if multiple results match the lowest levenshtein number asks the user to verify their intended game
		let prompt = "Multiple results match this search. Reply with the number of your intended game."
		let i = 1;
		for (e of candidates){
			prompt+=`\n${i}. <https://store.steampowered.com/app/${e.appid}>`;
			i++;
		}
		message.channel.send(prompt);
		appid = messageValidate(message, candidates, i);
	} else {
		appid = candidates[0].appid;
	}
	getUpdate(appid);
}