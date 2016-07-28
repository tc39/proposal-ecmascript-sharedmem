# Demos

There are many demonstration programs, examples, and test cases in the repo [https://github.com/lars-t-hansen/parlib-simple](https://github.com/lars-t-hansen/parlib-simple).  The README.md file in that repo contains a general roadmap.  Below are also some suggestions about where to start.

## Where to start

The demos and test cases in parlib-simple are written at varying abstraction levels, and in particular, many of them appear a little messy because they manage memory manually.  The following are illustrative.

The easiest place to start might be src/buffer.js, which implements a classical bounded buffer using the lock and condition variables implemented in src/lock.js.  These are then tied together in an example program in test/test-buffer.html, where several workers insert values into a buffer and the main thread extracts those values.

A more elaborate take on the same idea is in src/intqueue.js, which is a queue of bundles of integers, built on the Synchronic abstraction in src/synchronic.js and also on a simple memory allocator.  IntQueue is then used, along with value marshaling code in src/marshaler.js, to build a *synchronous inter-worker communication channel* in src/channel.js.  The test program in test/test-sendmsg.html uses this system to send values back and forth between agents.

Finally, the data-parallel framework in src/par.js provides a simple perform-work-in-parallel abstraction, with automatic work queue management and marshaling of arguments.  Simple demonstrations of this facility are in demo/mandelbrot-animation2 and demo/mandelbrot-animation-simd.

## Web applications using shared memory

* http://statebuilder.com/ - 4X strategy game, built with custom C++ engine, ported to the web using Emscripten.
