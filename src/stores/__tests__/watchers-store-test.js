'use strict';

const assert = require('assert');

jest.dontMock('../watchers-store');
jest.dontMock('lodash');

const WatchersStore = require('../watchers-store');
const chokidar      = require('chokidar');
const constants     = {
  deps    : require('../../constants/dependency-constants'),
  watcher : require('../../constants/watcher-constants')
};

function onNthCall (count, fn) {
  let calls = 0;
  return function () {
    if (++calls === count) {
      fn.apply(this, arguments);
    }
  };
}

function nthCall(nr, mock) {
  return mock.argsForCall[nr];
}

function createMockHub () {
  return {
    on: jasmine.createSpy(),
    emit: jasmine.createSpy()
  };
}

describe('watcher store', function() {
  beforeEach(function() {
    this.hub   = createMockHub();
    this.store = new WatchersStore(this.hub);
  });

  describe('event registering', function() {
    it('should register to add file event', function() {
      assert.strictEqual(nthCall(0, this.hub.on)[0], constants.deps.MULTIPLE_DEPENDENCY_ADDED);
    });

    it('should register to change file event', function() {
      assert.strictEqual(nthCall(1, this.hub.on)[0], constants.deps.MULTIPLE_DEPENDENCY_CHANGED);
    });

    it('should register to dependency unwatch event', function() {
      assert.strictEqual(nthCall(2, this.hub.on)[0], constants.deps.DEPENDENCY_UNWATCH);
    });

    it('should register to dependency unwatch event', function() {
      assert.strictEqual(nthCall(3, this.hub.on)[0], constants.deps.MULTIPLE_DEPENDENCY_UNWATCH);
    });
  });

  describe('multiple dependency adding', function() {
    it('should add dependency to watchers list', function() {
      this.store.addMultipleIfNeeded([ { path: 'xxx', targets: [ 'xx' ] }]);
      assert(this.store.getWatchers().xxx);
    });

    it('should not override dependency if its already in list', function() {
      let dep1 = { path: 'xxx', targets: [ 'xx' ]};
      let dep2 = { path: 'xxx', targets: [ 'xx' ]};
      this.store.addMultipleIfNeeded([ dep1 ]);
      this.store.addMultipleIfNeeded([ dep2 ]);
      assert.strictEqual(this.store.getWatchers().xxx.dependency, dep1);
    });

    it('should subscribe to dependency change with correct path', function() {
      spyOn(chokidar, 'watch').andCallThrough();
      this.store.addMultipleIfNeeded([ { path: 'xxx', targets: [ 'xx' ] }]);
      assert.strictEqual(chokidar.watch.mostRecentCall.args[0], 'xxx');
    });

    it('should watch for change event', function() {
      spyOn(chokidar, 'watch').andReturn({
        on: onNthCall(1, function(evt) {
          assert.strictEqual(evt, 'change');
        })
      });
      this.store.addMultipleIfNeeded([ { path: 'xxx', targets: [ 'xx' ] }]);
    });

    it('should trigger dependency changed event if file changes', function() {
      let mockCb;
      spyOn(chokidar, 'watch').andReturn({
        on: onNthCall(1, function(evt, cb) { mockCb = cb; })
      });
      this.store.addMultipleIfNeeded([ { path: 'xxx', targets: [ 'xx' ] }]);
      mockCb();
      assert.strictEqual(nthCall(0, this.hub.emit)[0], constants.watcher.DEPENDENCY_FILE_CHANGED);
    });

    it('should trigger dependency changed event if file unlinks', function() {
      let mockCb;
      spyOn(chokidar, 'watch').andReturn({
        on: onNthCall(2, function(evt, cb) { mockCb = cb; })
      });
      this.store.addMultipleIfNeeded([ { path: 'xxx', targets: [ 'xx' ] }]);
      mockCb();
      assert.strictEqual(nthCall(0, this.hub.emit)[0], constants.watcher.DEPENDENCY_FILE_UNLINK);
    });
  });

  describe('dependency unwatching', function() {
    it('should remove the path from watchers list', function() {
      this.store.addMultipleIfNeeded([ { path: 'xxx', targets: [ 'xx' ] }]);
      this.store.unwatch('xxx');
      assert(!this.store.getWatchers().xxx);
    });

    it('should trigger close on watcher', function() {
      let spy = jasmine.createSpy();
      spyOn(chokidar, 'watch').andReturn({
        on: function() {},
        close: spy
      });
      this.store.addMultipleIfNeeded([ { path: 'xxx', targets: [ 'xx' ] }]);
      this.store.unwatch('xxx');
      assert(spy.wasCalled);
    });
  });

  describe('multiple dependency unwatching', function() {
    it('should remove the path from watchers list', function() {
      this.store.addMultipleIfNeeded([ { path: 'xxx', targets: [ 'xx' ] }]);
      this.store.multipleUnwatch(['xxx']);
      assert(!this.store.getWatchers().xxx);
    });

    it('should trigger close on watcher', function() {
      let spy = jasmine.createSpy();
      spyOn(chokidar, 'watch').andReturn({
        on: function() {},
        close: spy
      });
      this.store.addMultipleIfNeeded([ { path: 'xxx', targets: [ 'xx' ] }]);
      this.store.multipleUnwatch(['xxx']);
      assert(spy.wasCalled);
    });

    it('should remove all dependencies in the list', function() {
      let spy = jasmine.createSpy();
      spyOn(chokidar, 'watch').andReturn({
        on: function() {},
        close: spy
      });
      this.store.addMultipleIfNeeded([
        { path: 'xxx', targets: [ 'xx' ] },
        { path: 'yyy', targets: [ 'zz' ]}
      ]);
      this.store.multipleUnwatch(['xxx', 'yyy']);
      assert(!this.store.getWatchers().xxx);
      assert(!this.store.getWatchers().yyy);
    });
  });
});
