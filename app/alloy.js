// The contents of this file will be executed before any of
// your view controllers are ever executed, including the index.
// You have access to all functionality on the `Alloy` namespace.
//
// This is a great place to do any initialization for your app
// or create any global variables/functions that you'd like to
// make available throughout your app. You can easily make things
// accessible globally by attaching them to the `Alloy.Globals`
// object. For example:
//
// Alloy.Globals.someGlobalFunction = function(){};

_ = require('/lib/underscore')._;

Alloy.Globals.DEMO_MODE   = false;
Alloy.Globals.LOG_ENABLED = true;

Ti.include('/template/fonts.js');
Ti.include('/template/colors.js');
Ti.include('/template/constants.js');

Alloy.Globals.Fonts = commonFonts;
Alloy.Globals.Colors = commonColors;
Alloy.Globals.Constants = commonConstants;

Alloy.Managers = {};

Alloy.Managers.LogManager = Alloy.createController('business/LogManager');
Alloy.Managers.PushNotificationManager = Alloy.createController('business/PushNotificationManager');
Alloy.Managers.ConnectionManager = Alloy.createController('business/ConnectionManager');