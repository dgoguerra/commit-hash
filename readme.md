## commit-hash

Obtain a repository's commit hash from a branch name, tag, or reference.

### Installation

```
npm install commit-hash
```

### Usage

```js
var commitHash = require('commit-hash');

// looking up a short commit hash, in a project in the current directory
commitHash('21f6b', function(err, hash) {
     console.log(hash); // => '21f6ba4e644e77d6e20eaa5156a928b6d75fdf76'
});

// looking up a tag with modifiers, in a project somewhere else
commitHash('v0.1.0^^', {dir: '/home/dgo/repos/commit-hash'}, function(err, hash) {
    console.log(hash); // => '285d19c23a56662bab97c75b4bfc80a175dfdae2'
});

// looking up a remote branch, after fetching from all remotes
// to ensure the local repo has updated references
commitHash('origin/tests-unused-branch', {
    dir: '/home/dgo/repos/commit-hash',
    fetch: true
}, function(err, hash) {
    console.log(hash); // => '3f07195438a6a846554ed4b8cd7b3223a8c5e91e'
});
```

### License

MIT license - http://www.opensource.org/licenses/mit-license.php
