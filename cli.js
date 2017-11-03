#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2)),
    commitHash = require('./index.js');

if (argv._.length !== 1) {
    console.error('usage: commit-hash COMMIT_REF');
    process.exit(1);
}

commitHash(argv._[0], {fetch: !!argv.fetch}, function(err, commitHash) {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    console.log(commitHash);
});
