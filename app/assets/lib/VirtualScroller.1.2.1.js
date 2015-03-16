/*
 * VirtualScroller v1.2.1
 *
 * An improved (and generic) version of the infinite scrolling view: https://gist.github.com/810171
 *
 * Features:
 *
 * + Finite and infinite scrolling
 * + New views are generated on demand via a callback: no hardcoding
 * + Ability to specify starting position
 * + Only five views are ever loaded into memory at the same time, no matter how many
 *   you actually have
 * + Customizable: specify the base ScrollableView and container properties
 * + Glitch free scrolling
 *
 * Check out the BitBucket repository (of the same name) for usage information.
 *
 * Copyright (c) 2012-2013 Chris Laplante (MostThingsWeb)
 * Licensed under MIT license (see license file in source package)
 *
 * mostthingsweb.com
 *
 */

/**
 * Create and return a VirtualScroller instance.
 * @param options An object containing the options for the instance. See documentation at BitBucket for details and supported options.
 *
 */
function VirtualScroller(options) {
    // 'merge' from deepmerge project (https://github.com/nrf110/deepmerge)
    function merge(b,c){var e=Array.isArray(c),d=e?[]:{};e?(b=b||[],d=d.concat(b),c.forEach(function(a,c){"object"===typeof a?d[c]=merge(b[c],a):-1===b.indexOf(a)&&d.push(a)})):(b&&"object"===typeof b&&Object.keys(b).forEach(function(a){d[a]=b[a]}),Object.keys(c).forEach(function(a){d[a]="object"===typeof c[a]&&c[a]?b[a]?merge(b[a],c[a]):c[a]:c[a]}));return d}

    // Set default options
    options = merge({
        start: 0,
        touch: true,
        autoFocus: false,
        scrollerDef: {
            showPagingControl: false
        },
        containerDef: {
            backgroundColor: 'white',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        }
    }, options);

    function missing(obj) {
        return (obj === undefined || obj === null);
    }

    // Verify that required arguments exist
    if (missing(options.start) || missing(options.getView)) {
        return;
    }

    // Make sure start is a number
    if ((typeof options.start) !== "number") {
        options.start = parseInt(options.start, 10);
    }

    if (options.start < 0) {
        return null;
    }

    // Determine if we are using infinite or finite scrolling
    options.infinite = missing(options.itemCount);
    Ti.API.info('Items count: ' + options.itemCount);

    // Start can't be greater than 1 minus number of elements. itemCount must be at least 1.
    if (!options.infinite && (options.start > options.itemCount - 1 || options.itemCount < 1)) {
        return null;
    }

    var scrollable = Ti.UI.createScrollableView(options.scrollerDef);
    var pageCount = options.infinite ? 5 : options.itemCount;

    function getScrollEndHandlerName() {
        // In version 3.X of Titanium, scrollEnd is deprecated and is replaced by scrollend (all lowercase)
        return missing(scrollable.scrollend) ? "scrollend" : "scrollEnd";
    }

    // Create the containers
    var containers = [];
    scrollable.views = [];
    for (var i = 0; i < pageCount; i++) {
        containers.push(Ti.UI.createView(options.containerDef));
        if(!options.infinite){
        	containers[i].vIndex = i;
        }
        containers[i].add(Ti.UI.createLabel({
        	 text : "Caricamento dettagli in corso ..."
        }));
        
        /*scrollable.views.push(containers[i]);*/
    }
    scrollable.views = containers;

    function emptyView(container) {
        // Empty out any children
        if (container.children) {
            for (var c = container.children.length - 1; c >= 0; c--) {
                container.children[c] = null;
                container.remove(container.children[c]);
            }
        }
        container.loaded = false;
    }

    // Function to load the view with the specified virtual index into the specified container,
    // replacing all existing views in the container
    function loadView(container, vIndex) {
    	if(container.loaded) return;
        emptyView(container);

        // Remember the virtual index this container holds
        container.vIndex = vIndex;
        container.add(options.getView(vIndex));
        container.loaded = true;
    }

    function getPageFromIndex(vIndex) {
        if (options.infinite) {
            // First two pages
            if (vIndex < 2) {
                return vIndex;
            }

            // Last two pages (for non-infinite configurations)
            if (!options.infinite) {
                if (vIndex === lastVirtualIndex) {
                    return 4;
                } else if (vIndex === lastVirtualIndex - 1) {
                    return 3;
                }
            }

            // Somewhere in the middle
            return 2;
        } else {
            return vIndex;
        }
    }

    // Zero-based index representing our location relative to the complete set of views
    var currentVirtualIndex = options.start;

    var scrollEndListener = null;

    // Only need the fancy scroll handling if there will be more than five items
    if (options.infinite) {
        var lastVirtualIndex = options.itemCount - 1;

        // Build initial views
        var initialState = [];
        if (options.start <= 2) {
            // Page 0, 1, or 2 is active
            initialState = [0, 1, 2, 3, 4];
        } else if (!options.infinite && options.start >= lastVirtualIndex - 2) {
            // Last element active
            initialState = [options.start - 4, options.start - 3, options.start - 2, options.start - 1, options.start];
        } else {
            // Somewhere in the middle is active
            initialState = [options.start - 2, options.start - 1, options.start, options.start + 1, options.start + 2];
        }

        for (var j = 0; j < 5; j++) {
            loadView(containers[j], initialState[j]);
        }

        initialState = null;

        // The virtual index of the last page that was active
        var previousVirtualIndex = currentVirtualIndex;

        scrollEndListener = function (e) {
        	if(!e.currentPage) return;
        	
            var currentPage = e.currentPage;
            currentVirtualIndex = containers[currentPage].vIndex;

			//alert observers
			if(options.pageChanged) options.pageChanged(currentVirtualIndex);

            // Determine scroll direction
            var left;
            if (previousVirtualIndex > currentVirtualIndex) {
                left = true;
            } else if (previousVirtualIndex < currentVirtualIndex) {
                left = false;
            } else {
                // We didn't move
                return;
            }

            // How many pages were scrolled?
            var numScrolled = Math.abs(previousVirtualIndex - currentVirtualIndex);

            // What page will the scrollable need to be on?
            var targetPage = getPageFromIndex(currentVirtualIndex);

            // Do we need to move any pages around?
            if (targetPage !== currentPage) {
                for (var i = 0; i < numScrolled; i++) {
                    if (left) {
                        // Pop a view off the end of the collection and move it to the front
                        containers.unshift(containers.pop());
                        // Update virtual index and load new view
                        containers[0].vIndex = containers[1].vIndex - 1;
                        loadView(containers[0], containers[0].vIndex);
                    } else {
                        // Shift a view off the beginning of the collection and move it to the end
                        containers.push(containers.shift());
                        // Update virtual index and load new view
                        containers[4].vIndex = containers[3].vIndex + 1;
                        loadView(containers[4], containers[4].vIndex);
                    }
                }
            }

            previousVirtualIndex = currentVirtualIndex;
            scrollable.views = containers;
            scrollable.currentPage = targetPage;
        };
    } else {
    	//load current view
        if(currentVirtualIndex > 0) loadView(containers[currentVirtualIndex-1], currentVirtualIndex-1);
    	loadView(containers[currentVirtualIndex], currentVirtualIndex);
    	if(currentVirtualIndex < pageCount-1) loadView(containers[currentVirtualIndex+1], currentVirtualIndex+1);
        
        scrollEndListener = function (e) {
        	var currentPage = e.currentPage;
            currentVirtualIndex = containers[currentPage].vIndex;

			//alert observers
			if(options.pageChanged) options.pageChanged(currentVirtualIndex);
			
        	//load current and sorrounding views
        	if(currentVirtualIndex > 0) loadView(containers[currentVirtualIndex-1], currentVirtualIndex-1);
        	loadView(containers[currentVirtualIndex], currentVirtualIndex);
        	if(currentVirtualIndex < pageCount-1) loadView(containers[currentVirtualIndex+1], currentVirtualIndex+1);
        	
        };

    }

    scrollable.addEventListener(getScrollEndHandlerName(), scrollEndListener);
    scrollable.currentPage = getPageFromIndex(options.start);

    if (options.autoFocus) {
        // This postlayout hook takes care of focusing the first child
        function postlayout() {
            scrollable.views[getPageFromIndex(currentVirtualIndex)].children[0].focus();
            scrollable.removeEventListener("postlayout", postlayout);
        }

        scrollable.addEventListener("postlayout", postlayout);
    }

    this.view = scrollable;
    
    this.reload = function () {
    	emptyView(containers[currentVirtualIndex]);
        loadView(containers[currentVirtualIndex], currentVirtualIndex);
    };

    this.dispose = function () {
        for (var i = 0; i < pageCount; i++) {
            scrollable.removeView(containers[i]);
            //emptyView(containers[i]);
            containers[i] = null;
        }
        //scrollable.removeAllChildren();
        containers = null;
        scrollable.removeEventListener(getScrollEndHandlerName(), scrollEndListener);
        if (options.autoFocus) {
            scrollable.removeEventListener("postlayout", postlayout);
        }

        scrollable = null;
    };

    return this;
}

module.exports = VirtualScroller;
