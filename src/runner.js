'use strict';

const _         = require('lodash');
const hub       = require('./event-hub');
const cp        = require('child_process');
const constants = {
  watcher: require('./constants/watcher-constants')
};

function buildCmd (cmd, targets) {
  let built = cmd + ' ' + targets.join(' ');
  return built.split(' ');
}

function runCmd (cmd, cwd) {
   cp.spawn(cmd[0], _.drop(cmd), {
    cwd: cwd,
    stdio: 'inherit'
  });
}

class Runner {
  constructor(cmd, watcher) {
    this.cmd     = cmd;
    this.watcher = watcher;
    hub.on(constants.watcher.DEPENDENCY_CHANGED, this.triggerCmd.bind(this));
  }

  triggerCmd(dependency) {
    if (!dependency.targets) {
      return;
    }
    let cmd = buildCmd(this.cmd, dependency.targets);
    console.log('running cmd:', cmd.join(' '));
    runCmd(cmd, this.cwd);
  }
}

module.exports = Runner;
