'use strict';

const assert = require('assert');

jest.dontMock('../quickscope');
jest.dontMock('lodash');

const Quickscope = require('../quickscope');
const spawn      = require('../lib/spawn');
const hub        = require('../event-hub');
const chokidar   = require('chokidar');
const constants = {
  watcher: require('../constants/watcher-constants'),
  file: require('../constants/file-constants')
};

describe('Quickscope', function() {
  beforeEach(function() {
    hub.on.mockClear();
    hub.emit.mockClear();
    spawn.mockClear();
  });

  xit('should exist', function() {
    assert(Quickscope);
  });

  describe('initiation', function() {
    it('should subscribe to event hub dependency changed event', function() {
      new Quickscope('cmd', 'cwd', chokidar.watch());
      assert.strictEqual(hub.on.mock.calls[0][0], constants.watcher.DEPENDENCY_CHANGED);
    });
  });

  describe('#addTarget', function() {
    beforeEach(function() {
      this.qs = new Quickscope('cmd', 'cwd', chokidar.watch());
    });

    it('should exist', function() {
      assert(this.qs.addTarget);
    });

    it('should throw if no target is given', function() {
      assert.throws(function() {
        this.qs.addTarget();
      }.bind(this), /target defined/);
    });

    it('should emit file added event', function() {
      this.qs.addTarget('test');
      assert.strictEqual(hub.emit.mock.calls[0][0], constants.file.FILE_ADDED);
    });

    it('should add the correct payload to file added event', function() {
      this.qs.addTarget('target');
      let payload = hub.emit.mock.calls[0][1];
      assert.strictEqual(payload.cwd, 'cwd');
      assert.strictEqual(payload.path, 'target');
    });
  });

  describe('#unlinkTarget', function() {
    beforeEach(function() {
      this.qs = new Quickscope('cmd', 'cwd', chokidar.watch());
    });

    it('should exist', function() {
      assert(this.qs.unlinkTarget);
    });

    it('should throw if no target is given', function() {
      assert.throws(function() {
        this.qs.unlinkTarget();
      }.bind(this), /target defined/);
    });

    it('should emit file removed event', function() {
      this.qs.unlinkTarget('test');
      assert.strictEqual(hub.emit.mock.calls[0][0], constants.file.FILE_REMOVED);
    });

    it('should add the correct payload to file added event', function() {
      this.qs.unlinkTarget('target');
      let payload = hub.emit.mock.calls[0][1];
      assert.strictEqual(payload, 'cwd/target');
    });

  });

  describe('#triggerCmd', function() {
    beforeEach(function() {
      this.qs = new Quickscope('cmd', 'cwd', chokidar.watch());
    });

    it('should exists', function() {
      assert(this.qs.triggerCmd);
    });

    it('should throw if no dependency is given', function() {
      assert.throws(function() {
        this.qs.triggerCmd();
      }.bind(this), /dependency/);
    });

    it('should run spawn', function() {
      this.qs.triggerCmd({
        targets: [ 'x', 'z' ]
      });
      assert(spawn.mock.calls[0]);
    });

    it('should pass spawn cmd and cwd', function() {
      this.qs.triggerCmd({
        targets: [ 'x', 'z' ]
      });
      let call = spawn.mock.calls[0];
      let cmd  = call[0];
      let cwd  = call[1];
      assert.strictEqual(cmd, 'cmd x z');
      assert.strictEqual(cwd, 'cwd');
    });
  });
});
