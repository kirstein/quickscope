'use strict';

const _ = require('lodash');

class Dependency {
  constructor(path) {
    if (!path) {
      throw new Error('No dependency path defined');
    }
    this.path    = path;
    this.targets = [];
  }

  addTarget(target) {
    if (!this.hasTarget(target)) {
      this.targets.push(target);
    }
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
}

module.exports = Dependency;
