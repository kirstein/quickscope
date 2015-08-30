'use strict';

const assert = require('assert');

jest.dontMock('../dependency');
jest.dontMock('lodash');

const Dependency = require('../dependency');
const Target     = require('../target');

describe('dependency model', function() {
  it('should exist', function() {
    assert(Dependency);
  });

  describe('initiation', function() {
    it('should add path', function() {
      let dep = new Dependency(__dirname);
      assert.strictEqual(dep.path, __dirname);
    });

    it('should create a list of targets', function() {
      let dep = new Dependency(__dirname);
      assert(Array.isArray(dep.targets));
    });

    it('should throw if no path is given', function() {
      assert.throws(function() {
        new Dependency();
      });
    });
  });

  describe('#hasTarget', function() {
    it('should return false if no targets', function() {
      let dep    = new Dependency(__dirname);
      let target = new Target();
      assert.strictEqual(dep.hasTarget(target), false);
    });

    it('should return true if target exists', function() {
      let dep    = new Dependency(__dirname);
      let target = new Target();
      dep.addTarget(target);
      assert.strictEqual(dep.hasTarget(target), true);
    });
  });

  describe('#addTarget', function() {
    it('should add targets to list', function() {
      let dep    = new Dependency(__dirname);
      let target = new Target();
      dep.addTarget(target);
      assert.strictEqual(dep.targets[0], target);
    });

    it('should not add duplicate targets', function() {
      let dep    = new Dependency(__dirname);
      let target = new Target();
      dep.addTarget(target);
      dep.addTarget(target);
      assert.strictEqual(dep.targets.length, 1);
    });
  });
});
