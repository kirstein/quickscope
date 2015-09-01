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

function onNthCall (count, fn) {
  let calls = 0;
  return function () {
    if (++calls === count) {
      fn.apply(this, arguments);
    }
  };
}

describe('watcher store', function() {
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
      this.removeDependency = hub.on.mock.calls[2][1];
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
        on: onNthCall(1, function(evt) {
          assert.strictEqual(evt, 'change');
        })
      });
      this.addDependency([ { path: 'xxx', targets: [ 'xx' ] }]);
    });

    it('should trigger dependency changed event if file changes', function() {
      let mockCb;
      spyOn(chokidar, 'watch').andReturn({
        on: onNthCall(1, function(evt, cb) { mockCb = cb; })
      });
      this.addDependency([ { path: 'xxx', targets: [ 'xx' ] }]);
      mockCb();
      assert.strictEqual(hub.emit.mock.calls[0][0], constants.watcher.DEPENDENCY_CHANGED);
    });

    it('should trigger dependency changed event if file unlinks', function() {
      let mockCb;
      spyOn(chokidar, 'watch').andReturn({
        on: onNthCall(2, function(evt, cb) { mockCb = cb; })
      });
      this.addDependency([ { path: 'xxx', targets: [ 'xx' ] }]);
      mockCb();
      assert.strictEqual(hub.emit.mock.calls[0][0], constants.watcher.DEPENDENCY_REMOVED);
    });
  });

  describe('multiple dependency removing', function() {
    beforeEach(function() {
      store._registerEvents();
      this.addDependency = hub.on.mock.calls[1][1];
      this.removeDependency = hub.on.mock.calls[2][1];
    });

    it('should remove the path from watchers list', function() {
      this.addDependency([ { path: 'xxx', targets: [ 'xx' ] }]);
      this.removeDependency('xxx');
      assert(!store.getWatchers().xxx);
    });

    it('should trigger close on watcher', function() {
      let spy = jasmine.createSpy();
      spyOn(chokidar, 'watch').andReturn({
        on: function() {},
        close: spy
      });
      this.addDependency([ { path: 'xxx', targets: [ 'xx' ] }]);
      this.removeDependency('xxx');
      assert(spy.wasCalled);
    });
  });

  describe('dependency unwatching', function() {
    beforeEach(function() {
      store._registerEvents();
      this.addDependency = hub.on.mock.calls[1][1];
      this.removeDependency = hub.on.mock.calls[2][1];
      this.removeMultipleDependency = hub.on.mock.calls[3][1];
    });

    it('should remove the path from watchers list', function() {
      this.addDependency([ { path: 'xxx', targets: [ 'xx' ] }]);
      this.removeMultipleDependency(['xxx']);
      assert(!store.getWatchers().xxx);
    });

    it('should trigger close on watcher', function() {
      let spy = jasmine.createSpy();
      spyOn(chokidar, 'watch').andReturn({
        on: function() {},
        close: spy
      });
      this.addDependency([ { path: 'xxx', targets: [ 'xx' ] }]);
      this.removeMultipleDependency(['xxx']);
      assert(spy.wasCalled);
    });
  });
});
