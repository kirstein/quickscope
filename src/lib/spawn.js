'use strict';

const cp = require('child_process');
const _  = require('lodash');

module.exports = function (command, cwd) {
  if (!command) {
    throw new Error('No command defined');
  }
  let cmd = command.split(' ');
  return cp.spawn(cmd[0], _.drop(cmd), {
    cwd: cwd,
    stdio: 'inherit'
  });
};
