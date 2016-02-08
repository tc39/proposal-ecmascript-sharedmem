// This mimics, superficially, the test262 harness

var _count = 0;
var _errors = 0;

var assert = {

    sameValue: function (got, expected) {

	function same(a, b) {
	    var pass = true;
	    if (typeof a != typeof b)
		pass = false;
	    else if (typeof a == "number") {
		if (a != b)
		    pass = isNaN(a) && isNaN(b);
		else if (a == 0)
		    pass = (1/a == 1/b);
	    }
	    else if (typeof a == "string" || typeof a == "boolean" || typeof a == "undefined")
		pass = (a == b);
	    else if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length != b.length)
		    pass = false;
		else {
		    var limit = a.length;
		    for ( var i=0 ; i < limit && pass ; i++ )
			pass = same(a[i], b[i]);
		}
	    }
	    // TODO: view types!
	    else
		pass = (a == b);
	    return pass;
	}

	++_count;
	if (!same(got, expected))
	    fail("Failed: got " + got + ", expected " + expected);
    },

    throws: function (error, thunk) {
	++_count;
	var failed = false;
	var failure;
	try {
	    thunk();
	}
	catch (e) {
	    failed = true;
	    failure = e;
	}
	if (!failed)
	    fail("Failed: expected " + error.name + " exception, did not fail: " + thunk);
	if (!(failure instanceof error))
	    fail("Failed: expected " + error.name + ", got " + failure);
    }
};

function clearCount() {
    _count = 0;
    _errors = 0;
}

function getCount() {
    return _count;
}

// Hooks that are overridden by the HTML test runner

function beginTest() {
}

function finishTest() {
}

function classifyTest() {}

function fail(s) {
    msg(s);
    if (++_errors >= 100) {
	msg("BAILING OUT");
	throw new Error(s);
    }
}

function msg(s) {
    if (this.console && this.console.log)
	this.console.log(s);
}
