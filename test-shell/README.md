These tests are designed to be run in a Javascript shell.  For each
test, load harness.js first followed by the test in question.  Every
test that can be run that way is named test-*.js.

No output signifies a successful test; failed tests invariably throw
an exception.

For example, for the SpiderMonkey shell, you would do this:

  js -f harness.js -f test-whatever.js

The SpiderMonkey shell also has a non-zero exit code if it exits by an
exception.
