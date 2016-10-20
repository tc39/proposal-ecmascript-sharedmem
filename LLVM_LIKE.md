# Introduction

SharedArrayBuffer provides two strengths of memory operations: atomic and non-atomic. Correctly synchronized atomic operations are sequentially consistent, i.e., there is a global total ordering of atomic memory operations that all agents observe. Non-atomic operations are globally unordered, i.e. they are only ordered by sequential agent order. Incorrectly synchronized atomic operations, such as two racing writes to overlapping but not equal location ranges, behave as if they were non-atomic. Currently, no weak atomic ordering semantics, such as release-acquire, is supported.

We hope this enables non-atomic operations to be compiled to bare stores and loads on target architectures, and atomics to be compiled to ensure sequential consistency in the usual way, such as sequential consistency-guaranteeing instructions or double fencing.

The memory consistency model (hereinafter "memory model") aims to define the ordering of shared memory operations. The model is axiomatic, takes significant inspiration from LLVM, and should also be familiar to readers who have read C++'s memory model. An axiomatic model also allows for flexibility in supporting multiple, possibly noncomparable weak consistency models in hardware such as those of ARM and Power.

# Model

The memory model describes the allowed orderings of SharedArrayBuffer events (hereinafter "events") and host-provided events (e.g., those arising from `postMessage`). We represent SharedArrayBuffer events as ReadSharedMemory(_order_, _block_, _byteIndex_, _elementSize_) and WriteSharedMemory(_order_, _block_, _byteIndex_, _elementSize_, _bytes_) that occur during evaluation. Allowed values for _order_ are `"SeqCst"`, `"Init"`, or `"Unordered"`.

Let the range of an event be the byte locations in the interval [_byteIndex_, _byteIndex_ + _elementSize_). Two ranges are equal when they are byte location-wise equal. Two ranges are overlapping when they are not equal and the intersection of byte locations between them is non-empty. Two events' ranges are disjoint when they do not have the same _block_ or their ranges are neither equal nor overlapping.

These events are ordered by two relations: happens-before and reads-from, defined mutually recursively as follows.

### agent-order

The total order of SharedArrayBuffer events in a single agent during a particular evaluation of the program.

### synchronizes-with

The least relation between pairs of events such that:

1. For each pair of ReadSharedMemory event _R_ and WriteSharedMemory event _W_ such that _R_ has _order_ `"SeqCst"` and that _R_ reads-from _W_:
  1. If _W_ has _order_ `"SeqCst"` and _R_ and _W_ have equal ranges then:
    1. _R_ synchronizes-with _W_.
  1. Otherwise, if _W_ has _order_ `"Init"` then:
    1. Let _allInitReads_ be true.
    1. For each WriteSharedMemory event _V_ such that _R_ reads-from _V_:
      1. If _V_ does not have _order_ `"Init"` then:
        1. Set _allInitReads_ to false.
    1. If _allInitReads_ is true then:
      1. _R_ synchronizes-with _W_.
1. Let additional-synchronizes-with be a host-provided relation between pairs of events.
1. Let _E<sub>1</sub>_ and _E<sub>2</sub>_ be events.
1. If _E<sub>1</sub>_ additional-synchronizes-with _E<sub>2</sub>_ then:
  1. _E<sub>1</sub>_ synchronizes-with _E<sub>2</sub>_.

NOTE 1: The additional-synchronizes-with relation allows the host to provide additional synchronization mechanisms, such as `postMessage` between HTML workers.

NOTE 2: Not all events with _order_ `"SeqCst"` related by reads-from are related by synchronizes-with. Only those events that also have equal ranges are related by synchronizes-with.

[[[ The Init machinery is plausible but insufficient for reasons discussed earlier, ie, typically memory will be "re-initialized" with normal writes as part of normal program execution, not with these magic initializing stores.  ]]]

### happens-before

The least partial order such that that:

1. For each pair of events _E<sub>1</sub>_ and _E<sub>2</sub>_:
  1. For each agent _a_ in the agent cluster:
    1. If _E<sub>1</sub>_ is agent-order before _E<sub>2</sub>_ in the agent-order of _a_ then:
      1. _E<sub>1</sub>_ happens-before _E<sub>2</sub>_.
    1. If _E<sub>1</sub>_ synchronizes-with _E<sub>2</sub>_ then:
      1. _E<sub>1</sub>_ happens-before _E<sub>2</sub>_.
  1. If there is an event _E<sub>3</sub>_ such that _E<sub>1</sub>_ happens-before _E<sub>3</sub>_ and _E<sub>3</sub>_ happens-before _E<sub>2</sub>_ then:
    1. _E<sub>1</sub>_ happens-before _E<sub>2</sub>_.

### reads-bytes-from

A function from ReadSharedMemory events to a List of WriteSharedMemory events such that:

1. For each ReadSharedMemory event _R_:
  1. There is a List of length equal to the range of R of WriteSharedMemory events _Ws_ such that _R_ reads-bytes-from _Ws_.
  1. For each byte location _b_ in _R_'s range:
    1. Let _W<sub>b</sub>_ be the <em>b</em>th event in _Ws_.
    1. _W<sub>b</sub>_ has _b_ in its range, and
    1. It is not the case that _R_ happens-before _W<sub>b</sub>_, and
    1. There is no WriteSharedMemory event _V_ that has _b_ in its range such that _W<sub>b</sub>_ happens-before _V_ and _V_ happens-before _R_.

### reads-from

The least relation between pairs of events such that:

1. For each pair of ReadSharedMemory event _R_ and WriteSharedMemory event _W_:
  1. If _R_ reads-bytes-from a List of WriteSharedMemory events _Ws_ that contains _W_ then:
    1. _R_ reads-from _W_.

### Initial Values

For each byte location _l_ in a _block_, there is a WriteSharedMemory(`"Init"`, _block_, _l_, 1, _v0<sub>l</sub>_) event for a host-provided value _v0<sub>l</sub>_ such that it is happens-before all other events with _l_ in their ranges.

[[[ This is a start but it's going to be tricky to make this work for us in the context of translating from C++ code, since memory will be recycled without the SAB being freed and reallocated, and we need a way to apply this mechanism to recycled memory.  I wouldn't get hung up on this quite yet but it will be a headache.  There are few solutions here. ]]]

### Candidate Executions

We call a set of events, a happens-before relation, and a reads-from relation a candidate execution of an agent cluster.

### No Out of Thin Air Reads

Let depends-on be a relation on shared memory events that is consistent with the agent-order of each agent in the agent cluster and captures data and control dependencies between events. A candidate execution has no out of thin air reads if there is no cycle in the union of reads-from and depends-on.

NOTE: Out of thin air reads is an artifact of axiomatic memory models. For other languages with axiomatic memory models, thin air reads have not been observed on any known hardware nor due to any known compiler transform.

Draft Note: This is intentionally underspecified. Precisely capturing and forbidding OOTA is currently an open problem.

### Sequentially Consistent Atomics

A candidate execution has sequentially consistent atomics if there is a total order _memory-order_ such that:

1. For each pair of events _E<sub>1</sub>_ and _E<sub>2</sub>_ in the set of events with _order_ `"SeqCst'` or `"Init"`:
  1. If _E<sub>1</sub>_ happens-before _E<sub>2</sub>_ then:
    1. _E<sub>1</sub>_ is memory-order before _E<sub>2</sub>_.
  1. If _E<sub>1</sub>_ is a ReadSharedMemory event _R_ and _E<sub>2</sub>_ is a WriteSharedMemory event _W_ such that _R_ synchronizes-with _W_ then:
    1. Assert: _R_ has _order_ `"SeqCst"`.
    1. There is no WriteSharedMemory event _V_ with equal range as _R_ such that _W_ is memory-order before _V_ and _V_ is memory-order before _R_.
    1. NOTE: This clause constrains `"SeqCst"` events on equal ranges, not all `"SeqCst"` events.
  1. If _E<sub>1</sub>_ is a ReadSharedMemory event _R_ and _E<sub>2</sub>_ is a WriteSharedMemory event _W_ such that _R_ and _W_ are introduced by a single read-modify-write API call (e.g., `Atomics.compareExchange`) then:
    1. Assert: _R_ and _W_ have _order_ `"SeqCst"`.
    1. _R_ is memory-order before _W_, and
    1. There is no event _E_ such that _R_ is memory-order before _E_ and _E_ is memory-order before _W_.

### Valid Executions

A candidate execution is valid (hereinafter an "execution") if it has no out of thin air reads and has sequentially consistent atomics.

### Races

Two shared memory events _E<sub>1</sub>_ and _E<sub>2</sub>_ are said to be in a race if all of the following conditions hold.

1. It is not the case that _E<sub>1</sub>_ happens-before _E<sub>2</sub>_ or _E<sub>2</sub>_ happens-before _E<sub>1</sub>_, and
1. At least one of _E<sub>1</sub>_ or _E<sub>2</sub>_ is a WriteSharedMemory event, and
1. _E<sub>1</sub>_ and _E<sub>2</sub>_ do not have disjoint ranges.

Two shared memory events _E<sub>1</sub>_ and _E<sub>2</sub>_ are said to be in a data race if they are in a race and additionally, any of the following conditions holds.

1. At least one of _E<sub>1</sub>_ or _E<sub>2</sub>_ does not have _order_ `"SeqCst"`, or
1. _E<sub>1</sub>_ and _E<sub>2</sub>_ have overlapping ranges.

We say an execution is data race free if it has no data races between any two memory operation events. A program is data race free if all its executions are data race free.

NOTE: The memory model supports sequential consistency for data race free programs.

### Semantics of ReadSharedMemory and WriteSharedMemory

Given an execution, the semantics of ReadSharedMemory and WriteSharedMemory is as follows.

ReadSharedMemory(_order_, _block_, _byteIndex_, _elementSize_)

1. Let _Ws_ be the list of events such that this ReadSharedMemory event reads-from.
1. Let _v_ be 0.
1. For _b_ from 0 to _elementSize_-1:
  1. Let _W<sub>b</sub>_ be the <em>b</em>th event in _Ws_.
  1. Assert that _W<sub>b</sub>_ is a WriteSharedMemory event with the same _block_.
  1. Let the <em>b</em>th byte in _v_ be _W<sub>b</sub>_'s value for the <em>b</em>th byte in its _bytes_.
1. Return _v_.

NOTE 1: These are not "Runtime Semantics". Weak consistency models permit causality paradoxes and non-multiple copy atomic observable behavior that are not representable in the non-speculative step-by-step semantics labeled "Runtime Semantics" in ECMA262. Thought of another way, sequential evaluation of a single agent gives an initial partial ordering to ReadSharedMemory and WriteSharedMemory events. These events, and events from every other agent in the agent cluster, must be then partially ordered with each other according to invariants above to form candidate executions. Finally, these candidate executions must be validated to determine which are allowed. ReadSharedMemory and WriteMemoryEvents are only well-defined when given an execution.

In an execution, a ReadSharedMemory event _R_ with _order_ `"SeqCst"` is access atomic when it reads-from a single WriteSharedMemory event _W_ with _order_ `"SeqCst"` with equal range.

NOTE 2: Neither the synchronizes-with relation nor the "Sequentially Consistent Atomics" requirement guarantees access atomicity for atomic events. Both are concerned with ordering of atomic operations on equal ranges, but it is possible to have sequentially consistent equal-ranged atomics without access atomicity. For example, consider the following program where U8 and U16 are aliased 1-byte and 2-byte views on the same shared memory block.

```
W1: U16[a] = 1; W2: U8[a] = 2; || R: observe(U16[a]);
```

A candidate execution where all of the following hold is a valid execution.

- `R` synchronizes-with `W1`
- `R` reads-from `W1`
- `R` reads-from `W2`
- `W1` is _memory-order_ before `W2` and `W2` is _memory-order_ before `R`.

`W2` is allowed to come between `W1` and `R` in _memory-order_ because it and `R` do not have equal ranges. Thus, `R` may read a value composed of bytes written by both `W1` and `W2`.

Note that this candidate execution is not data race free.

In a data race free execution, a `"SeqCst"` ReadSharedMemory event _R_ that synchronizes-with a `"SeqCst"` WriteSharedMemory event _W_ means that _R_ reads-from a single _W_, guaranteeing access atomicity.

In an execution, an `"Unordered"` ReadSharedMemory event or a ReadSharedMemory event that participates in a data race may reads-from multiple, different WriteSharedMemory events. The value read is composed of bytes from these WriteSharedMemory events, which does not guarantee access atomicity for the read.

# Compiler Guidelines

Given a host-defined notion of observable behavior of programs, the following restrictions apply to compiler transforms for non-atomics operations.

  - An API call resulting in a single ReadSharedMemory event that affects observable behavior cannot be transformed into API calls resulting in multiple ReadSharedMemory events.
  - An API call resulting in a single WriteSharedMemory event that affects observable behavior cannot be transformed into API calls resulting in multiple WriteSharedMemory events.
  - API calls resulting in WriteSharedMemory events that affect observable behavior may not have their ranges narrowed.
  - API calls resulting in WriteSharedMemory events that affect observable behavior may not be removed.
  - API calls resulting in WriteSharedMemory events that both affect observable behavior and would not have otherwise arisen may not be introduced.

NOTE: Shared memory operations may be introduced, elided, or merged if they do not affect observable of the program. For example, nonbinding prefetches of cache lines, assuming correctness of invalidations, are allowed. Contrastingly, rematerializing an observable read is not. For example, the follow two programs are not equivalent.

```
let x = M[a];
if (x) observe(x);
```

```
if (M[a]) observe(M[a]);
```

The following additional restrictions apply to compiler transforms for atomic operations.

  - API calls resulting in `"SeqCst"` events that affect observable behavior may not be reordered.

The following additional restriction apply to compiler transforms for data race free programs.

  - API calls resulting in shared memory events that do not affect observable behavior may not be transformed to API calls that result in shared memory events that affect observable behavior.

Draft Note: This provisio is intended to prohibit transforms that leak information.

# Code Generation Guidelines

For architectures no weaker than ARM or Power, non-atomic stores and loads may be compiled to bare stores and loads on the target architecture. Atomic stores and loads may be compiled down to instructions that guarantee sequential consistency. If no such instructions exist, memory barriers are to be employed, such as placing barriers on both sides of a bare store or load.

# TODO

- Litmus tests examples
