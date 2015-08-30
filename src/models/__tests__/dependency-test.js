'use strict';

const assert = require('assert');

jest.dontMock('../dependency');
jest.dontMock('lodash');

const Dependency = require('../dependency');

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
      let target = 'hello';
      assert.strictEqual(dep.hasTarget(target), false);
    });

    it('should return true if target exists', function() {
      let dep    = new Dependency(__dirname);
      let target = 'hello';
      dep.addTarget(target);
      assert.strictEqual(dep.hasTarget(target), true);
    });
  });

  describe('#addTarget', function() {
    it('should add targets to list', function() {
      let dep    = new Dependency(__dirname);
      let target = 'hello';
      dep.addTarget(target);
      assert.strictEqual(dep.targets[0], target);
    });

    it('should not add duplicate targets', function() {
      let dep    = new Dependency(__dirname);
      let target = 'hello';
      dep.addTarget(target);
      dep.addTarget(target);
      assert.strictEqual(dep.targets.length, 1);
    });
  });

  describe('#removeTarget', function() {

    it('should remove targets from list', function() {
      let dep    = new Dependency(__dirname);
      let target = 'hello';
      dep.addTarget(target);
      dep.removeTarget(target);
      assert(!dep.targets.length);
    });

    it('should return true if removed an element', function() {
      let dep    = new Dependency(__dirname);
      let target = 'hello';
      dep.addTarget(target);
      assert(dep.removeTarget(target));
    });

    it('should not remove element if its not in the list', function() {
      let dep    = new Dependency(__dirname);
      let target = 'hello';
      dep.addTarget(target);
      dep.removeTarget('wrong');
      assert.strictEqual(dep.targets[0], target);
    });

    it('should return false if removing was not successful', function() {
      let dep    = new Dependency(__dirname);
      let target = 'hello';
      dep.addTarget(target);
      assert(!dep.removeTarget('wrong'));
    });
  });
});
