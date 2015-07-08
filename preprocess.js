// See format.sh for information

var fs = require("fs");

var text = fs.readFileSync(process.argv[2], "utf8").split("\n");
for ( var i=0 ; i < text.length ; i++ )
    text[i] = transform(text[i]);
fs.writeFileSync(process.argv[3], text.join("\n"), "utf8");

function transform(l) {
    var OUT = 0;
    var CONST = 1;
    var SKIP = 2;
    var i = 0;
    var lim = l.length;
    var state = OUT;
    var o = "";
    var start = 0;
    while (i < lim) {
	var c = l.charAt(i);
	if (c == ' ' || c == '\t') {
	    switch (state) {
	    case OUT:
	    case SKIP:
		i++;
		o += c;
		state = OUT;
		continue;
	    case CONST:
		// illegal, so flush
		i++;
		o += l.substring(start, i);
		state = OUT;
		continue;
	    }
	}
	if (c == '~') {
	    switch (state) {
	    case OUT:
		state = CONST;
		i++;
		start = i;
		continue;
	    case CONST:
		state = SKIP;
		o += "<b>" + l.substring(start, i) + "</b>";
		i++;
		continue;
	    default:
		i++;
		o += c;
		continue;
	    }
	}
	if (state != CONST) {
	    o += c;
	}
	i++;
    }
    return o;
}

