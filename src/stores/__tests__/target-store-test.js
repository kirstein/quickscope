'use strict';

const assert = require('assert');

jest.dontMock('../target-store');

const store        = require('../target-store');
const hub          = require('../../event-hub');
const targetConsts = require('../../constants/targets-constants');
const Target       = require('../../target');

describe('target-store', function() {
  beforeEach(function() {
    hub.emit.mockClear();
  });

  describe('#add', function() {
    it('should exist', function() {
      assert(store.add);
    });

    it('should trigger add event', function() {
      store.add(__dirname, []);
      let lastCall = hub.emit.mock.calls[0];
      assert.strictEqual(lastCall[0], targetConsts.TARGET_ADDED);
    });

    it('should trigger add event with correct target instance', function() {
      store.add(__dirname, []);
      let lastCall = hub.emit.mock.calls[0];
      assert(lastCall[1] instanceof Target);
    });
  });

  describe('#change', function() {
    it('should exist', function() {
      assert(store.change);
    });

    it('should trigger change event', function() {
      store.change(__dirname, []);
      let lastCall = hub.emit.mock.calls[0];
      assert.strictEqual(lastCall[0], targetConsts.TARGET_CHANGED);
    });

    it('should trigger add event with correct target instance', function() {
      store.change(__dirname, []);
      let lastCall = hub.emit.mock.calls[0];
      assert(lastCall[1] instanceof Target);
    });
  });
});
