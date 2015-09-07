# quickscope [![Build Status](https://secure.travis-ci.org/kirstein/quickscope.png?branch=master)](https://travis-ci.org/kirstein/quickscope)

> Quickly react to dependecy changes

### Huh?

Quickscope is a watcher that watches given `glob` and all its dependencies. This is absolutely perfect for test running (see [quickscope-cli](https://github.com/kirstein/quickscope-cli))

### Getting started

`npm install quickscope`

### API

```javascript
const Quickscope = require('quickscope');
let qs = new Quickscope('glob', [{ opts }]);

// Register to event
qs.on('event', function () {});
```

returns `quickscope` instance

##### Params

* **glob** - glob or file for watching (**required**)  
  *example*: `**/__tests__/*.js`

* **options** - additional options  
  cwd - cwd...

##### Methods

* **on** - registers for quickscope events

##### Events

* **ready** - all input files have gone through their initial load phase  
* **add** - target that matches the glob has been added
* **unlink** - target has been removed
* **change** - target or dependency has changed

### Example

```javascript
let quickscope = new Quickscope(**/__tests__/*.js)});

quickscope.on('ready', function (files) {
  console.log('ready with targets', files);
});

quickscope.on('add', function (file) {
  console.log('Added new target', file);
});

quickscope.on('unlink', function (file) {
  console.log('Unlinked target', file);
});

quickscope.on('change', function (deps) {
  console.log('List of dependencies changed', deps);
});
```

### Testing 

```bash
npm test
```

## License

MIT
