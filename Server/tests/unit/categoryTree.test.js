import { buildCategoryTree } from '../../src/modules/categories/category.service.js';

describe('buildCategoryTree', () => {
  it('nests children under their parent, independent of input order', () => {
    const flat = [
      { id: 'shirts', parent_id: 'men', name: 'Shirts' },
      { id: 'books', parent_id: null, name: 'Books' },
      { id: 'men', parent_id: 'clothing', name: 'Men' },
      { id: 'clothing', parent_id: null, name: 'Clothing' },
    ];

    expect(buildCategoryTree(flat)).toEqual([
      { id: 'books', parent_id: null, name: 'Books', children: [] },
      {
        id: 'clothing',
        parent_id: null,
        name: 'Clothing',
        children: [
          {
            id: 'men',
            parent_id: 'clothing',
            name: 'Men',
            children: [{ id: 'shirts', parent_id: 'men', name: 'Shirts', children: [] }],
          },
        ],
      },
    ]);
  });

  it('returns an empty list for no categories', () => {
    expect(buildCategoryTree([])).toEqual([]);
  });
});
