'use strict';

const _            = require('lodash');
const hub          = require('../event-hub');
const targetConsts = require('../constants/targets-constants');

const Target = require('../target');

/*
 * list of targets with their tree nodes
 *
 * file: [ 'tests' ]
 */
var targetsTree = { };
var targetsList = { };

function buildDependencies (target) {
  _.each(target.deps, function (dep) {
    let deps = targetsTree[dep] = [];
    deps.push(target);
  });
}

exports.add = function (path, deps) {
  let target = new Target(path, deps);
  targetsList[path] = target;
  buildDependencies(target);
  hub.emit(targetConsts.TARGET_ADDED, target);
};

exports.change = function (path, deps) {
  let target = targetsList[path];
  target.changeDeps(deps);
  buildDependencies(target);
  hub.emit(targetConsts.TARGET_CHANGED, target);
};
