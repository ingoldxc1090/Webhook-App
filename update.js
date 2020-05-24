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

async function messageValidate(message, candidates, i) {		// verifies that user input in game selection is a valid input (moved to function to enable recursive structure)
	const filter = m => m.author.id === message.author.id;
	let collected = await message.channel.awaitMessages(filter, {max: 1, time: 60000, errors: ['time']})
	let j = parseInt(collected.first().content.trim(),10);
	if (j >= 1 && j <= i) {
		return candidates[j-1];
	} else {
		message.channel.send(`Please enter a number between 1 and ${i}`);
		return messageValidate(message, candidates, i);
	}
}
 
async function getUpdate(message, app) {	//gets the latest update for the selected game and formats it for sending as an embed
	let data = JSON.parse(await httpsget(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${app.appid}&count=1`));
	if (data.appnews.count === 0) return message.channel.send("No news found for this app.")
	for (i = 1; !(data.appnews.newsitems[0].feedname === "steam_community_announcements"); i++) {
		if ((i+1) > data.appnews.count) return message.channel.send("No news found for this app.");
		data = JSON.parse(await httpsget(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${app.appid}&count=1&enddate=${data.appnews.newsitems[0].date}`));
	}
	let contents = cleanText(data.appnews.newsitems[0].contents);
	
	if(contents.content.length > 2048) {
		for (i = 1; i <= Math.ceil(contents.content.length/2048); i++) {
			let embed = new discord.MessageEmbed()
				.setAuthor(app.name + " News")
				.setURL(data.appnews.newsitems[0].url)
				.setThumbnail(`https://steamcdn-a.akamaihd.net/steam/apps/${app.appid}/logo.png`)
				.setTimestamp(data.appnews.newsitems[0].date*1000);
			if (contents.imageList.length >= i) embed.setImage(contents.imageList[i-1]);
			if (i = Math.ceil(contents.content.length/2048)) embed.setDescription(contents.content.substring((i-1)*2048, contents.content.length-1));
			else embed.setDescription(contents.content.substring((i-1)*2048, (i*2048)-1));
			if (`${data.appnews.newsitems[0].title} (${i}/${Math.ceil(contents.content.length/2048)})`.length > 256) embed.setTitle(data.appnews.newsitems[0].title.substring(256 - `... (${i}/${Math.ceil(contents.content.length/2048)})`.length) + `... (${i}/${Math.ceil(contents.content.length/2048)})`);
			else embed.setTitle(data.appnews.newsitems[0].title + ` (${i}/${Math.ceil(contents.content.length/2048)})`);
			message.channel.send(embed);
		}
	}else{
		let embed = new discord.MessageEmbed()
			.setTitle(data.appnews.newsitems[0].title)
			.setAuthor(app.name + " News")
			.setDescription(contents.content)
			.setURL(data.appnews.newsitems[0].url)
			.setThumbnail(`https://steamcdn-a.akamaihd.net/steam/apps/${app.appid}/logo.png`)
			.setTimestamp(data.appnews.newsitems[0].date*1000);
		if (contents.imageList.length > 0) embed.setImage(contents.imageList[0]);
		if (data.appnews.newsitems[0].title.length > 256) embed.setTitle(data.appnews.newsitems[0].title.substring(256 - '...'.length));
		else embed.setTitle(data.appnews.newsitems[0].title);
		message.channel.send(embed);
	}
}

function cleanText(content) {
	var startIndex = 0, index;
    while ((index = content.indexOf('[url=', startIndex)) > -1) {
       	startIndex = index + '[url='.length;
       	let url = content.substring(startIndex, content.indexOf(']', startIndex));
       	content = content.replace(('[url=' + url + ']'), '');
       	startIndex-='[url='.length;
       	let linkText = content.substring(startIndex, content.indexOf('[/url]', startIndex))
       	content = content.replace((linkText + '[/url]'), `[${linkText}](${url} 'optional hovertext')`);
    }
    const clanImage = 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/clans';
    startIndex = 0;
    index = undefined; 
    imageList = [];
    while ((index = content.indexOf('[img]', startIndex)) > -1) {
        startIndex = index + '[img]'.length;
        let url = content.substring(startIndex, content.indexOf('[/img]', startIndex));
        content = content.replace(('[img]' + url + '[/img]'), '');
        url = url.replace('{STEAM_CLAN_IMAGE}', clanImage);
        imageList.push(url);
        
    }
    return {content, imageList};
}

exports.run = async (client, message) => {
	let candidates = getCandidates(message.content);
	let appid = "";
	if (candidates.length > 1) {		//if multiple results match the lowest levenshtein number asks the user to verify their intended game
		let body = [];
		let i = 0;
		for (e of candidates){
			i++;
			body+=`\n${i}. [${e.name}](https://store.steampowered.com/app/${e.appid} 'https://store.steampowered.com/app/${e.appid}')`;
		}
		let embed = new discord.MessageEmbed()
			.setTitle("Multiple results match this search. Reply with the number of your intended game.")
			.setDescription(body);
		message.channel.send(embed);
		app = await messageValidate(message, candidates, i);
	} else {
		app = candidates[0];
	}
	getUpdate(message, app);
}