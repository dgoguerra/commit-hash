var childProcess = require('child_process'),
    async = require('async'),
    isFunction = require('is-function'),
    debug = require('debug')('commit-hash');

function value(val, defaultVal) {
    return typeof val !== 'undefined' ? val : defaultVal;
}

function spawn(bin, args) {
    if (debug.enabled) {
        debug(bin+' '+args.join(' '));
    }

    var proc = childProcess.spawn(bin, args);

    proc.on('error', function(err) {
        debug('error: '+err.message);
    });

    proc.stdout.on('data', function(data) {
        debug('stdout: '+data.toString().trim());
    });

    proc.stderr.on('data', function(data) {
        debug('stderr: '+data.toString().trim());
    });

    return proc;
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
        debug('cd '+opts.dir);
        process.chdir(opts.dir);
    }

    spawn(opts.bin, ['fetch', '--tags', '--all'])
        .on('close', function(code) {
            next(null);
        });
}

function getCommitHash(commitRef, opts, next) {

    function objectIsTag(commitRef, next) {
        debug('check if commit refers to a tag');
        spawn(opts.bin, ['describe', '--exact-match', commitRef])
            .on('close', function(code) {
                next(null, code === 0);
            });
    }

    function findTaggedCommit(tagCommitRef, next) {
        var commitHash = null;

        debug('resolve tagged commit');
        spawn(opts.bin, ['rev-list', '-n', '1', tagCommitRef])
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

        function revParse(ref, next) {
            var commitHash = null;

            spawn(opts.bin, ['rev-parse', ref])
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

        var refsToLookup = [
            'refs/remotes/origin/'+commitRef, // ex: if the commitRef is master
            'refs/remotes/'+commitRef, // ex: origin/master
            'refs/tags/'+commitRef, // ex: v1.2.3
            commitRef // ex: asd123f
        ];

        async.tryEach(refsToLookup.map(function(ref) {
            return function(next) {
                revParse(ref, function(err, commitHash) {
                    if (err || !commitHash) {
                        return next(new Error('invalid ref'));
                    }
                    next(null, commitHash);
                });
            };
        }), function(err, commitHash) {
            // no commit hash found, return null
            if (err) {
                return next(null, null);
            }

            // a commit hash was found. check if it belongs to a tag to do
            // further processing, or return it
            objectIsTag(commitHash, function(err, isTag) {
                if (!isTag) return next(null, commitHash);

                findTaggedCommit(commitHash, function(err, taggedCommitHash) {
                    next(null, taggedCommitHash);
                });
            });
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
        debug('cd '+opts.dir);
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
}

function getCommitInfo(commitRef, opts, next) {
    if (isFunction(opts)) {
        next = opts;
        opts = {};
    }

    opts = opts || {};
    opts.dir = value(opts.dir, null);
    opts.bin = value(opts.bin, 'git');

    // if a custom directory was provided, chdir to it before starting
    if (opts.dir) {
        debug('cd '+opts.dir);
        process.chdir(opts.dir);
    }

    getCommitHash(commitRef, function(err, commitHash) {
        if (err) return next(err);

        if (!commitHash) {
            return next(null, null);
        }

        async.parallel({
            author: function(next) {
                var authorInfo = '';
                spawn(opts.bin, ['log', '--format=%ad::%an::%ae', '-n', '1', commitHash])
                    .on('close', function(code) {
                        var match = /(.+)::(.+)::(.+)/.exec(authorInfo);

                        next(null, {
                            date: match[1],
                            name: match[2],
                            email: match[3]
                        });
                    })
                    .stdout.on('data', function(data) {
                        authorInfo = data.toString();
                    });
            },
            message: function(next) {
                var message = '';
                spawn(opts.bin, ['log', '--format=%B', '-n', '1', commitHash])
                    .on('close', function(code) {
                        next(null, message);
                    })
                    .stdout.on('data', function(data) {
                        message += data.toString();
                    });
            }
        }, function(err, result) {
            if (err) return next(err);
            result.hash = commitHash;
            next(null, result);
        })
    });
}

module.exports = getCommitHash;

module.exports.commitInfo = getCommitInfo;

module.exports.fetchAll = fetchAll;
