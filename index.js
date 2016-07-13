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

    function findReferenceCommitHash(commitRef, next) {
        var commitHash = null;

        spawn(opts.bin, ['show-ref', '--verify', commitRef])
            .on('close', function(code) {
                if (code !== 0 || !commitHash) {
                    return next(null, null);
                }
                next(null, commitHash);
            })
            .stdout.on('data', function(data) {
                var arr = data.toString().split(' ');
                commitHash = arr.length && arr[0].trim();
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

    function objectIsTag(commitRef, next) {
        spawn('git', ['describe', '--exact-match', commitRef])
            .on('close', function(code) {
                next(null, code === 0);
            });
    }

    function findTaggedCommit(tagCommitRef, next) {
        var commitHash = null;

        spawn('git', ['rev-list', '-n', '1', tagCommitRef])
            .on('close', function(code) {
                if (code !== 0 || !commitHash) {
                    next(null, null);
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
    }, function(err, res) {
        if (err) return next(err);

        // the given ref is a remote branch, retrieve its current commit
        // from there instead of relying on the local branch's location
        // up to date
        if (!opts.cached && res.refFullName && res.refFullName.indexOf('refs/remotes/') === 0) {
            findReferenceCommitHash(res.refFullName, next);
        }
        // a commit hash was found. check if it belongs to a tag to do
        // further processing, or return it
        else if (res.commitHash) {
            objectIsTag(res.commitHash, function(err, isTag) {
                if (!isTag) return next(null, res.commitHash);

                findTaggedCommit(res.commitHash, function(err, taggedCommitHash) {
                    next(null, taggedCommitHash);
                });
            });
        }
        // no commit hash found, return null
        else {
            next(null, null);
        }
    });
};
