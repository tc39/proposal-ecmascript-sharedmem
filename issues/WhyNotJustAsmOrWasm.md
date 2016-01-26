(Raw notes, need cleanup.)

Some tasks are best / only done in ES callouts
Input and output, DOM access
“Runtime” tasks

Copy-in/copy-out at boundary too slow (WebGL)
Thus ES wants some shmem access

Also asm.js (= ES) can't polyfill for wasm

Multicore computation in ES is valuable

ES is the better language (GC, rich types)

“wasm-only” does not remove races:
ES can call wasm
wasm can export racy accessor functions