'use strict';

const assert = require('assert');

jest.dontMock('../target');

const Target = require('../target');

describe('Target', function() {
  it('should exist', function() {
    assert(Target);
  });

  it('should save path and deps', function() {
    let dep    = 'hello';
    let target = new Target(__dirname, [ dep ]);
    assert.strictEqual(target.path, __dirname);
    assert.strictEqual(target.deps[0], dep);
  });

  describe('#changeDeps', function() {
    it('should override dependency list', function() {
      let target = new Target(__dirname, []);
      target.changeDeps([ 'sd' ]);
      assert.strictEqual(target.deps.length, 1);
      assert.strictEqual(target.deps[0], 'sd');
    });
  });
});
