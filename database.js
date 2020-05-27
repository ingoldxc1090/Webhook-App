const https = require('https');
const fs = require('fs');

async function sleep(milliseconds) {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function httpsget(url) {	//async function for http get requests url in data out. It just works.
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

exports.build = () => {
    return new Promise((resolve) => {
        console.log('App list not found. Building app list from scratch. This will take a while...');
	    let data = JSON.parse(await httpsget("https://api.steampowered.com/ISteamApps/GetAppList/v2")).applist.apps.map(({ name, appid }) => {
		    return { cleanname: name.replace(/[^\da-zA-Z]/g, '').toLowerCase(), name, appid, apptype: undefined, developers: undefined };
	    });
    	let i = 1;
	    let rcount = 1;
        let errorApps = [];
        let applist = []
    	for (app of data) {
	    	process.stdout.write(`Downloading data for app ${i} of ${data.length}`);
    		if (app.apptype === undefined) {
	    		try {
		    		let appdata = JSON.parse(await httpsget(`https://store.steampowered.com/api/appdetails/?appids=${app.appid}`))[app.appid.toString()];
                    if (appdata.success) app.apptype = appdata.data.type, app.developers = appdata.developers;
                    appdata.push(app);
			    } catch {
				    errorApps.push(app)
			    }
			    rcount++;
		    }
		    if (rcount%10 == 0) await sleep(5000);	
		    i++;
		    process.stdout.write("\r\x1b[K");
	    }
	    i = 1;
	    let failedApps = {names:[], items:[]};
	    console.log(`Error downloading data for ${errorApps.length} apps`);
	    for (app of errorApps) {
		    process.stdout.write(`Retrying download for ${app.name} app ${i} of ${errorApps.length}`);
		    try {
    			let appdata = JSON.parse(await httpsget(`https://store.steampowered.com/api/appdetails/?appids=${app.appid}`))[app.appid.toString()];
	    		if (appdata.success) {
		    		app.apptype = appdata.data.type, app.developers = appdata.developers;
			    	newapps.find(newapp => newapp.appid == app.id) = app;
			    }
		    } catch {
			    failedApps.names.push(app.name);
    			failedApps.items.push(app);
	    	}
		    i++;
		    process.stdout.write("\r\x1b[K");
	    }
	    if (failedApps.length > 0) console.log(`Failed to download data for: ${failedApps.names.toString()}`);
	    await fs.promises.writeFile("applist.json", JSON.stringify(applist));
        await fs.promises.writeFile('gamelist.json', JSON.stringify(applist.filter(app => app.apptype === 'game')));
        resolve;
    });
}

exports.update = () => {
    console.log('Checking for new Steam apps');
	let data = JSON.parse(await httpsget("https://api.steampowered.com/ISteamApps/GetAppList/v2")).applist.apps.map(({ name, appid }) => {
		return { cleanname: name.replace(/[^\da-zA-Z]/g, '').toLowerCase(), name, appid, apptype: undefined, developers: undefined };
	});
	let applist = require("./applist.json");
	let newapps = [];
	let i = 1
	for (searchApp of data) {
		process.stdout.write(`Checking app ${i} of ${data.length}`);
		let listApp = applist.find(app => app.appid == searchApp.appid);
		if (listApp === undefined) newapps.push(searchApp);
		i++;
		process.stdout.write("\r\x1b[K");
	}
	console.log(`Found ${newapps.length} new apps`);
	i = 1;
	let rcount = 1;
	let errorApps = [];
	for (app of newapps) {
		process.stdout.write(`Downloading data for app ${i} of ${newapps.length}`);
		if (app.apptype === undefined) {
			try {
				let appdata = JSON.parse(await httpsget(`https://store.steampowered.com/api/appdetails/?appids=${app.appid}`))[app.appid.toString()];
				if (appdata.success) app.apptype = appdata.data.type, app.developers = appdata.developers;	
			} catch {
				errorApps.push(app)
			}
			rcount++;
		}
		if (rcount%10 == 0) await sleep(5000);		
		i++;
		process.stdout.write("\r\x1b[K");
	}
	i = 1;
	let failedApps = {names:[], items:[]};
	console.log(`Error downloading data for ${errorApps.length} apps`);
	for (app of errorApps) {
		process.stdout.write(`Retrying download for ${app.name} app ${i} of ${errorApps.length}`);
		try {
			let appdata = JSON.parse(await httpsget(`https://store.steampowered.com/api/appdetails/?appids=${app.appid}`))[app.appid.toString()];
			if (appdata.success) {
				app.apptype = appdata.data.type, app.developers = appdata.developers;
				newapps.find(newapp => newapp.appid == app.id) = app;
			}
		} catch {
			failedApps.names.push(app.name);
			failedApps.items.push(app);
		}
		i++;
		process.stdout.write("\r\x1b[K");
	}
	for (i = 0; i < newapps.length, i++) {
		for (app of failedApps.items) {
			if (newapp[i] === app) {
				newapps.splice(i,1);
				i--;
			}	
		}
	}
	applist.concat(newapps);
	if (failedApps.length > 0) console.log(`Failed to download data for: ${failedApps.names.toString()}`);
	await fs.promises.writeFile("applist.json", JSON.stringify(applist));
	await fs.promises.writeFile('gamelist.json', JSON.stringify(applist.filter(app => app.apptype === 'game')))
}