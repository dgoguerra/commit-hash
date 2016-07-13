var tape = require('tape'),
    commitHash = require('./index.js');

// tests against commits of this same project

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
