'use strict';

const _         = require('lodash');
const hub       = require('./event-hub');
const cp        = require('child_process');
const constants = {
  watcher: require('./constants/watcher-constants')
};

function buildCmd (cmd, targets) {
  return (cmd + targets.join()).split(' ');
}

function mapTargets (targets) {
  return _.map(targets, function (target) {
    return target.path;
  });
}

function runCmd (cmd, cwd, cb) {
  let spawn = cp.spawn(cmd[0], _.drop(cmd), {
    cwd: cwd
  });

  spawn.stdout.setEncoding('utf8');
  spawn.stderr.setEncoding('utf8');
  spawn.stdout.on('data', function (data) {
    cb(null, data);
  });

  spawn.stderr.on('data', function (data) {
    cb(data, null);
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
    let targets = mapTargets(dependency.targets);
    let cmd     = buildCmd(this.cmd, targets);
    console.log('running cmd:', cmd.join(' '));
    runCmd(cmd, this.cwd, function (err, data) {
      console.log(err || data);
    });
  }
}

module.exports = Runner;
