var sab = new SharedArrayBuffer(4096);

// This is not the right locus.  But where is the locus?  It is not, eg, registration.installing.

onmessage = function(ev) {
    console.log("Hoi, got a message: " + ev);
}

if (!(window.location.protocol == "http:" || window.location.protocol == "https:")) {
    msg(window.location.protocol);
    msg("Can't be loaded from a " + window.location.protocol + " URL");
    msg("Perhaps try 'python -m SimpleHTTPServer 8000' in this directory and load http://localhost:8000/");
} else {
    navigator.serviceWorker.register("/sharing_window_and_serviceworker_child.js", { scope: "/magic/" }).then(
	function(registration) {
	    console.log("success!");
	    if (registration.installing) {
		registration.installing.postMessage(["Howdy from your installing page", sab]);
	    }
	}).catch( function(why) {
	    console.error("Installing the worker failed!:", why);
	});
}
