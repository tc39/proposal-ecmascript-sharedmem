// Copyright (C) 2015 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.
//

// AgentTest infrastructure for JS shells.  Load this as a prefix to
// tests that need to run in multiple agents.
//
// (This implementation for the SpiderMonkey shell.)
//
//
// In the main thread, there is an object AgentTest:
//
// AgentTest.start(script_source) => void
//   Run the `script_source` program in a concurrent agent.
//   Blocks until that agent is up and running.
//
// AgentTest.broadcast(id, sab) => void
//   Send the pair {id, sab} to all concurrent agents.  `id` will be
//   coerced to Int32.  `sab` must be a SharedArrayBuffer.  Blocks
//   until all the agents have acknowedged receipt of the message.
//
//   Note, broadcast assumes all agents that were started are still
//   alive and will deadlock if any have terminated.
//
// AgentTest.getReport() => string | null
//   Probe for a text message from any agent, return null if none is
//   available.  Will not block.
//
// AgentTest.sleep(ms)
//   Wait for `ms` milliseconds.
//
// AgentTest.reset()
//   All concurrent agents should have exited - this will be assumed,
//   not checked!  Reinitialize global state for a new round of tests.
//
//
// In the concurrent agent, there is also an object AgentTest:
//
// AgentTest.receive()
//   Block until a {sab, id} pair is broadcast from the master, then
//   return it.
//
// AgentTest.report(string)
//   Report the string back to the master, will not block.  Messages
//   should be short and sweet, as there is fixed, limited space.
//
// AgentTest.sleep(ms)
//   Wait for `ms` milliseconds.
//
// AgentTest.leaving()
//   The agent is about to terminate.  (This will not be called if the
//   agent crashes and is here as a portable hook to make the agent
//   terminate itself, should it need to.)

// ------------------------------------------------------------

// The SpiderMonkey implementation uses a designated shared buffer _ia
// for coordination, and spinlocks for everything except sleeping.

var _MSG_LOC = 0;		// Low bit set: broadcast available; High bits: seq #
var _ID_LOC = 1;		// ID sent with broadcast
var _ACK_LOC = 2;		// Worker increments this to ack that broadcast was received
var _RDY_LOC = 3;		// Worker increments this to ack that worker is up and running
var _LOCKTXT_LOC = 4;		// Writer lock for the text buffer: 0=open, 1=closed
var _NUMTXT_LOC = 5;		// Count of messages in text buffer
var _NEXT_LOC = 6;              // First free location in the buffer
var _SLEEP_LOC = 7;		// Used for sleeping

var _FIRST = 10;		// First location of first message

var _ia = new Int32Array(new SharedArrayBuffer(65536));
_ia[_NEXT_LOC] = _FIRST;

// AgentTest object in the agent, prepended to the agent's source.

var _worker_AgentTest = `
var AgentTest =
{
    receive: function() {
	var k;
	while (((k = Atomics.load(_ia, ${_MSG_LOC})) & 1) == 0)
	    ;
	var received_sab = getSharedArrayBuffer();
	var received_id = Atomics.load(_ia, ${_ID_LOC});
	Atomics.add(_ia, ${_ACK_LOC}, 1);
	while (Atomics.load(_ia, ${_MSG_LOC}) == k)
	    ;
	return { id: received_id, sab: received_sab };
    },

    report: function(msg) {
	while (Atomics.compareExchange(_ia, ${_LOCKTXT_LOC}, 0, 1) == 1)
	    ;
	msg = "" + msg;
	var i = _ia[${_NEXT_LOC}];
	_ia[i++] = msg.length;
	for ( let j=0 ; j < msg.length ; j++ )
	    _ia[i++] = msg.charCodeAt(j);
	_ia[${_NEXT_LOC}] = i;
	Atomics.add(_ia, ${_NUMTXT_LOC}, 1);
	Atomics.store(_ia, ${_LOCKTXT_LOC}, 0);
    },

    sleep: function(s) {
	Atomics.wait(_ia, ${_SLEEP_LOC}, 0, s);
    },

    leaving: function() {}
}
var _ia = new Int32Array(getSharedArrayBuffer());
Atomics.add(_ia, ${_RDY_LOC}, 1);
`;

// AgentTest object in the main thread.

var AgentTest =
{
    _numWorkers: 0,
    _numReports: 0,
    _reportPtr: _FIRST,

    start: function (script) {
	setSharedArrayBuffer(_ia.buffer);
	var oldrdy = Atomics.load(_ia, _RDY_LOC);
	evalInWorker(_worker_AgentTest + script);
	while (Atomics.load(_ia, _RDY_LOC) == oldrdy)
	    ;
	this._numWorkers++;
    },

    broadcast: function (sab, id) {
	setSharedArrayBuffer(sab);
	Atomics.store(_ia, _ID_LOC, id);
	Atomics.store(_ia, _ACK_LOC, 0);
	Atomics.add(_ia, _MSG_LOC, 1);
	while (Atomics.load(_ia, _ACK_LOC) < this._numWorkers)
	    ;
	Atomics.add(_ia, _MSG_LOC, 1);
    },

    getReport: function () {
	if (this._numReports == Atomics.load(_ia, _NUMTXT_LOC))
	    return null;
	var s = "";
	var i = this._reportPtr;
	var len = _ia[i++];
	for ( let j=0 ; j < len ; j++ )
	    s += String.fromCharCode(_ia[i++]);
	this._reportPtr = i;
	this._numReports++;
	return s;
    },

    sleep: function(s) {
	Atomics.wait(_ia, _SLEEP_LOC, 0, s);
    },

    reset: function() {
	this._numWorkers = 0;
	this._numReports = 0;
	this._reportPtr = _FIRST;
	_ia[_MSG_LOC] = 0;
	_ia[_ID_LOC] = 0;
	_ia[_ACK_LOC] = 0;
	_ia[_RDY_LOC] = 0;
	_ia[_LOCKTXT_LOC] = 0;
	_ia[_NUMTXT_LOC] = 0;
	_ia[_NEXT_LOC] = _FIRST;
    }
}
