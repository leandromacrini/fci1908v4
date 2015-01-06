//
//  PushNotificationManager.js
//  Vettore.Mobile
//
//  Created by Leandro Macrini on 2013-05-24.
//  Copyright 2013 Leandro Macrini. All rights reserved.
//

var LogManager = Alloy.createController('business/LogManager');
//here we don't have the Alloy Globals instances

var that = this;

var currentPushNotification = null;

function registerForPushNotification() {

	if (!Alloy.Globals.DEMO_MODE) {
		if (Titanium.Network.online) {
			if (OS_ANDROID) {
				LogManager.info('Register to Android Push Notification');
				androidRegistration();
			} else {
				LogManager.info('Register to iOS Push Notification');
				iOsRegistration();
			}
		} else {
			errorCallback({
				'error' : 'NETWORK_ERROR'
			});
		}
	}
};

var errorCallback = function(e) {
	LogManager.error(String.format("Error during push notification registration: %s", e.error));
	var message;
	if (e.error == 'ACCOUNT_MISSING') {
		message = 'Nessun Google account trovato, configurarne uno per ricevere le notifiche push.';
		Titanium.UI.createAlertDialog({
			title : 'Attenzione',
			message : message,
			buttonNames : ['OK']
		}).show();
	}

};

var androidRegistration = function() {
	gcm = require('com.activate.gcm');
	try {
		gcm.registerC2dm({
			success : function(e) {
				var deviceToken = e.registrationId;
				LogManager.info(String.format("Push Notification registration success with ID: %s", e.registrationId));
				
				//invio il DeviceToken al server del Pumez! :D
				var UserManager = Alloy.createController('business/UserManager');
				UserManager.registerDeviceToken(deviceToken);
			},
			error : errorCallback,
			callback : function(e) {
				LogManager.info(String.format("Push Message reveived: %s", e.data.message));

				var intent = Ti.Android.createIntent({
					action : Ti.Android.ACTION_MAIN,
					flags : Ti.Android.FLAG_ACTIVITY_NEW_TASK | Ti.Android.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED,
					className : 'it.vettorerinascimento.vettoremobile.VettoreMobileActivity',
					packageName : 'it.vettorerinascimento.vettoremobile'
				});
				intent.addCategory(Titanium.Android.CATEGORY_LAUNCHER);

				var pending = Ti.Android.createPendingIntent({
					activity : Ti.Android.currentActivity,
					intent : intent,
					type : Ti.Android.PENDING_INTENT_FOR_ACTIVITY,
					flags : Titanium.Android.FLAG_ACTIVITY_NEW_TASK
				});
				var notification = Ti.Android.createNotification({
					contentIntent : pending,
					contentTitle : e.data.title,
					contentText : e.data.message,
					tickerText : e.data.ticker,
					icon : Ti.App.Android.R.drawable.appicon
				});
				Ti.Android.NotificationManager.notify(1, notification);
				Ti.API.info(JSON.stringify(e.data));
				
				Titanium.UI.createAlertDialog({
					title : 'Notifica',
					message : e.data.message,
					buttonNames : ['OK']
				}).show();
			}
		});
	} catch(e) {
		errorCallback({
			'error' : 'INTERNAL_ERROR'
		});
	}
};

var iOsRegistration = function() {
	Ti.Network.registerForPushNotifications({
		types : [Ti.Network.NOTIFICATION_TYPE_BADGE, Ti.Network.NOTIFICATION_TYPE_ALERT, Ti.Network.NOTIFICATION_TYPE_SOUND],
		success : function(e) {
			var deviceToken = e.deviceToken;
			LogManager.info("iOS Registration success with ID:" + e.deviceToken);
			
			//invio il DeviceToken al server del Pumez! :D
			var UserManager = Alloy.createController('business/UserManager');
			UserManager.registerDeviceToken(deviceToken);
		},
		error : errorCallback,
		callback : function(e) {
			Ti.UI.iPhone.appBadge = 0;
			LogManager.info("Message reveived: " + e.data.alert);
			
			Titanium.UI.createAlertDialog({
				title : 'Notifica',
				message : e.data.alert,
				buttonNames : ['OK']
			}).show();
		}
	});
};

this.registerForPushNotification = registerForPushNotification;
