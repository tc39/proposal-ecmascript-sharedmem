document.writeln("<div id='scrool'></div>");

function msg(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    document.getElementById("scrool").appendChild(d);
}

// The spec allows individual threads to prevent blocking.  In a
// browser, this will be an issue only on the main thread.

var canBlockOnThisThread = (function () {
    var mem = new Int32Array(new SharedArrayBuffer(4));
    var didThrow = false;
    try {
	Atomics.wait(mem, 0, 0, 0);
    }
    catch (e) {
	didThrow = true;
    }
    return !didThrow;
})();
