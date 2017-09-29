var tape = require('tape'),
    commitHash = require('./index.js');

// fetch from all remotes before running tests, to make
// sure all branches references are updated locally.

// a user of this library could alternatively
// run commitHash() with the option `fetch = true`
// instead of running manually commitHash.fetchAll(),
// or not run it at all if the project is suppossed
// to be updated already
commitHash.fetchAll(function() {
    // tests are done against commits of this same project
    tape('resolve commit hash', function(t) {
        commitHash('21f6ba4e644e77d6e20eaa5156a928b6d75fdf76', function(err, hash) {
            t.equals(hash, '21f6ba4e644e77d6e20eaa5156a928b6d75fdf76');
            t.end();
        });
    });

    tape('resolve short commit hash', function(t) {
        commitHash('21f6b', function(err, hash) {
            t.equals(hash, '21f6ba4e644e77d6e20eaa5156a928b6d75fdf76');
            t.end();
        });
    });

    tape('resolve tag', function(t) {
        commitHash('v0.1.0', function(err, hash) {
            t.equals(hash, 'c2b3783c6ec0399a06cf0932f68518d46e7793cd');
            t.end();
        });
    });

    tape('resolve tag with modifier', function(t) {
        commitHash('v0.1.0^^', function(err, hash) {
            t.equals(hash, '285d19c23a56662bab97c75b4bfc80a175dfdae2');
            t.end();
        });
    });

    tape('resolve remote branch not tracked locally', function(t) {
        commitHash('origin/tests-unused-branch', function(err, hash) {
            t.equals(hash, '3f07195438a6a846554ed4b8cd7b3223a8c5e91e');
            t.end();
        });
    });

    tape('resolve remote branch with modifier', function(t) {
        commitHash('origin/tests-unused-branch^', function(err, hash) {
            t.equals(hash, '1ed27483d562f3e67a42c3fd8ed86d25f6d0bcdc');
            t.end();
        });
    });

    tape('get commit message and author', function(t) {
        commitHash.commitInfo('21f6ba4e644e77d6e20eaa5156a928b6d75fdf76', function(err, info) {
            t.deepEquals(info, {
                hash: '21f6ba4e644e77d6e20eaa5156a928b6d75fdf76',
                message: 'initial empty commit\n\n',
                author: {
                    date: 'Wed Jul 13 10:08:56 2016 +0200',
                    name: 'Diego Guerra',
                    email: 'dgoguerra.or@gmail.com'
                }
            });
            t.end();
        });
    });

    tape('unknown commit returns null as commit info', function(t) {
        commitHash.commitInfo('unknown', function(err, info) {
            t.deepEquals(info, null);
            t.end();
        });
    });
});
