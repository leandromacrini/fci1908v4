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
Ti.include('/lib/articoli.js');

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
	
	if(parameters.username){
		client.username = parameters.username;
	}
	if(parameters.password){
		client.password = parameters.password;
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
	
	var url = 'http://xml2.gazzanet.gazzettaobjects.it/fragments/www.gazzanetwork.it/j/json/affiliati/affiliato45.json';
	
	httpRequest({
		URI : url,
		method : "GET",
		errorCallback : function(error){
			Ti.App.fireEvent("fcinter:loadAllNewsError");
			if(callback) callback(false);
		},
		username : 'gazzanet',
		password: 'g@znet!2015',
		callback : function(data) {
			var articles = JSON.parse(data).documentiAffiliato;
			
			var sitenews = [];
			
			for(var i=0; i < articles.length; i++){
				var article = articles[i];
				
				var snews = { day : "" };							
				
				// BEST EFFORT
				snews.image = 'http://images2.gazzanet.gazzettaobjects.it' + article.thumbImage;
				
				snews.image = snews.image.replace('.jpeg','-80x80.jpeg').replace('.jpg','-80x80.jpg');
				try {
					snews.date = article.data;
					snews.hour = moment(snews.date).format("HH:mm");
					snews.day = moment(snews.date).format("DD-MM-YYYY");
				} catch (e) { }
				snews.category = (article.categoria || "").replace("#", " ");
				snews.title = article.titolo;
				snews.id = article.idPost;
				snews.source = article.autore;

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
	var url = 'http://xml2.gazzanet.gazzettaobjects.it/fragments/www.gazzanetwork.it/w/articles/00/45/';
	
	// padleft id
	var padding = "00000000";
	var paddedId = padding.substring(0, padding.length - news.id.length) + news.id;
	
	url+= paddedId[0] + paddedId[1] + '/' + paddedId[2] + paddedId[3] + '/' + paddedId[4] + paddedId[5] + '/' + paddedId[6] + paddedId[7] + '/articolo.json';
	
	LogManager.info("loadSingleNews URL: " + url);
	
	httpRequest({
		URI : url,
		method : "GET",
		username : 'gazzanet',
		password: 'g@znet!2015',
		errorCallback : function(error){
			Ti.App.fireEvent("fcinter:loadAllNewsError");
			if(callback) callback(false);
		},
		errorCallback : function(error){
			if(callback) callback(false);
		},
		callback : function(data) {
			var article = JSON.parse(data);
			
			news.detail = { };
			
			//best effort
			news.title = article.name;
			news.url = article.url;
			news.detail.author = article.author.display_name;
			news.detail.photo = article.url_mainimage;
			news.detail.photo = news.detail.photo.replace('http://stg.fcinter1908.it','http://images2.gazzanet.gazzettaobjects.it');
			try {
				news.detail.content = Encoder.htmlDecode(article.contentarticle).replace('<br>','\n');
				
				news.detail.content = news.detail.content.replace(/<style[^>]*>[^]+?<\/style>/g, "");
				news.detail.content = news.detail.content.replace(/<script[^>]*>[^]+?<\/script>/g, "");
				news.detail.content = news.detail.content.replace(/<iframe[^>]*>[^]+?<\/iframe>/g, "");
				
			} catch (e) { }
			try {
				news.detail.images = [];
				 var imgs = /<img[^>]+src\s*=\s*"[^"]+"[^>]*>/gim.exec(news.detail.content);
				_.each(imgs, function(img){
					news.detail.images.push(/<img.*?src="([^"]+)"/.exec(img)[1].replace('http://stg.fcinter1908.it','http://images2.gazzanet.gazzettaobjects.it'));
				});
			} catch (e) { }
			
			try{ news.detail.video = article.getElementsByTagName('video').length > 0? article.getElementsByTagName('video').item(0).getAttribute('url') : null; } catch (e) { }
			
			LogManager.info(news.id);
			LogManager.info(news.image);
			LogManager.info(news.detail.photo);
			LogManager.info(news.detail.content);
			
			if(callback) callback(news);
		}
	});
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
			//username : 'gazzanet',
			//password: 'g@znet!2015',
			callback : function(data) {
				try {
					imageView.image = data;
				} catch(ex) {
					Ti.API.error(ex.message);
				}
				if(endCallback)endCallback();
			},
			errorCallback : function(error) { LogManager.error("lazyLoadImage Error: " + error);}
		});
};

this.lazyLoadImage = lazyLoadImage;
this.searchNews = searchNews;
this.httpRequest = httpRequest;
this.loadAllNews = loadAllNews;
this.loadSingleNews = loadSingleNews;