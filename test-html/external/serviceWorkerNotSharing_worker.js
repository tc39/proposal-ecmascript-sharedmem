onfetch = function (ev) {
    ev.respondWith(new Response("Hi there", { status: 200, statusText: "OK" }));
}

onmessage = function (ev) {
    console.log("Got a message: " + ev.data);
    console.log(ev.data instanceof SharedArrayBuffer);
}
