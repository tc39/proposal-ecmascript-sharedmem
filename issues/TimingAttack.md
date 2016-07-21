# Shared memory: Side-channel information leaks

lhansen@mozilla.com / updated 2016-01-24, minor changes 2016-07-20

## Introduction

It is possible to create a high-resolution timer by using shared
memory and a worker: the worker runs in a loop that increments a
shared cell with an atomic operation, and whatever agent needs a clock
just reads the cell.  Yossi Oren has measured such a cell to have a
4ns resolution on current (2015) hardware.  The clock will be a little
noisy as a result of system behavior but probably has much higher
resolution in practice than the attenuated `performance.now()` timer,
which has 5μs resolution.

A number of side channel attacks need a high-resolution timing source
to work.  (This is why `performance.now()` resolution has been reduced.)
There are several examples of such attacks in JS, including last-level
cache sniffing to extract user behavior or user data [Oren, 1], row
hammering to cause bit flips in memory on some types of hardware [Gruss et al, 2],
and SVG/CSS attacks that can read pixels using transforms [Stone, 3] [Andrysco et al, 4].  In
virtualized server environments, though not yet in JS, it has been
possible to extract cryptographic keys for AES and RSA from the cache
[Osvik et al, 5] [Inci et al, 6].  Several published papers focus on exfiltration of data as a high-value use of JS, wherein a local attacker process would signal data by accessing its memory and the JS code, having legitimate access to the network from within the browser, would detect those signals and upload the data.

Attacks are also being launched against ARM [Lipp et al, 8]
and there are ever-novel attack vectors [Gruss et al, 9]; the relevance
of those attacks to JS is hazy, at this time.

In these cases, a precise timer is needed to distinguish a fast
operation from a slow operation.  For the cache attacks and row
hammering this is the time difference between a cache hit and a cache
miss; for the SVG/CSS attacks it is the difference between a fast
transform (the bit we're reading is set one way) and a slow one (it's
set the other way).  Without a fast timer these attacks are not
effective.

## Mitigations and countermeasures

### Thread affinity

The only reasonable "hidden" mitigation that's been proposed and that
can be implemented by the browser vendors is to make sure that threads
that share memory have affinity to the same CPU.  In that case, the
thread that generates the clock signal does not run in parallel with
the thread that reads it, as they are timesliced on the same core.
The clock signal is thus destroyed.  (Or so the theory goes.)

In favor of that mitigation is that it does not destroy the
shared-memory feature; workers can still share memory, and can share
the memory with their owning main thread.

However, actual parallel execution is destroyed by setting the
affinity in that manner, thus removing one of the main justifications
for the feature in JS, and probably making programs that use shared
memory less effective than programs that copy memory.  In practice,
requiring affinity may be a reasonable default if it can be changed
easily when needed, or it may be a reasonable option for high-security
environments such as Tor [Tor project, 7], but it is not a reasonable mitigation when
shared-memory parallelism is actually needed.

The affinity solution has another couple of problems:

- Thread affinity has real teeth on Windows and Linux but is not well
  supported on Mac OS X (and may not be well supported on other
  platforms).
- Browsers that have a single main thread that is the main thread for
  all or many tabs (as does Firefox at the moment) will end up forcing
  many worker threads onto the same core, if shared memory becomes popular on
  the web and affinity is enabled by default.

### Opt-in

At the moment several browsers implement an opt-in scheme for plugin
content.  It may be possible to implement something similar for shared
memory, whereby (say) the shared memory APIs are available but with
thread affinity enabled by default, and some user action allows
threads to run free on multiple cores.  Like the plugin content, it
could be a per-domain or per-tab permission, set once and for all or
for a shorter duration.

Opt-in is not a great solution because most users will not know what
they opt in to, so it will be confusing, and the security will be
questionable (most users run all plugins always when prompted).  It's
also not clear how the need to opt in would be communicated to the
page.

(Also, as discussed above, thread affinity is not necessarily controllable,
and in practice the default might need to be that the shared-memory feature
is not available, or that it is available in some attenuated form.)

## How bad is it?

### Known and potential impact

We don't really know how bad this attack is.  The published attacks in
JS are not yet devastating, but attacks only get better.  The web is
vast; an attack that works against many computers and is delivered via
an ad, say, can be very bad.  Or the attack can go into a toolbox for
targeted attacks (APT).

In general, a web browser runs untrusted code and for that code to be
able to steal information from the user is a big deal.


### New impact

The thing is, it's not obvious that the attack provides a genuinely
new capability to attackers.  Consider the existing technologies on
the Web that can be used to mount the cache attacks:

- Flash Player (AS3 has shared memory)
- Java
- PNaCl / NaCl
- browser extensions with native code
  - native messaging in Chrome
  - js-ctypes in Firefox
  - ActiveX in Internet Explorer
  - probably more

In all cases those technologies do not need shared memory at all if
they already have a precise clock for the attack, but absent a precise
clock all do have shared memory and can build such a clock.

Java and ActiveX were brought up already in 2005 by Osvik in his
paper on attacking AES [5].

In addition, several of the published attacks do not appear to need
the new clock: the rowhammer.js authors have said that the 5μs
throttled clock is not a hindrance to them; Oren states that a 1μs
clock is sufficient for cache sniffing, and such a clock can be built
(by counting) from the 5μs clock.

The shared-memory clock might affect the SVG/CSS attack, especially as
implemented for exploiting subnormal timings, although that attack is
not an issue at present.  (In Firefox the computation was first made
timing-independent and later pushed to the GPU.)

None of the attacks appear to be aided by being able to allocate
memory that is merely shared among the threads of the same browser
process.  (The attacks bring up "shared memory" as an attack vector,
but this is in order to play memory mapping tricks.)


### Future impact

In the future, if WebAssembly adds shared memory and threads (as it is
expected it will) it will inevitably run into the same problem.


### Server-side impact

node.js is not all that interesting in this context because it only
runs trusted code.  Clearly "trusted" is a matter of definition (do
you know what you get with "require"?), but at least the code is not
downloaded from the web through an ad or a random web page.


## The hardware problem

The timing attacks are made possibly by what can only be described as
hardware bugs:

- Rowhammer is ultimately caused by a combination of DDR3 memory
  weaknesses coupled with aggressive (ie low) BIOS DRAM refresh rates.
  (Later also demonstrated on some DDR4 memory.)
- Cache sniffing is arguably a problem with shared caches, a problem
  that is far from new but has now moved to the L3 cache in
  virtualized environments.  (Later also demonstrated on some L1 caches.)

Rowhammer is being addressed by adjusting the BIOS refresh rates (with a performance penalty) and
by more resilient memory types.  Cache sniffing is being addressed by
cache partitioning (though it's unclear how good current attempts
are).

In the past, the cost of denormal floating-point operations has been
used for information stealing with SVG filters, an attack that has
been mitigated by changing timer resolution in the browsers but also
by the CPU manufacturers addressing denormal timing (to some extent),
or by having the hardware flush subnormals to zero.

As time goes by, the hardware problems are mitigated, and new ones are
introduced, eg, GPUs now support denormals, but they implement
operations on denormals in microcode, making them useful timing
channels.

We should not let "the hardware problem" be a reason not to take the
attacks seriously, but worrying about one particular type of clock,
some particular hardware issues, and how they combine to enable these
particular side channel leaks feels like a fairly narrow point of
view.  Other clocks and other hardware bugs will be found.  (An
experiment shows that a counting clock made from the 5μs timer can get
pretty reliable 1μs resolution.)  The problem is less the specific
nature of these side channels than that sensitive computations are not
properly insulated from the rest of the system.  Admittedly, insulation
often requires hardware and OS changes and not merely careful coding,
but it is still where the actual problem is.

## References

[1] [Yossef Oren et al, "The Spy in the Sandbox -- Practical Cache Attacks in Javascript"](http://arxiv.org/abs/1502.07373v2)

[2] [Daniel Gruss et al, "Rowhammer.js: A Remote Software-Induced Fault Attack in JavaScript"](http://arxiv.org/abs/1507.06955v1)

[3] [Paul Stone, "Pixel perfect timing attacks with HTML5"](http://contextis.co.uk/research/white-papers/pixel-perfect-timing-attacks-html5)

[4] [Marc Andrysco et al, "On Submornal Floating point and abnormal timing](https://cseweb.ucsd.edu/~dkohlbre/papers/subnormal.pdf)

[5] [Dag Arne Osvik et al, "Cache Attacks and Countermeasures: the Case of AES"](https://eprint.iacr.org/2005/271.pdf)

[6] [Mehmet Sinan Inci et al, "Seriously, get off my cloud!  Cross-VM RSA Key Recovery in a Public Cloud"](https://eprint.iacr.org/2015/898.pdf)

[7] [Tor project: "High-precision timestamps in JS"](https://trac.torproject.org/projects/tor/ticket/17412)

[8] [Moritz Lipp et al, "ARMageddon: Last-Level Cache Attacks on Mobile Devices"](http://arxiv.org/abs/1511.04897)

[9] [Daniel Gruss et al, "Flush+Flush: A Fast and Stealthy Cache Attack"](http://arxiv.org/abs/1511.04594)
