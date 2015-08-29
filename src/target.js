'use strict';

class Target {
  constructor(path, deps) {
    this.path = path;
    this.deps = deps;
  }

  changeDeps(deps) {
    this.deps = deps;
  }
}

module.exports = Target;
