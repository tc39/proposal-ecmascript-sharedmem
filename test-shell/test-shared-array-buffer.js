beginTest("SharedArrayBuffer");

// Remember to include harness.js before this file.

assertEq(typeof SharedArrayBuffer.isView, "function");
assertEq(typeof SharedArrayBuffer.prototype, "object");
assertEq(typeof SharedArrayBuffer.prototype == null, false);

var sab = new SharedArrayBuffer(1024);

assertEq(sab.byteLength, 1024);
assertEq(sab.constructor, SharedArrayBuffer);
assertEq(String(sab), "[object SharedArrayBuffer]");

// TODO: test SharedArrayBuffer.prototype.slice

finishTest("SharedArrayBuffer");
