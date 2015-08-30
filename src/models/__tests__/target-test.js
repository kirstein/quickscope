'use strict';

const assert = require('assert');

jest.dontMock('../target');

const Target = require('../target');

describe('target model', function() {
  it('should exist', function() {
    assert(Target);
  });

  describe('initiation', function() {
    it('should write path', function() {
      let target = new Target(__dirname);
      assert.strictEqual(target.path, __dirname);
    });
  });
});
