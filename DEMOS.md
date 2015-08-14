# Demos

There are many demonstration programs, examples, and test cases in the repo [https://github.com/lars-t-hansen/parlib-simple](https://github.com/lars-t-hansen/parlib-simple).  The README.md file in that repo contains a general roadmap.  Below are also some suggestions about where to start.

Note, the code in that repo still uses an API that is slightly different from the one described by the current spec: there is a separate hierarchy of SharedTypedArray types that are used to create views on SharedArrayBuffer.

## Where to start

The demos and test cases in parlib-simple are written at varying abstraction levels, and in particular, many of them appear a little messy because they manage memory manually.

The easiest place to start might be src/buffer.js, which implements a classical bounded buffer using the lock and condition variables implemented in src/lock.js.  These are then tied together in an example program in test/test-buffer.html.

