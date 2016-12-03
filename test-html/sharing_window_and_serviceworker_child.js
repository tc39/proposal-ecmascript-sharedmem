// This is ServiceWorker code

//var sab = new SharedArrayBuffer(4096);

onmessage = function (ev) {
    console.log("Got a message!");
    console.log(ev.ports.join(" "));
    console.log(ev.data.join(" "));
    console.log(ev.source);
    try {
	ev.source.postMessage(ev.data);
    } catch (e) {
	ev.source.postMessage("From the worker");
	console.log("Failed to post data, probably what we want");
    }
}

oninstall = function (ev) {
    console.log("In oninstall");
}

onfetch = function (ev) {
    console.log("In onfetch");
    return new Response("Hello there");
}

onactivate = function (ev) {
    console.log("In onactivate");
}
