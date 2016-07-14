var spawn = require('child_process').spawn,
    async = require('async'),
    isFunction = require('is-function');

function value(val, defaultVal) {
    return typeof val !== 'undefined' ? val : defaultVal;
}

function fetchAll(opts, next) {
    if (isFunction(opts)) {
        next = opts;
        opts = {};
    }

    opts = opts || {};
    opts.dir = value(opts.dir, null);
    opts.bin = value(opts.bin, 'git');

    // if a custom directory was provided, chdir to it before starting
    if (opts.dir) {
        process.chdir(opts.dir);
    }

    spawn(opts.bin, ['fetch', '--all'])
        .on('close', function(code) {
            next(null);
        });
}

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

    function lookupCommitHash(commitRef, next) {
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
    }

    if (isFunction(opts)) {
        next = opts;
        opts = {};
    }

    opts = opts || {};
    opts.dir = value(opts.dir, null);
    opts.bin = value(opts.bin, 'git');
    opts.cached = value(opts.cached, false);
    opts.fetch = value(opts.fetch, false);

    // if a custom directory was provided, chdir to it before starting
    if (opts.dir) {
        process.chdir(opts.dir);
    }

    async.series({
        fetchAll: function(next) {
            // if the user sets opts.fetch to true, fetch all changes before
            // looking up the asked ref. ideally wouldn't be necessary if
            // relying on `git ls-remote` to lookup the commit ref directly
            // agains the remote, but apparently its not possible to cover
            // all cases with it
            if (opts.fetch) {
                fetchAll(opts, next);
            } else {
                next(null);
            }
        },
        commitHash: function(next) {
            lookupCommitHash(commitRef, next);
        }
    }, function(err, res) {
        next(err, res.commitHash);
    });
};


module.exports.fetchAll = fetchAll;
