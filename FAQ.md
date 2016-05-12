# Frequently asked questions

## My racy program does not do what I expect it to do

### The problem

Consider two threads where one is busy-waiting on the other:

```js
// Thread 1                               // Thread 2
while (mem[n] == 0) {                     ...
  /* do nothing */                        mem[n] = 1
}                                         ...
print("Hi")
```

The programmer's intent is clear: the loop in Thread 1
waits until a flag is set, and eventually Thread 2 sets the flag,
signaling for Thread 1 to leave the loop.

Thread 1 may never print "Hi", or it may only sometimes print "Hi"
and sometimes not.  (When it does not it will loop forever.)  The reason
is that the read in the loop does not synchronize with the write, and may
therefore be lifted out of the loop by the compiler, like this:

```js
// Thread 1
let temp = mem[n];
while (temp == 0) {
  /* do nothing */
} 
print("Hi")
```

If the write by Thread 2 is visible to Thread 1 at the time Thread 1 performs the
read then the loop is skipped, but if the write comes later then it is not seen at all
and the loop runs forever.

The Firefox JavaScript compiler performs that optimization, so the program
will run fine when it runs in the interpreter but will stop working
once the code becomes compiled.

The solution is to use proper synchronization:

```js
// Thread 1                               // Thread 2
while (Atomics.load(mem, n) == 0) {       ...
  /* do nothing */                        Atomics.store(mem, n, 1);
}                                         ...
print("Hi")
```

### Discussion

Many programmers are upset when they encounter this problem because they feel that the compiler should not be performing that type of optimization in shared memory.

However, experience has shown that it is desirable for compilers and hardware to be able to perform many of the same optimizations on shared-memory code as they do on non-shared-memory code.  This requires programmers to insert synchronization code in their programs; the synchronization serves as a directive to the compiler and hardware that some optimizations must be disabled around the synchronization.  Synchronization is usually more expensive than "plain" code, but a language that allows full optimization between synchronization points provides better performance than a language that disables many optimizations everywhere in order to have "expected" semantics.

In fact, on most types of hardware it would be quite expensive to provide "expected" semantics, because all memory operations on shared memory would have to be completely ordered.  Hardware and compiler optimizations frequently move, rearrange, or coalesce memory operations; some popular hardware such as ARM CPUs does so particularly aggressively.  Enforcing the ordering would require the insertion of expensive barrier instructions between memory instructions, greatly slowing down programs.

(As pretty much the only reason to be writing parallel code is higher performance, a slow parallel language is not very interesting for practical use.)

There is a longer discussion in [Issue #40](https://github.com/tc39/ecmascript_sharedmem/issues/40) with links to papers and presentations for those interested in more background.
