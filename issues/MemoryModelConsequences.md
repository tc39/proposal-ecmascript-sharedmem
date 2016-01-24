[[[
Cut from the spec text at GetValueFromBuffer():

This restricts compiler optimizations as follows.  If a program loads a value, and then uses the loaded value several places, an ECMAScript implementation must not re-load the value for any of the uses even if it can prove the agent does not overwrite the value in memory.  It must also prove that no concurrent agent overwrites the value.

@titzer says that is wrong (Issue #43).  Although I think his comment was confused.

But this is exactly the security issue that was debated in another thread: reloading a value after a security check breaks the security of that value.
]]]

[[[
Also cut, from the memory model:


        <p> Also see the NOTE on GetValueFromBuffer() that clarifies
          that a compiler may not generate re-loads from shared
          memory. </p>
]]]

What does it mean for the shared memory model to leak into the spec?

"Only with data races do optimizations become visible to the program."

This is mostly about data races, I think - given that we're
sequentially consistent absent data races, confusing behavior is a
result of counterintuitive results about races.  (For example the racy
busy-wait loop.)  That a read from a racy location can yield garbage
and that that garbage can be any type-safe value is confusing, people
don't think of garbage as "we skip the reading altogether and reuse
the value we read last time".

(But is it *only* about data races?  Consider the buggy synchronization
for the barrier, that required a seqLock to fix.  Was that code racy?
Probably not.  It just did not perform inter-thread synchronization
properly.  Is this a normal bug or a new kind of bug?)

Right now races can be hidden by syntax because we use TypedArray also
for shared memory.  That is, the semantic "leak" is deep in the
language, at the memory access level and as (declaratively) specified
by the memory model.

If, instead, shared memory was accessed entirely along another path
then the "leak" would be clearly set apart from existing machinery,
and it would be obvious that code that does not call the shared memory
primitives does not access shared memory and is not subject to racy
behavior.

The question is how much that is worth.  Suppose shared memory use is
packaged in a library but has some code that turns out to be racy.
This raciness may or will spread to the client code.  But is this more
than just a bug?  It is, when values that should not possibly exist
come back as return values from the library.  But again, is that more
than just a bug?  (Especially in a dynamic language.)

--

How are the language semantics affected by races?

- GetValueFromBuffer may return garbage

- SetValueInBuffer may store garbage

- The garbage may not actually be stable (for a period that's very
  hard to pin down)

- The garbage is always type safe though: NaNs are still canonicalized

- Once garbage is in memory it spreads: eg, a branch based on a
  garbage value may go either way, an array store using a garbage
  index may store into any slot (or out of bounds)

- Multiple reads of the same garbage may read different values, which
  affects program logic

We can perhaps *model* this by saying, in GetValueFromBuffer, that if
the location has been subject to a race then random byte values are
read by steps 9a, 10a, and 11a.

But that requires pinning down whether a particular location has been
subject to a race.  The union-of-locations rule is a good start but is
it reliable?

If an operation uses racy data, does the operation itself become part
of the race?  Are data it stores also racy?  I would be inclined to
say not, since racy values that are read are type-safe and once read
they stay read, except that re-reading is an issue: a value that is
re-read (by the compiler) may read a different value.

And what about reordering in the CPU?

When does the race end?  Suppose N writes race on a location L; at
some (global) time the last of those has completed.  How does the race
end?  A regular read to L will be racy.  An atomic store to L will
also be racy (races with a non-atomic store).

The race therefore ends only when the threads synchronize on other
locations than L, creating a relationship between the racy accesses on
L and those synchronizations, and decoupling accesses to L after the
synchronization from the ones before.

The threads don't all have to synchronize on the same other-than-L
location because seqcst - the syncs are ordered, the order does not
matter.  But they must all *synchronize*, I think, that were involved
in the race on L, it's not enough to interact with an atomic var.
Suppose two threads T1 and T2 and two sync locations S1 and S2.  They
race to write on L.  Now T1 writes S1 and T2 writes S2.  Those writes
are ordered, and both happen after the race on L, and both threads can
therefore assume that the race is over - but only after both events.
But since T1 and T2 are not aware of the other's event, they never
know when that is.  One must still signal the other (arguaby they must
perhaps signal each other).

Thus: the race is over once all the racing threads have synchronized
properly with each other after the race, which means created a
happened-before relationship that involves all of them both sending a
signal and receiving a signal.

Effectively this means a global atomic counter reaching N, where each
thread counts up.



Until the race is known to be over there's no telling what will be
written to or read from a racy location.
