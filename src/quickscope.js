'use strict';

const hub       = require('./event-hub');
const path      = require('path');
const spawn     = require('./lib/spawn');
const _         = require('lodash');
const constants = {
  watcher : require('./constants/watcher-constants'),
  target  : require('./constants/target-constants'),
  deps    : require('./constants/dependency-constants')
};

function preparePayload (cwd, path) {
  return {
    path : path,
    cwd  : cwd
  };
}

function buildCmd (cmd, targets) {
  return cmd + ' ' + targets.join(' ');
}

class Runner {
  constructor(cmd, cwd, watcher) {
    this.cmd     = cmd;
    this.cwd     = cwd;
    this.watcher = watcher;
    this._addListeners();
  }

  _addListeners() {
    this.watcher.on('add', this.addTarget.bind(this));
    this.watcher.on('unlink', this.unlinkTarget.bind(this));
    hub.on(constants.watcher.DEPENDENCY_FILE_CHANGED, this.triggerCmd.bind(this));
    hub.on(constants.deps.MULTIPLE_DENENDENCY_DIRTY, this.triggerCmd.bind(this));
  }

  addTarget(target) {
    if (!target) {
      throw new Error('No target defined');
    }
    let data = preparePayload(this.cwd, target);
    console.log('file added: ', target);
    hub.emit(constants.target.TARGET_ADDED, data);
  }

  unlinkTarget(target) {
    if (!target) {
      throw new Error('No target defined');
    }
    console.log('file removed: ', target);
    hub.emit(constants.target.TARGET_REMOVED, path.join(this.cwd, target));
  }

  triggerCmd(dependency) {
    if (!dependency) {
      throw new Error('No dependency given');
    }
    let targets = dependency.targets || _.reduce(dependency, function (res, dep) {
      return _.union(res, dep.targets);
    }, []);
    let cmd = buildCmd(this.cmd, targets);
    console.log('running cmd:', cmd);
    spawn(cmd, this.cwd);
  }
}

module.exports = Runner;
