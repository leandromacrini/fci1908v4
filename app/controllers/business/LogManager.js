
/**
 * Log a Info 
 * 
 * @param {String} message
 */
function info(message){
	if( ! Alloy.Globals.LOG_ENABLED) return;
	
	if(message !== "" && message != null) Ti.API.info(message);
};

/**
 * Log a Info 
 * 
 * @param {String} message
 */
function warning(message){
	if( ! Alloy.Globals.LOG_ENABLED) return;
	
	if(message !== "" && message != null) Ti.API.warn(message);
};

/**
 * Log a Info 
 * 
 * @param {String} message
 */
function error(message){
	if( ! Alloy.Globals.LOG_ENABLED) return;
	
	if(message !== "" && message != null) Ti.API.error(message);
};

/**
 * Copy passed text into the clipboard and notify the user
 * 
 * @param {String} text
 */
function clipboardAndAlert(text) {
	Ti.UI.Clipboard.clearText();
	Ti.UI.Clipboard.setText(text.toString());

	if(OS_ANDROID) {
		Alloy.createController("NotificationPopup", {message : "Il valore è stato copiato negli appunti"});
	} else {
		Ti.UI.createAlertDialog({
			message : "Il valore è stato copiato negli appunti",
			buttonNames : ["OK"]  
		}).show();
	}
};

/**
 * Print any to info log 
 * 
 * @param {Object} any
 */
function json(any){
	info(JSON.stringify(any));
}

//create methods
this.info    = info;
this.warning = warning;
this.error   = error;
this.json    = json;

this.clipboardAndAlert = clipboardAndAlert;