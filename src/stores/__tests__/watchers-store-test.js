'use strict';

const assert = require('assert');

jest.dontMock('../watchers-store');
jest.dontMock('lodash');

const store     = require('../watchers-store');
const chokidar  = require('chokidar');
const hub       = require('../../event-hub');
const constants = {
  deps: require('../../constants/dependency-constants'),
  watcher: require('../../constants/watcher-constants')
};

describe('placeholder', function() {
  beforeEach(function() {
    hub.emit.mockClear();
    hub.on.mockClear();
    store.clear();
  });

  it('should exist', function() {
    assert(store);
  });

  describe('#clear', function() {
    it('should exists', function() {
      assert(store.clear);
    });

    it('should clear watchers', function() {
      let deps = store.getWatchers();
      store.clear();
      assert.notStrictEqual(deps, store.getWatchers());
    });
  });

  describe('event registering', function() {
    it('should register to add file event', function() {
      store._registerEvents();
      assert.strictEqual(hub.on.mock.calls[0][0], constants.deps.MULTIPLE_DEPENDENCY_ADDED);
    });

    it('should register to change file event', function() {
      store._registerEvents();
      assert.strictEqual(hub.on.mock.calls[1][0], constants.deps.MULTIPLE_DEPENDENCY_CHANGED);
    });
  });

  describe('multiple dependency adding', function() {
    beforeEach(function() {
      store._registerEvents();
      this.addDependency = hub.on.mock.calls[1][1];
    });

    it('should not add dependency to watchers list if there are no targets', function() {
      this.addDependency([ { path: 'xxx' }]);
      assert(!store.getWatchers().xxx);
    });

    it('should add dependency to watchers list', function() {
      this.addDependency([ { path: 'xxx', targets: [ 'xx' ] }]);
      assert(store.getWatchers().xxx);
    });

    it('should not override dependency if its already in list', function() {
      let dep1 = { path: 'xxx', targets: [ 'xx' ]};
      let dep2 = { path: 'xxx', targets: [ 'xx' ]};
      this.addDependency([ dep1 ]);
      this.addDependency([ dep2 ]);
      assert.strictEqual(store.getWatchers().xxx.dependency, dep1);
    });

    it('should subscribe to dependency change with correct path', function() {
      spyOn(chokidar, 'watch').andCallThrough();
      this.addDependency([ { path: 'xxx', targets: [ 'xx' ] }]);
      assert.strictEqual(chokidar.watch.mostRecentCall.args[0], 'xxx');
    });

    it('should watch for change event', function() {
      spyOn(chokidar, 'watch').andReturn({
        on: function(evt) {
          assert.strictEqual(evt, 'change');
        }
      });
      this.addDependency([ { path: 'xxx', targets: [ 'xx' ] }]);
    });

    it('should trigger dependency changed event if file changes', function() {
      let mockCb;
      spyOn(chokidar, 'watch').andReturn({
        on: function(evt, cb) { mockCb = cb; }
      });
      this.addDependency([ { path: 'xxx', targets: [ 'xx' ] }]);
      mockCb();
      assert.strictEqual(hub.emit.mock.calls[0][0], constants.watcher.DEPENDENCY_CHANGED);
    });
  });
});
