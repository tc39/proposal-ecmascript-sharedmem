// For the sake of supporting Firefox (until it is fixed), all tests
// currently use SharedTypedArray names for the shared views, not
// TypedArray names.

if (!this.SharedInt32Array) {
    SharedInt8Array = Int8Array;
    SharedUint8Array = Uint8Array;
    SharedInt16Array = Int16Array;
    SharedUint16Array = Uint16Array;
    SharedInt32Array = Int32Array;
    SharedUint32Array = Uint32Array;
    SharedFloat32Array = Float32Array;
    SharedFloat64Array = Float64Array;
}

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
	throw new Error("Failed: got " + a + ", expected " + b);
}
