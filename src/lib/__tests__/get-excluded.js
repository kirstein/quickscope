'use strict';

const assert = require('assert');

jest.enableAutomock();
jest.dontMock('../get-excluded');
jest.dontMock('lodash');

const getExcluded = require('../get-excluded');

describe('#getExcluded', function() {
  it('should return [] if both arrays are empty', function() {
    assert.strictEqual(getExcluded([],[]).length, 0);
  });

  it('should return all elements not in array1', function() {
    let arr1 = [ 'tere', 123 ];
    let arr2 = [ 'tere' ];
    assert.strictEqual(getExcluded(arr1, arr2).length, 1);
    assert.strictEqual(getExcluded(arr1, arr2)[0], 123);
  });

  it('should return empty array if arr1 and arr2 and same', function() {
    let arr1 = [ 'tere', 123 ];
    let arr2 = [ 'tere', 123 ];
    assert.strictEqual(getExcluded(arr1, arr2).length, 0);
  });
});
