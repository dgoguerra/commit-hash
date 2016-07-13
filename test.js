var tape = require('tape'),
    commitHash = require('./index.js');

tape('basic example 1', function(t) {
    commitHash('21f6ba4e644e77d6e20eaa5156a928b6d75fdf76', function(err, hash) {
        t.equals(hash, '21f6ba4e644e77d6e20eaa5156a928b6d75fdf76');
        t.end();
    });
});

tape('basic example 2', function(t) {
    commitHash('21f6b', function(err, hash) {
        t.equals(hash, '21f6ba4e644e77d6e20eaa5156a928b6d75fdf76');
        t.end();
    });
});
