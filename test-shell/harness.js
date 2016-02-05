function assertEq(a, b) {

    function same(a, b) {
	var pass = true;
	if (typeof a != typeof b)
	    pass = false;
	else if (typeof a == "number") {
	    if (a != b)
		pass = isNaN(a) && isNaN(isNaN(b));
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

    if (!same(a,b))
	fail("Failed: got " + a + ", expected " + b);
}

function expectException(thunk, error) {
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

// Hooks

function beginTest() {}
function finishTest() {}
function msg() {}
function classifyTest() {}
