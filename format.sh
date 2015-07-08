# This script will create tc39/shmem.html from the spec sources.
#
# First, you need to:
#
# Install io.js:
#   Download installer from iojs.org and run it
#   Make sure that the "node" application that's in your path points to /usr/local/bin/iojs
#
# Install ecmarkup:
#   sudo npm install -g ecmarkup

# For some reason, the ecmarkup I have does not handle some
# formatting characters that ecmarkdown should be able to handle.
# So process those first.

node preprocess.js tc39/spec.html temp.html

# Then run the markup.

ecmarkup temp.html tc39/shmem.html
