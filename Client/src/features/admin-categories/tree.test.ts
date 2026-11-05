import { describe, expect, it } from 'vitest';
import type { CategoryNode } from '@/features/categories/types';
import { audio } from '@/test/fixtures';
import { parentOptions, subtreeHeight } from './tree';

const node = (id: string, children: CategoryNode[] = []): CategoryNode => ({
  ...audio,
  id,
  name: id,
  slug: id,
  children,
});

// clothing → men → shirts, audio → headphones
const shirts = node('shirts');
const men = node('men', [shirts]);
const clothing = node('clothing', [men]);
const headphones = node('headphones');
const audioNode = node('audio', [headphones]);
const tree = [clothing, audioNode];

const ids = (category?: CategoryNode) => parentOptions(tree, category).map((o) => o.id);

describe('subtreeHeight', () => {
  it('counts the levels below and including the category', () => {
    expect(subtreeHeight(shirts)).toBe(1);
    expect(subtreeHeight(clothing)).toBe(3);
  });
});

describe('parentOptions', () => {
  it('offers the first two levels for a new category (the third is the deepest)', () => {
    expect(ids()).toEqual(['clothing', 'men', 'audio', 'headphones']);
  });

  it('never offers the category itself or its own subcategories (a cycle)', () => {
    expect(ids(men)).not.toContain('men');
    expect(ids(men)).not.toContain('shirts');
  });

  it('only offers parents where the whole subtree still fits', () => {
    // men has one level below it: only below a top-level category
    expect(ids(men)).toEqual(['clothing', 'audio']);
    // clothing has 3 levels: it can only stay on the top level
    expect(ids(clothing)).toEqual([]);
  });
});
