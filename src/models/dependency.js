'use strict';

const _ = require('lodash');

class Dependency {
  constructor(path, cwd) {
    if (!path) {
      throw new Error('No dependency path defined');
    }
    if (!cwd) {
      throw new Error('No cwd defined');
    }
    this.cwd     = cwd;
    this.path    = path;
    this.targets = [];
  }

  addTarget(target) {
    if (this.hasTarget(target)) { return; }
    else if (this.isTarget()) {
      throw new Error('Dependency is already a target. Target can have only one target.');
    }
    this.targets.push(target);
  }

  removeTarget(target) {
    if (!this.hasTarget(target)) {
      return false;
    }
    this.targets = _.without(this.targets, target);
    return true;
  }

  hasTarget(target) {
    return _.includes(this.targets, target);
  }

  isTarget() {
    return this.path === _.first(this.targets);
  }
}

module.exports = Dependency;
