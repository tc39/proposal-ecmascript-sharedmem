// Parameters shared between the master and the workers.

const doLock = true;		// Set to false to see what happens without mutual exclusion

const mutexLoc = 0;
const statusLoc = 1;
const arrayExtra = 2;
const arrayElements = 1000;
const arrayLo = arrayExtra;
const arrayLim = arrayLo + arrayElements;
const iterations = 1000;	// Limit is 1023, for 10-bit fields
const workers = 3;
const maxPollAttempts = 100000;
const pollTimeout = 10;
