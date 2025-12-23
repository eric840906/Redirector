// CODE ARCHAEOLOGY: MV3 Migration - Service Worker
// Reason: MV3 requires service workers instead of persistent background pages
// Original (MV2): Persistent background page with scripts array in manifest
// New (MV3): Single service worker file, must import dependencies

// Import redirect.js for Redirect class
importScripts('redirect.js', 'migration.js');

//This is the background script. It is responsible for actually redirecting requests,
//as well as monitoring changes in the redirects and the disabled status and reacting to them.
function log(msg, force) {
	if (log.enabled || force) {
		console.log('REDIRECTOR: ' + msg);
	}
}
log.enabled = false;
var enableNotifications=false;

// CODE ARCHAEOLOGY: MV3 Migration - Removed isDarkMode()
// Reason: Service workers don't have access to window.matchMedia()
// Original (MV2): function isDarkMode() { return window.matchMedia('(prefers-color-scheme: dark)').matches; }
// New (MV3): Rely on manifest theme_icons for automatic dark/light mode switching
var isFirefox = !!navigator.userAgent.match(/Firefox/i);

var storageArea = chrome.storage.local;
//Redirects partitioned by request type, so we have to run through
//the minimum number of redirects for each request.
var partitionedRedirects = {};

//Cache of urls that have just been redirected to. They will not be redirected again, to
//stop recursive redirects, and endless redirect chains.
//Key is url, value is timestamp of redirect.
var ignoreNextRequest = {

};

//url => { timestamp:ms, count:1...n};
var justRedirected = {

};
var redirectThreshold = 3;

// CODE ARCHAEOLOGY: MV3 Migration - Service Worker Lifecycle
// Reason: Service workers shut down after inactivity, must reload data on wake
// Original (MV2): Persistent background page, data always in memory
// New (MV3): Load from storage on each wake-up

/**
 * Ensure redirects are loaded from storage (service worker wake-up)
 * Called before checking redirects to handle service worker lifecycle
 */
async function ensureRedirectsLoaded() {
	// If already loaded (warm start), skip
	if (Object.keys(partitionedRedirects).length > 0) {
		return;
	}

	// Cold start - load from storage
	log('Service worker cold start, loading redirects from storage...');

	return new Promise((resolve) => {
		chrome.storage.local.get({
			redirects: [],
			disabled: false,
			logging: false,
			enableNotifications: false
		}, (obj) => {
			if (chrome.runtime.lastError) {
				console.error('Error loading redirects:', chrome.runtime.lastError);
				resolve();
				return;
			}

			log.enabled = obj.logging;
			enableNotifications = obj.enableNotifications;

			if (!obj.disabled && obj.redirects && obj.redirects.length > 0) {
				partitionedRedirects = createPartitionedRedirects(obj.redirects);
				log('Loaded ' + obj.redirects.length + ' redirects from storage');
			}

			resolve();
		});
	});
}

// CODE ARCHAEOLOGY: MV3 Migration - Automatic Migration
// Reason: Detect MV2→MV3 upgrade and run migration automatically
// Original (MV2): No migration needed
// New (MV3): Check on install/update, create backup, preserve data

/**
 * Handle extension installation/update
 * Runs migration on first MV3 launch
 */
chrome.runtime.onInstalled.addListener(async (details) => {
	log('Extension installed/updated: ' + details.reason);

	if (details.reason === 'update') {
		// Check if migration needed
		try {
			const migrationDone = await checkMigrationDone();
			if (!migrationDone) {
				log('Running MV2→MV3 migration...');
				const result = await runMigration();
				log('Migration completed:', JSON.stringify(result));
			}
		} catch (error) {
			console.error('Migration failed:', error);
			// Don't block extension - it will still work with existing data
		}
	}

	// Initialize
	updateIcon();
});

function setIcon(image) {
	var data = { 
		path: {}
	};

	for (let nr of [16,19,32,38,48,64,128]) {
		data.path[nr] = `images/${image}-${nr}.png`;
	}

	// CODE ARCHAEOLOGY: MV3 Migration - API Rename
	// Original (MV2): chrome.browserAction
	// New (MV3): chrome.action
	chrome.action.setIcon(data, function() {
		var err = chrome.runtime.lastError;
		if (err) {
			//If not checked we will get unchecked errors in the background page console...
			log('Error in SetIcon: ' + err.message);
		}
	});		
}

//This is the actual function that gets called for each request and must
//decide whether or not we want to redirect.
// CODE ARCHAEOLOGY: MV3 Migration - Async Redirect with tabs.update
// Original (MV2): Synchronous, returns {redirectUrl: ...}
// New (MV3): Async, uses chrome.tabs.update() for redirect
async function checkRedirects(details) {
	// Ensure redirects loaded (service worker wake-up)
	await ensureRedirectsLoaded();

	//We only allow GET request to be redirected, don't want to accidentally redirect
	//sensitive POST parameters
	if (details.method != 'GET') {
		return;
	}
	log('Checking: ' + details.type + ': ' + details.url);

	var list = partitionedRedirects[details.type];
	if (!list) {
		log('No list for type: ' + details.type);
		return;
	}

	var timestamp = ignoreNextRequest[details.url];
	if (timestamp) {
		log('Ignoring ' + details.url + ', was just redirected ' + (new Date().getTime()-timestamp) + 'ms ago');
		delete ignoreNextRequest[details.url];
		return;
	}

	
	for (var i = 0; i < list.length; i++) {
		var r = list[i];
		var result = r.getMatch(details.url);

		if (result.isMatch) {

			//Check if we're stuck in a loop where we keep redirecting this, in that
			//case ignore!
			var data = justRedirected[details.url];

			var threshold = 3000;
			if(!data || ((new Date().getTime()-data.timestamp) > threshold)) { //Obsolete after 3 seconds
				justRedirected[details.url] = { timestamp : new Date().getTime(), count: 1};
			} else {
				data.count++;
				justRedirected[details.url] = data;
				if (data.count >= redirectThreshold) {
					log('Ignoring ' + details.url + ' because we have redirected it ' + data.count + ' times in the last ' + threshold + 'ms');
					return;
				} 
			}


			log('Redirecting ' + details.url + ' ===> ' + result.redirectTo + ', type: ' + details.type + ', pattern: ' + r.includePattern + ' which is in Rule : ' + r.description);
			if(enableNotifications){
				sendNotifications(r, details.url, result.redirectTo);
			}
			ignoreNextRequest[result.redirectTo] = new Date().getTime();

			// CODE ARCHAEOLOGY: MV3 Migration - tabs.update for redirect
			// Original (MV2): return { redirectUrl: result.redirectTo };
			// New (MV3): chrome.tabs.update() for async redirect
			// Reason: MV3 removed blocking webRequest, must use tabs API
			chrome.tabs.update(details.tabId, {url: result.redirectTo});
			return;
		}
	}

	// No redirect matched
	return;
}

//Monitor changes in data, and setup everything again.
//This could probably be optimized to not do everything on every change
//but why bother?
function monitorChanges(changes, namespace) {
	if (changes.disabled) {
		updateIcon();

		if (changes.disabled.newValue == true) {
			log('Disabling Redirector, removing listener');
			chrome.webRequest.onBeforeRequest.removeListener(checkRedirects);
			chrome.webNavigation.onHistoryStateUpdated.removeListener(checkHistoryStateRedirects);
		} else {
			log('Enabling Redirector, setting up listener');
			setUpRedirectListener();
		}
	}

	if (changes.redirects) {
		log('Redirects have changed, setting up listener again');
		setUpRedirectListener();
    }

    if (changes.logging) {
		log.enabled = changes.logging.newValue;
		log('Logging settings have changed to ' + changes.logging.newValue, true); //Always want this to be logged...
	}
	if (changes.enableNotifications){
		log('notifications setting changed to ' + changes.enableNotifications.newValue);
		enableNotifications = changes.enableNotifications.newValue;
	}
}
chrome.storage.onChanged.addListener(monitorChanges);

//Creates a filter to pass to the listener so we don't have to run through
//all the redirects for all the request types we don't have any redirects for anyway.
function createFilter(redirects) {
	var types = [];
	for (var i = 0; i < redirects.length; i++) {
		redirects[i].appliesTo.forEach(function(type) { 
			// Added this condition below as part of fix for issue 115 https://github.com/einaregilsson/Redirector/issues/115
			// Firefox considers responsive web images request as imageset. Chrome doesn't.
			// Chrome throws an error for imageset type, so let's add to 'types' only for the values that chrome or firefox supports
			if(chrome.webRequest.ResourceType[type.toUpperCase()]!== undefined){
			if (types.indexOf(type) == -1) {
				types.push(type);
			}
		}
		});
	}
	types.sort();

	return {
		urls: ["https://*/*", "http://*/*"],
		types : types
	};
}

function createPartitionedRedirects(redirects) {
	var partitioned = {};

	for (var i = 0; i < redirects.length; i++) {
		var redirect = new Redirect(redirects[i]);
		redirect.compile();
		for (var j=0; j<redirect.appliesTo.length;j++) {
			var requestType = redirect.appliesTo[j];
			if (partitioned[requestType]) {
				partitioned[requestType].push(redirect); 
			} else {
				partitioned[requestType] = [redirect];
			}
		}
	}
	return partitioned;	
}

//Sets up the listener, partitions the redirects, creates the appropriate filters etc.
function setUpRedirectListener() {

	chrome.webRequest.onBeforeRequest.removeListener(checkRedirects); //Unsubscribe first, in case there are changes...
	chrome.webNavigation.onHistoryStateUpdated.removeListener(checkHistoryStateRedirects);

	storageArea.get({redirects:[]}, function(obj) {
		var redirects = obj.redirects;
		if (redirects.length == 0) {
			log('No redirects defined, not setting up listener');
			return;
		}

		partitionedRedirects = createPartitionedRedirects(redirects);
		var filter = createFilter(redirects);

		// CODE ARCHAEOLOGY: MV3 Migration - Non-blocking webRequest
		// Original (MV2): chrome.webRequest with ["blocking"], return {redirectUrl: ...}
		// New (MV3): Non-blocking listener, use chrome.tabs.update() for redirect
		// Reason: MV3 removed blocking webRequest capability
		log('Setting filter for listener: ' + JSON.stringify(filter));
		chrome.webRequest.onBeforeRequest.addListener(checkRedirects, filter);

		if (partitionedRedirects.history) {
			log('Adding HistoryState Listener');

			let filter = { url : []};
			for (let r of partitionedRedirects.history) {
				filter.url.push({urlMatches: r._preparePattern(r.includePattern)});
			}
			chrome.webNavigation.onHistoryStateUpdated.addListener(checkHistoryStateRedirects, filter);
		}
	});
}

//Redirect urls on places like Facebook and Twitter who don't do real reloads, only do ajax updates and push a new url to the address bar...
// CODE ARCHAEOLOGY: MV3 Migration - Async History State Redirects
// Original (MV2): checkRedirects returned {redirectUrl: ...}, manually called tabs.update
// New (MV3): checkRedirects handles redirect internally, just await it
async function checkHistoryStateRedirects(ev) {
	ev.type = 'history';
	ev.method = 'GET';
	await checkRedirects(ev);
}

//Sets on/off badge, and for Chrome updates dark/light mode icon
function updateIcon() {
	chrome.storage.local.get({disabled:false}, function(obj) {

		//Do this here so even in Chrome we get the icon not too long after an dark/light mode switch...
		if (!isFirefox) {
			// CODE ARCHAEOLOGY: MV3 Migration - Default to light theme
			// Reason: Service workers can't access window.matchMedia()
			// Original (MV2): if (isDarkMode()) setIcon('icon-dark-theme') else setIcon('icon-light-theme')
			// New (MV3): manifest theme_icons handles auto dark/light switching
			setIcon('icon-light-theme');
		}

		if (obj.disabled) {
			chrome.action.setBadgeText({text: 'off'});
			chrome.action.setBadgeBackgroundColor({color: '#fc5953'});
			if (chrome.action.setBadgeTextColor) { //Not supported in Chrome
				chrome.action.setBadgeTextColor({color: '#fafafa'});
			}
		} else {
			chrome.action.setBadgeText({text: 'on'});
			chrome.action.setBadgeBackgroundColor({color: '#35b44a'});
			if (chrome.action.setBadgeTextColor) { //Not supported in Chrome
				chrome.action.setBadgeTextColor({color: '#fafafa'});
			}
		}
	});	
}


//Firefox doesn't allow the "content script" which is actually privileged
//to access the objects it gets from chrome.storage directly, so we
//proxy it through here.
chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		log('Received background message: ' + JSON.stringify(request));
		if (request.type == 'get-redirects') {
			log('Getting redirects from storage');
			storageArea.get({
				redirects: []
			}, function (obj) {
				log('Got redirects from storage: ' + JSON.stringify(obj));
				sendResponse(obj);
				log('Sent redirects to content page');
			});
		} else if (request.type == 'save-redirects') {
			console.log('Saving redirects, count=' + request.redirects.length);
			delete request.type;
			storageArea.set(request, function (a) {
				if(chrome.runtime.lastError) {
				 if(chrome.runtime.lastError.message.indexOf("QUOTA_BYTES_PER_ITEM quota exceeded")>-1){
					log("Redirects failed to save as size of redirects larger than allowed limit per item by Sync");
					sendResponse({
						message: "Redirects failed to save as size of redirects larger than what's allowed by Sync. Refer Help Page"
					});
				 }
				} else {
				log('Finished saving redirects to storage');
				sendResponse({
					message: "Redirects saved"
				});
			}
			});
		} else if (request.type == 'update-icon') {
			updateIcon();
		} else if (request.type == 'toggle-sync') {
			// Notes on Toggle Sync feature here https://github.com/einaregilsson/Redirector/issues/86#issuecomment-389943854
			// This provides for feature request - issue 86
			delete request.type;
			log('toggling sync to ' + request.isSyncEnabled);
			// Setting for Sync enabled or not, resides in Local.
			chrome.storage.local.set({
					isSyncEnabled: request.isSyncEnabled
				},
				function () {
					if (request.isSyncEnabled) {
						storageArea = chrome.storage.sync;
						log('storageArea size for sync is 5 MB but one object (redirects) is allowed to hold only ' + storageArea.QUOTA_BYTES_PER_ITEM  / 1000000 + ' MB, that is .. ' + storageArea.QUOTA_BYTES_PER_ITEM  + " bytes");
						chrome.storage.local.getBytesInUse("redirects",
							function (size) {
								log("size of redirects is " + size + " bytes");
								if (size > storageArea.QUOTA_BYTES_PER_ITEM) {
									log("size of redirects " + size + " is greater than allowed for Sync which is " + storageArea.QUOTA_BYTES_PER_ITEM);
									// Setting storageArea back to Local.
									storageArea = chrome.storage.local; 
									sendResponse({
										message: "Sync Not Possible - size of Redirects larger than what's allowed by Sync. Refer Help page"
									});
								} else {
									chrome.storage.local.get({
										redirects: []
									}, function (obj) {
										//check if at least one rule is there.
										if (obj.redirects.length>0) {
											chrome.storage.sync.set(obj, function (a) {
												log('redirects moved from Local to Sync Storage Area');
												//Remove Redirects from Local storage
												chrome.storage.local.remove("redirects");
												// Call setupRedirectListener to setup the redirects 
												setUpRedirectListener();
												sendResponse({
													message: "sync-enabled"
												});
											});
										} else {
											log('No redirects are setup currently in Local, just enabling Sync');
											sendResponse({
												message: "sync-enabled"
											});
										}
									});
								}
							});
						} else {
						storageArea = chrome.storage.local;
						log('storageArea size for local is ' + storageArea.QUOTA_BYTES / 1000000 + ' MB, that is .. ' + storageArea.QUOTA_BYTES + " bytes");
						chrome.storage.sync.get({
							redirects: []
						}, function (obj) {
							if (obj.redirects.length>0) {
								chrome.storage.local.set(obj, function (a) {
									log('redirects moved from Sync to Local Storage Area');
									//Remove Redirects from sync storage
									chrome.storage.sync.remove("redirects");
									// Call setupRedirectListener to setup the redirects 
									setUpRedirectListener();
									sendResponse({
										message: "sync-disabled"
									});
								});
							} else {
								sendResponse({
									message: "sync-disabled"
								});
							}
						});
					}
				});

		} else {
			log('Unexpected message: ' + JSON.stringify(request));
			return false;
		}

		return true; //This tells the browser to keep sendResponse alive because
		//we're sending the response asynchronously.
	}
);


//First time setup
updateIcon();

chrome.storage.local.get({logging:false}, function(obj) {
	log.enabled = obj.logging;
});

chrome.storage.local.get({
	isSyncEnabled: false
}, function (obj) {
	if (obj.isSyncEnabled) {
		storageArea = chrome.storage.sync;
	} else {
		storageArea = chrome.storage.local;
	}
	// Now we know which storageArea to use, call setupInitial function
	setupInitial(); 
});

//wrapped the below inside a function so that we can call this once we know the value of storageArea from above. 

function setupInitial() {
	chrome.storage.local.get({enableNotifications:false},function(obj){
		enableNotifications = obj.enableNotifications;
	});

	chrome.storage.local.get({
		disabled: false
	}, function (obj) {
		if (!obj.disabled) {
			setUpRedirectListener();
		} else {
			log('Redirector is disabled');
		}
	});
}
log('Redirector starting up...');


// Below is a feature request by an user who wished to see visual indication for an Redirect rule being applied on URL 
// https://github.com/einaregilsson/Redirector/issues/72
// By default, we will have it as false. If user wishes to enable it from settings page, we can make it true until user disables it (or browser is restarted)

// Upon browser startup, just set enableNotifications to false.
// Listen to a message from Settings page to change this to true.
function sendNotifications(redirect, originalUrl, redirectedUrl ){
	//var message = "Applied rule : " + redirect.description + " and redirected original page " + originalUrl + " to " + redirectedUrl;
	log("Showing redirect success notification");
	//Firefox and other browsers does not yet support "list" type notification like in Chrome.
	// Console.log(JSON.stringify(chrome.notifications)); -- This will still show "list" as one option but it just won't work as it's not implemented by Firefox yet
	// Can't check if "chrome" typeof either, as Firefox supports both chrome and browser namespace.
	// So let's use useragent. 
	// Opera UA has both chrome and OPR. So check against that ( Only chrome which supports list) - other browsers to get BASIC type notifications.

	// CODE ARCHAEOLOGY: MV3 Migration - Default to light theme icon
	// Reason: Service workers can't access window.matchMedia()
	// Original (MV2): let icon = isDarkMode() ? "images/icon-dark-theme-48.png": "images/icon-light-theme-48.png";
	// New (MV3): Default to light theme (manifest theme_icons handles switching)
	let icon = "images/icon-light-theme-48.png";

	if(navigator.userAgent.toLowerCase().indexOf("chrome") > -1 && navigator.userAgent.toLowerCase().indexOf("opr")<0){
		
		var items = [{title:"Original page: ", message: originalUrl},{title:"Redirected to: ",message: redirectedUrl}];
		var head = "Redirector - Applied rule : " + redirect.description;
		chrome.notifications.create({
			type : "list",
			items : items,
			title : head,
			message : head,
			iconUrl : icon
		  });	
		}
	else{
		var message = "Applied rule : " + redirect.description + " and redirected original page " + originalUrl + " to " + redirectedUrl;

		chrome.notifications.create({
        	type : "basic",
        	title : "Redirector",
			message : message,
			iconUrl : icon
		});
	}
}

chrome.runtime.onStartup.addListener(handleStartup);
function handleStartup(){
	enableNotifications=false;
	chrome.storage.local.set({
		enableNotifications: false
	});

	updateIcon(); //To set dark/light icon...

	// CODE ARCHAEOLOGY: MV3 Migration - Removed dark mode listener
	// Reason: Service workers can't access window.matchMedia()
	// Original (MV2): darkModeMql = window.matchMedia('(prefers-color-scheme: dark)'); darkModeMql.onchange = updateIcon;
	// New (MV3): Removed - manifest theme_icons handles automatic dark/light mode switching
}