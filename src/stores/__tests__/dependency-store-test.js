'use strict';

const assert = require('assert');

jest.dontMock('../dependency-store');
jest.dontMock('../../models/dependency');
jest.dontMock('lodash');

const store     = require('../dependency-store');
const hub       = require('../../event-hub');
const constants = {
  file: require('../../constants/file-constants')
};

describe('dependency-store', function() {
  beforeEach(function() {
    hub.emit.mockClear();
    hub.on.mockClear();
    store.clear();
  });

  it('should exist', function() {
    assert(store);
  });

  describe('#getDependencies', function() {
    it('should exists', function() {
      assert(store.getDependencies);
    });
  });

  describe('#clear', function() {
    it('should exists', function() {
      assert(store.clear);
    });

    it('should clear dependencies', function() {
      let deps = store.getDependencies();
      store.clear();
      assert.notStrictEqual(deps, store.getDependencies());
    });
  });

  describe('event registering', function() {
    it('should register to add file event', function() {
      store._registerEvents();
      assert.strictEqual(hub.on.mock.calls[0][0], constants.file.FILE_ADDED);
    });

    it('should register to change file event', function() {
      store._registerEvents();
      assert.strictEqual(hub.on.mock.calls[1][0], constants.file.FILE_CHANGED);
    });
  });

  describe('add file', function() {
    beforeEach(function() {
      store._registerEvents();
      this.addFile = hub.on.mock.calls[0][1];
    });

    it('should throw if no payload is added', function() {
      assert.throws(function() {
        this.addFile();
      });
    });

    it('should add deps to deps', function() {
      this.addFile({
        path: __dirname,
        deps: [ 'one', 'two' ]
      });
      let deps = store.getDependencies();
      assert(deps.one);
      assert(deps.two);
    });

    it('should target locations to deps', function() {
      this.addFile({
        path: __dirname,
        deps: [ 'one' ]
      });
      let one = store.getDependencies().one;
      assert.strictEqual(one.targets.length, 1);
    });

    it('should target multiple target locations to one dep', function() {
      this.addFile({
        path: 'loc2',
        deps: [ 'one' ]
      });
      this.addFile({
        path: 'loc1',
        deps: [ 'one' ]
      });
      let one = store.getDependencies().one;
      assert.strictEqual(one.targets.length, 2);
    });
  });
});
