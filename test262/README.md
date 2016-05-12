These are test cases that should be largely compatible with the
test262 framework, only minor editing should be necessary to
incorporate them into the test262 test suite later.

At the moment, these test cases use their own test runner and harness
however, and each incorporates a little prologue and epilogue that
will later be removed.

In a browser, load runner.html to run all the tests.

In a JS shell, run each test case by first loading harness.js and then
the test case.
