# Introduction

Here we attempt to enumerate all the requirements and constraints that
we have encountered.  These tend to blend a little, but are segregated
into requirements (which are high-level, functional attributes) and
constraints (which are complications resulting from the combination of
the requirements and reality).

We will assume that the current design is given: we have a new
SharedArrayBuffer type, on which we can map TypedArrays and DataViews,
and atomic operations are applied to TypedArrays (only) using
operations in the Atomics interface.  There is no "lock" abstraction,
only sequentially consistent atomics.

In addition, standard non-atomic accesses can be used on TypedArrays
that are mapped onto shared memory.  These accesses may (concretely)
conflict at run-time, and may (more abstractly) be involved in data
races.  This does not lead to undefined behavior but rather to
semi-defined behavior (the accesses are unordered), and is safe in the
sense that the VM is not subverted.


# General requirements

These are pretty much baked into the design outlined above and not
really subject to adjustment; they are listed here since they show up
later, in the constraints section.

* The system must provide some reasonable realization of shared memory and atomics.
* The system must be a useful target for C and C++ multi-threaded programs.
* The system must be useful for JS programmers too.
* The system must be a reasonable fit for ECMAScript (vague).
* The system must be platform independent (not counting timing effects).
* The system must be safe.
* Programs running on shared memory should run with pretty much the
  same speed as programs running on private memory.
* There must be a credible level of compatibility between this system and the
  system we will have for wasm, which is not designed yet.
* (Obsolete requirement?) The system must be useful for asm.js as well.


# General requirements for atomic operations

Note that an "atomic operation" is not necessarily a one-to-one
mapping from a call to an Atomics method: not all such calls are
well-defined on all platforms.  Assume that it is possible to separate
the well-defined atomic operations (a subset of the calls to Atomics
methods) from the rest, and that these requirements apply only to
well-defined atomic operations.  (Ignore any apparent circularity you
may perceive in that statement.)

* Atomic operations should appear to execute atomically, ie, two
  apparently concurrent atomic operations that access the same
  TypedArray element should execute one after the other.
* Atomic operations should execute in some total global order.
* Atomic write should become visible everywhere at the same time.
* Atomic read should return a value that is visible everywhere at
  that time (I think; there is probably a more elegant framing of that).
* Atomic operations should be "fast".
* Atomics of several sizes; for wasm we want atomics on integers of 1,
  2, 4, and 8 bytes.  For JS we currently only need 1, 2, and 4 bytes
  as there is no 8-byte integer type.


# Assets and observations

* TypedArray elements will always be aligned at their natural boundary
  in memory in every reasonable implementation.
* By and large we can treat a DataView as we would a Uint8Array mapped
  onto the same bytes: DataView operations are executed byte-at-a-time.
* The design is more important as a compiler target than as a
  programming language.  We may be able to impose restrictions, such
  as not allowing atomics to be optimized in meaningful ways, or
  prohibiting inter-thread optimizations, if we think these will help.


# Constraints on the memory model

## No useful type safety

* _Atomic and non-atomic access to the same address ranges:_ Instead of
  having typed atomic cells that are disjoint from non-atomic cells,
  we allow atomic and non-atomic operations to operate on the same
  cells, and it is possible to have simultaneous atomic and non-atomic
  operations on the same cell.
* _Unrestricted aliasing:_ The TypedArray system allows one-byte,
  two-byte, and four-byte cells to overlap, and it is possible to have
  simultaneous memory operations on (say) a two-byte cell and the
  four-byte cell it aliases.  This is true for both atomic and
  non-atomic accesses.  (And for wasm we'll have 8-byte accesses.)

## Target language for C and C++

* _Non-atomic initialization of memory:_ In practice, programs
  translated from C, and from C++ with low-level atomics, will assume
  that it's legal to perform an atomic read from memory that was
  initialized with non-atomic writes, so long as the read is properly
  ordered after the writes by some other mechanism.
* _No support for proper creation and destruction of "objects" in
  memory:_ C and C++ programs assume that they can just start using,
  and then abandon (and reuse) memory even if the memory contains
  atomic cells: there are no useful creation and destruction points
  for memory used for atomics.  The situation is somewhat better in
  well-typed C++ but reality is complicated.

## Racy accesses and safety

* _Conflicts and races are safe_: Standard non-atomic accesses can be
  used on TypedArrays mapped onto shared memory.  These accesses may
  conflict at run-time, and may (more abstractly) be involved in data
  races.  This must never lead to undefined behavior but rather to a
  semi-defined behavior (the accesses are unordered, subject to
  reordering and optimization), and must be safe in the sense that the VM
  is not subverted.

## High-level language, too

* _Suitability for ECMAScript:_ While the feature is a compiler target
  for C, C++, and other languages, it must have some direct
  applicability to ECMAScript and the Web to fit properly into the
  ECMAScript spec.  This means it should be tractable to build
  performant abstractions (by hand, by JS programmers) on top of the
  shared memory system.
* _Containedness and non-absurdity:_ The committee demands certain
  types of containedness and non-absurd behavior in the feature.
  Notably, certain optimizations that are legal in single-threaded
  programs must be proscribed to avoid absurdity, and the semantics of
  shared memory should not leak into the surrounding language
  (admittedly a hazy requirement).

## Performance and use of native capabilities

* _Native atomic performance:_ It's effectively a requirement that we
  need to be able to use hardware locking primitives (eg, bus-locked
  instructions on x86 or load-exclusive/store-exclusive instructions
  on ARM) whenever that yields the fastest code, and not have to use
  more complicated mechanisms (eg, locks) everywhere to satisfy
  semantic needs.
* _Access-atomicity:_ All current hardware supports serializing
  accesses at the memory interface so that conflicting accesses are
  not interleaved but executed in order (usually for integer accesses
  up to pointer size).  This behavior is considered very useful
  (notably for mapping safe languages that simulate pointers by
  integers) and must be preserved.
* _Optimizations:_ There should be no serious restriction on compiler
  and hardware optimizations relative to single-threaded programs.
  (Some restrictions are acceptable.)

## Highly variable hardware support

* There are many interesting architectures, at least these, but possibly more:
  * ARMv6 (at least starting "mid-generation"), even if increasingly obsolete
  * ARMv7, ARMv8 (32-bit)
  * ARMv8 (64-bit)
  * MIPS (32-bit and 64-bit), unknown versions
  * x86 (32-bit and 64-bit), at least Core2 and later
  * POWER (32-bit and 64-bit), unknown versions
  * SPARC (32-bit and 64-bit), v9 or later (none at present)
* _Weakly ordered memory:_ Some platforms have very weak memory models
  where writes arrive out of order at different cores and not all
  writes by all cores may be visible to all other cores at the point
  of an atomic operation; instead there's an observationality
  requirement that is reminiscent to a classical happens-before
  relation.
* _Varying native atomics support:_ There is unreliable support for
  lock-free (native) atomics at all interesting sizes on the
  interesting architectures; for example, there are no native 64-bit
  atomics on MIPS32.
* _Varying resilience for atomic/non-atomic interaction:_ There may be
  unreliable support for the interaction of atomic and non-atomic
  operations.  There is a rumor (not substantiated) that on some ARM
  implementations, a non-atomic store from another core will not
  necessarily clear a reservation made by LDREX.  (Presumably this is
  a store of a different size than the operand size of LDREX.)  This
  affects the ability of using RMW with wide atomic operations to
  implement narrow atomic operations.

## Implementation via LLVM

* Rather than target particular hardware, an implementation of
  SharedArrayBuffer may use LLVM (or a similar VM) as an intermediate
  representation. A possible code path would then be from C/C++
  via LLVM to asm.js with shared array buffers, then via LLVM
  to hardware.
* LLVM has a memory model, which includes a `seq_cst` memory order,
  which is a good match to atomic accesses. It is possible that either
  `monotone` or `unordered` is a good match to non-atomic accesses
  (the difference between the two is per-location sequential
  consistency). The LLVM model gives defined semantics to all reads
  and writes with memory order `unordered` or stronger, including
  accesses at different data sizes.

# Some specific problems

## Lock-freedom

If we want to support 1, 2, 4, and 8 byte atomics on all platforms,
then we must allow for non-lock-free (NLF) atomics.  Coupled with the
requirement for the most efficient atomics this introduces the
complication, not faced by hardware memory models, that we will need
to use two mutual exclusion mechanisms, one for lock-free (LF) atomics
(provided by hardware) and one for NLF atomics (global or sharded
locks).

Note that all well-defined atomics will still need to appear to be
executed in a single total order, and atomics will still need to
appear to execute atomically.

In the simples case the lock/unlock pair for the NLF atomic will
participate in the total atomic order and a concurrent LF atomic (on a
different access range) will appear to be ordered before or after the
NLF atomic.

It becomes more complicated if atomic variables can alias each other
or locations accessed atomically can also be accessed non-atomically.
This is discussed below, in "Viability".


## Viability

What does it mean for an atomic to be well-defined?

(To be completed :)
