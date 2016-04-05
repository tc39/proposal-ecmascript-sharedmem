# Frequently asked questions

## My racy program does not do what I expect it to do

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
