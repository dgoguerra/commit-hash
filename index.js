var spawn = require('child_process').spawn,
    async = require('async'),
    isFunction = require('is-function');

module.exports = function(commitRef, opts, next) {

    function findLocalCommitHash(commitRef, next) {
        var commitHash = null;

        spawn(opts.bin, ['rev-parse', '--verify', commitRef])
            .on('close', function(code) {
                if (code !== 0 || !commitHash) {
                    return next(null, null);
                }
                next(null, commitHash);
            })
            .stdout.on('data', function(data) {
                commitHash = data.toString().trim();
            });
    }

    function findRemoteCommitHash(commitRef, next) {
        var commitHash = null;

        spawn(opts.bin ['ls-remote', opts.remote, commitRef])
            .on('close', function(code) {
                if (code !== 0 || !commitHash) {
                    return next(null, null);
                }
                next(null, commitHash);
            })
            .stdout.on('data', function(data) {
                commitHash = data.toString().trim();
            });
    }

    function findReferenceFullName(commitRef, next) {
        var commitHash = null;

        spawn(opts.bin, ['rev-parse', '--symbolic-full-name', commitRef])
            .on('close', function(code) {
                if (code !== 0 || !commitHash) {
                    return next(null, null);
                }
                next(null, commitHash);
            })
            .stdout.on('data', function(data) {
                commitHash = data.toString().trim();
            });
    }

    if (isFunction(opts)) {
        next = opts;
        opts = {};
    }

    opts = opts || {};
    opts.dir = opts.dir || null;
    opts.bin = opts.bin || 'git';
    opts.remote = opts.remote || 'origin';
    opts.cached = opts.cached || false;

    // if a custom directory was provided, chdir to it before starting
    if (opts.dir) {
        process.chdir(opts.dir);
    }

    async.parallel({
        commitHash: function(next) {
            findLocalCommitHash(commitRef, next);
        },
        refFullName: function(next) {
            findReferenceFullName(commitRef, next);
        }
    }, function(err, results) {
        if (err) return next(err);

        // the given ref is a remote branch, retrieve its current commit
        // from there instead of relying on the local branch's location
        // up to date
        if (!opts.cached && results.refFullName && results.refFullName.indexOf('refs/remotes/') === 0) {
            findRemoteCommitHash(commitRef, next);
        }

        next(null, results.commitHash);
    });
};
