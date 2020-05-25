const https = require('https');
const discord = require('discord.js');
const applist = require('./applist.json');

function httpsget(url) {		//async function for http get requests url in data out.  It just works
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
    content = content.split('[i]').join('*');
    content = content.split('[/i]').join('*');
    content = content.split('[b]').join('**');
    content = content.split('[/b]').join('**');
    content = content.split('[u]').join('__');
    content = content.split('[/u]').join('__');
    return {content, imageList};
}

async function getUpdate(client, appID, delay) {	//gets the latest update for the selected game and formats it for sending as an embed
	let data = JSON.parse(await httpsget(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${app.appid}&count=1`));
	if (data.appnews.count === 0) return message.channel.send(new discord.MessageEmbed().setDescription(`No news found for [${app.name}](https://store.steampowered.com/app/${app.appid} 'https://store.steampowered.com/app/${app.appid}')`))
	for (i = 1; !(data.appnews.newsitems[0].feedname === "steam_community_announcements"); i++) {
		//if ((i+1) > data.appnews.count) return message.channel.send(`No news found for "${message.content}".`);
		data = JSON.parse(await httpsget(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${app.appid}&count=1&enddate=${data.appnews.newsitems[0].date-1}`));
		if (data.appnews.newsitems.length === 0) return message.channel.send(new discord.MessageEmbed().setDescription(`No news found for [${app.name}](https://store.steampowered.com/app/${app.appid} 'https://store.steampowered.com/app/${app.appid}')`));
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
	
	//new article check
	
}

exports.run = async (client, appIDArray) => {

	for(appID of appIDArray){
		getUpdate(appID, client, delay);
	}

}