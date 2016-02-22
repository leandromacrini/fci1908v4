//
//  ConnectionManager.js
//  Vettore.Mobile
//
//  Created by Leandro Macrini on 2013-06-01.
//  Copyright 2013 Leandro Macrini. All rights reserved.
//

var LogManager = Alloy.createController('business/LogManager');
//here we don't have the Alloy Globals instances

Ti.include('/lib/encoder.js');

_ = require('/lib/underscore')._;
var moment = require('lib/moment');
moment.lang('it');

var that = this;

/**
 * Make and call a HTTP Request with the given parameters
 *
 * @param {Object} parameters {URI, method, payload, loadingMsg, callback, errorCallback}
 */

var httpRequest = function(parameters) {

	if ( ! parameters ) throw "Invalid operation!";

	var popup = null;
	
	//create a loading popup if needed
	if (parameters.loadingMsg) {
		popup = Alloy.createController('LoadingPopup', {
			title : parameters.loadingMsg
		});
	}
	
	if (popup) popup.open();

	var client = Ti.Network.createHTTPClient({
		validatesSecureCertificate : false,
		autoRedirect : false,
		onload : function(e) {
			if (popup) popup.close();
			if (parameters.callback){
				if(parameters.blob) parameters.callback(e.source.responseData);
				else parameters.callback(e.source.responseText);
			}
		},
		onerror : function (e) {
			if (popup) popup.close();
			
			//return KO
			LogManager.error("Http Request Connection Error: " + e.error);
		
			if (parameters.errorCallback) {
				//call the error callback
				parameters.errorCallback("Errore di connessione con il server.");
			} else {
				//display a default error dialog
				Ti.UI.createAlertDialog({
					buttonNames : ['OK'],
					message : 'Errore di connessione con il server.',
					title : 'Errore!'
				}).show();
			}
		},
		timeout : 10000
	});
	
	//doesn't work at creaction time //HACK
	client.timeout = 10000;
	client.setTimeout(10000);
	client.autoEncodeUrl = false;
	client.setAutoEncodeUrl(false);
	

	//handle 'GET' method appending key/value to URI and removing payload
	if (parameters.method == 'GET' && parameters.payload) {
		var values = [];
		for (var key in payload) {
			values.push(key + '=' + payload[key]);
		}
		parameters.URI = parameters.URI + '?' + values.join('&');
		parameters.payload = null;
	}

	client.open(parameters.method, parameters.URI);
	
	if(parameters.headers && parameters.headers.length > 0){
		_.each(parameters.headers, function(header){
			client.setRequestHeader(header.name, header.value);
		});
	}
	
	client.send(parameters.payload);
};

/**
 * Load the news from the mobile site and parse the xhtml
 * @param {Function} callback
 */
var loadAllNews = function(callback) {
	
	LogManager.info('loadAllNews');
	
	var url = OS_ANDROID? 'https://fci1908-android-e6s5.articles-pub.v1.tccapis.com/' : 'https://fci1908-ios-ep98.articles-pub.v1.tccapis.com/';
	url+= '?start=0&step=499';
	var salt = OS_ANDROID? 'rbwh5u2te1' : 'uw9f6g5h4q';
	var uuid = Ti.Platform.createUUID();
	var secret = Ti.Utils.md5HexDigest( url + salt + uuid); 
	
	httpRequest({
		//URI : 'http://m.fcinter1908.it/ricerca/?start=0&limit=499',
		URI : url,
		method : "GET",
		errorCallback : function(error){
			Ti.App.fireEvent("fcinter:loadAllNewsError");
			if(callback) callback(false);
		},
		headers : 
		[
		 { name: 'X-TCC-Version', value:'1.1' },
		 { name: 'X-TCC-UUID', value: uuid },
		 { name: 'X-TCC-Secret', value: secret }
		],
		callback : function(data) {
			var doc = Ti.XML.parseString(data).documentElement;
			var articles = doc.getElementsByTagName('article');
			
			var sitenews = [];
			
			for(var i=0; i < articles.length; i++){
				var article = articles.item(i);
				
				var snews = { day : "" };
							
				// BEST EFFORT
				try { snews.image = article.getElementsByTagName('thumb2').item(0).textContent; } catch (e) { }
				try {
					snews.date = article.getElementsByTagName('date').item(0).textContent;
					snews.hour = moment(snews.date).format("HH:mm");
					snews.day = moment(snews.date).format("DD-MM-YYYY");
				} catch (e) { }
				try { snews.category = article.getElementsByTagName('section').item(0).textContent; } catch (e) { }
				try { snews.title = article.getElementsByTagName('title').item(0).textContent; } catch (e) { }
				try { snews.id = article.getElementsByTagName('id').item(0).textContent; } catch (e) { }
				try { snews.source = article.getElementsByTagName('source').length > 0? article.getElementsByTagName('source').item(0).textContent : null; } catch (e) { }

				sitenews.push(snews);
			}
			
			//category separation
			var groups = _(_(sitenews).groupBy('category')).toArray();
			var data = [];
			
			//first category is Hard Coded "Tutte le notizie" with all news
			data.push({
				name : "Tutte le notizie",
				news : sitenews,
				count : sitenews.length,
				listed : 0
			});
			
			_(groups).each(function(group){
				data.push({
					name : group[0].category, //the category of the first
					news : group,
					count : group.length,
					listed : 0
				});
				group = _(group).groupBy('day');
			});
			
			Ti.App.fireEvent("fcinter:loadAllNewsComplete");
			Ti.App.fireEvent('fcinter.newsUpdated', {data : data});
			if(callback) callback(data);
		}
	});
}; 

/**
 * Load the details of a single news
 * @param {Object} uri
 */
var loadSingleNews = function(news, callback) {
	var url = OS_ANDROID? 'https://fci1908-android-e6s5.articles-pub.v1.tccapis.com/' : 'https://fci1908-ios-ep98.articles-pub.v1.tccapis.com/';
	
	url+= '?id=' + news.id;
	
	var salt = OS_ANDROID? 'rbwh5u2te1' : 'uw9f6g5h4q';
	var uuid = Ti.Platform.createUUID();
	var secret = Ti.Utils.md5HexDigest( url + salt + uuid);
	
	httpRequest({
		//URI : 'http://m.fcinter1908.it/ricerca/?start=0&limit=499',
		URI : url,
		method : "GET",
		errorCallback : function(error){
			Ti.App.fireEvent("fcinter:loadAllNewsError");
			if(callback) callback(false);
		},
		headers : 
		[
		 { name: 'X-TCC-Version', value:'1.1' },
		 { name: 'X-TCC-UUID', value: uuid },
		 { name: 'X-TCC-Secret', value: secret }
		],
		errorCallback : function(error){
			if(callback) callback(false);
		},
		callback : function(data) {
			var doc = Ti.XML.parseString(data).documentElement;
			var article = doc.getElementsByTagName('article').item(0);
			
			news.detail = { };
			
			//best effort
			try { news.title = article.getElementsByTagName('title').item(0).textContent; } catch (e) { }
			try { news.url = article.getElementsByTagName('url').item(0).textContent; } catch (e) { }
			try { news.detail.author = article.getElementsByTagName('author').item(0).textContent; } catch (e) { }
			try { news.detail.fonte = article.getElementsByTagName('source').length > 0? article.getElementsByTagName('source').item(0).textContent : null; } catch (e) { }
			try { news.detail.summary = article.getElementsByTagName('summary').length > 0? article.getElementsByTagName('summary').item(0).textContent : null; } catch (e) { }
			try { news.detail.photo = article.getElementsByTagName('thumb1').item(0).textContent; } catch (e) { }
			try {
				news.detail.content = article.getElementsByTagName('text').item(0).textContent.trim();
			} catch (e) { }
			try {
				news.detail.images = [];
				 var imgs = /<img[^>]+src\s*=\s*"[^"]+"[^>]*>/gim.exec(article.getElementsByTagName('text').item(0).textContent);
				_.each(imgs, function(img){
					news.detail.images.push(/<img.*?src="([^"]+)"/.exec(img)[1]);
				});
			} catch (e) { }
			
			try{ news.detail.video = article.getElementsByTagName('video').length > 0? article.getElementsByTagName('video').item(0).getAttribute('url') : null; } catch (e) { }
			if(callback) callback(news);
		}
	});
};

var trackApplication = function(context){
	LogManager.info("trackApplication - context: " + context);
	
	var uri;
	if(OS_ANDROID) {
		if(context === "home")
			uri = "http://triboo01.webtrekk.net/365103633679429/wt?p=323,app.android.fcinter1908.home,0,0,0,0,0,0,0,0&cg1=AGGREGATO+MOBILE&cg2=ESTERNI+MOBILE&cg3=TUTTOMERCATOWEB+NTWK&cg4=FCInter1908+Android&cp2=LEONARDO+ADV+SPORT;LEONARDO+ADV+UOMINI";
		else if (context === "news")
			uri = "http://triboo01.webtrekk.net/365103633679429/wt?p=323,app.android.fcinter1908.news,0,0,0,0,0,0,0,0&cg1=AGGREGATO+MOBILE&cg2=ESTERNI+MOBILE&cg3=TUTTOMERCATOWEB+NTWK&cg4=FCInter1908+Android&cp2=LEONARDO+ADV+SPORT;LEONARDO+ADV+UOMINI";
		else if (context === "changecategory")
			uri = "http://triboo01.webtrekk.net/365103633679429/wt?p=323,app.android.fcinter1908.changecategory,0,0,0,0,0,0,0,0&cg1=AGGREGATO+MOBILE&cg2=ESTERNI+MOBILE&cg3=TUTTOMERCATOWEB+NTWK&cg4=FCInter1908+Android&cp2=LEONARDO+ADV+SPORT;LEONARDO+ADV+UOMINI";
	} else {
		if(context === "home")
			uri = "http://triboo01.webtrekk.net/365103633679429/wt?p=323,app.ios.fcinter1908.home,0,0,0,0,0,0,0,0&cg1=AGGREGATO+MOBILE&cg2=ESTERNI+MOBILE&cg3=TUTTOMERCATOWEB+NTWK&cg4=FCInter1908+iOS&cp2=LEONARDO+ADV+SPORT;LEONARDO+ADV+UOMINI";
		else if (context === "news")
			uri = "http://triboo01.webtrekk.net/365103633679429/wt?p=323,app.ios.fcinter1908.news,0,0,0,0,0,0,0,0&cg1=AGGREGATO+MOBILE&cg2=ESTERNI+MOBILE&cg3=TUTTOMERCATOWEB+NTWK&cg4=FCInter1908+iOS&cp2=LEONARDO+ADV+SPORT;LEONARDO+ADV+UOMINI";
		else if (context === "changecategory")
			uri = "http://triboo01.webtrekk.net/365103633679429/wt?p=323,app.ios.fcinter1908.changecategory,0,0,0,0,0,0,0,0&cg1=AGGREGATO+MOBILE&cg2=ESTERNI+MOBILE&cg3=TUTTOMERCATOWEB+NTWK&cg4=FCInter1908+iOS&cp2=LEONARDO+ADV+SPORT;LEONARDO+ADV+UOMINI";
	}
	try{
		httpRequest({
			URI : uri,
			method : "GET",
			errorCallback : function(error) { LogManager.error("trackApplication Error: " + error);}
		});
	} catch (ex) {
		LogManager.error("trackApplication catch Error: " + JSON.stringify(ex));
	}
	
};

var searchNews = function(value, data){
	var result = [];
	if(value && data) {
		for(var i = 1; i < data.length; i++){ //[0] is the all news category -> avoid redundant search
			if(!data[i].searched){ // if searched == true is a category from a search -> avoid redundant search 
				var news = data[i].news;
				for(var n = 0; news && n < news.length; n++){
					if(news[n].title && news[n].title.toLowerCase().indexOf(value.toLowerCase().trim()) > -1){
						result.push(news[n]); 
					}
				}
			}
		}
	}
	return {
		name : "Risultati ricerca",
		news : result,
		count : result.length,
		listed : 0,
		searched : true
	};
};

var lazyLoadImage = function(url, imageView, endCallback){
	httpRequest({
			URI : url,
			method : "GET",
			blob : true,
			callback : function(data) {
				try {
					imageView.image = data;
				} catch(ex) {
					Ti.API.error(ex.message);
				}
				if(endCallback)endCallback();
			},
			errorCallback : function(error) { LogManager.error("trackApplication Error: " + error);}
		});
};

this.lazyLoadImage = lazyLoadImage;
this.searchNews = searchNews;
this.httpRequest = httpRequest;
this.loadAllNews = loadAllNews;
this.loadSingleNews = loadSingleNews;
this.trackApplication = trackApplication;