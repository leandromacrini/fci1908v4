var args = arguments[0] || {};

var that = this;

$.title.myParent = args.parent;

this.closed = true;
this.minTime = false;

this.close = function() {
	if(that.minTime){
		$.title.myParent.remove($.loadingPopup);
	}
	that.closed = true;
};

this.open = function(title) {
	$.title.text = title;
	
	that.closed = false;
	that.minTime = false;
	
	$.title.myParent.add($.loadingPopup);
	setTimeout(function(){
		that.minTime = true;
		if(that.closed){
			$.title.myParent.remove($.loadingPopup);
		}
	}, 500);
};