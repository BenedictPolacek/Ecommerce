import { describe, expect, it } from 'vitest';
import { getPageItems } from './pagination';

describe('getPageItems', () => {
  it.each([
    [1, 1, [1]],
    [1, 3, [1, 2, 3]],
    [1, 10, [1, 2, 'gap', 10]],
    [5, 10, [1, 'gap', 4, 5, 6, 'gap', 10]],
    [3, 10, [1, 2, 3, 4, 'gap', 10]],
    [10, 10, [1, 'gap', 9, 10]],
  ])('page %i of %i', (current, total, expected) => {
    expect(getPageItems(current, total)).toEqual(expected);
  });
});
