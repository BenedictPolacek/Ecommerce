import { resetDatabase, closeDatabase } from './helpers/db.js';
import { api, authHeader, createAdmin, createProduct } from './helpers/factories.js';

beforeEach(resetDatabase);
afterAll(closeDatabase);

describe('Category hierarchy', () => {
  let admin;

  const createCategory = (body) =>
    api().post('/api/categories').set(authHeader(admin.token)).send(body);

  const updateCategory = (id, body) =>
    api().put(`/api/categories/${id}`).set(authHeader(admin.token)).send(body);

  const deleteCategory = (id) => api().delete(`/api/categories/${id}`).set(authHeader(admin.token));

  // Clothing → Men → Shirts
  const createThreeLevels = async () => {
    const clothing = (await createCategory({ name: 'Clothing' })).body.data.category;
    const men = (await createCategory({ name: 'Men', parent_id: clothing.id })).body.data.category;
    const shirts = (await createCategory({ name: 'Shirts', parent_id: men.id })).body.data.category;
    return { clothing, men, shirts };
  };

  beforeEach(async () => {
    admin = await createAdmin();
  });

  describe('create', () => {
    it("prefixes the generated slug with the parent's slug", async () => {
      const { shirts } = await createThreeLevels();

      expect(shirts.slug).toBe('clothing-men-shirts');
    });

    it('allows the same name under different parents', async () => {
      const men = (await createCategory({ name: 'Men' })).body.data.category;
      const women = (await createCategory({ name: 'Women' })).body.data.category;

      await createCategory({ name: 'Shirts', parent_id: men.id });
      const res = await createCategory({ name: 'Shirts', parent_id: women.id });

      expect(res.status).toBe(201);
      expect(res.body.data.category.slug).toBe('women-shirts');
    });

    it('rejects a duplicate name among top-level categories (case-insensitive)', async () => {
      await createCategory({ name: 'Books' });
      const res = await createCategory({ name: 'BOOKS', slug: 'books-2' });

      expect(res.status).toBe(409);
    });

    it('rejects a fourth level', async () => {
      const { shirts } = await createThreeLevels();
      const res = await createCategory({ name: 'Polo', parent_id: shirts.id });

      expect(res.status).toBe(400);
    });

    it('returns 404 for an unknown parent', async () => {
      const res = await createCategory({
        name: 'Orphan',
        parent_id: '00000000-0000-4000-8000-000000000000',
      });

      expect(res.status).toBe(404);
    });
  });

  describe('move', () => {
    it('moves a category and keeps its slug', async () => {
      const { men } = await createThreeLevels();
      const sale = (await createCategory({ name: 'Sale' })).body.data.category;

      const res = await updateCategory(men.id, { parent_id: sale.id });

      expect(res.status).toBe(200);
      expect(res.body.data.category).toMatchObject({ parent_id: sale.id, slug: 'clothing-men' });
    });

    it('moves a category to the top level with parent_id null', async () => {
      const { shirts } = await createThreeLevels();

      const res = await updateCategory(shirts.id, { parent_id: null });

      expect(res.status).toBe(200);
      expect(res.body.data.category.parent_id).toBeNull();
    });

    it('rejects moving a category into its own subcategory', async () => {
      const { clothing, shirts } = await createThreeLevels();

      const res = await updateCategory(clothing.id, { parent_id: shirts.id });

      expect(res.status).toBe(400);
    });

    it('rejects a move that would push its subtree beyond three levels', async () => {
      const { men } = await createThreeLevels();
      const sale = (await createCategory({ name: 'Sale' })).body.data.category;
      const outlet = (await createCategory({ name: 'Outlet', parent_id: sale.id })).body.data
        .category;

      // Men has Shirts below it: Sale → Outlet → Men → Shirts would be four levels
      const res = await updateCategory(men.id, { parent_id: outlet.id });

      expect(res.status).toBe(400);
    });
  });

  describe('delete', () => {
    it('blocks deleting a category that has subcategories', async () => {
      const { men } = await createThreeLevels();

      const res = await deleteCategory(men.id);

      expect(res.status).toBe(409);
    });

    it('blocks deleting a category that has products', async () => {
      const books = (await createCategory({ name: 'Books' })).body.data.category;
      await createProduct(admin.token, { category_id: books.id });

      const res = await deleteCategory(books.id);

      expect(res.status).toBe(409);
    });

    it('deletes an empty leaf category', async () => {
      const { shirts } = await createThreeLevels();

      const res = await deleteCategory(shirts.id);

      expect(res.status).toBe(200);
    });
  });

  describe('list', () => {
    it('returns a flat list with parent_id by default', async () => {
      const { clothing, men } = await createThreeLevels();

      const res = await api().get('/api/categories');

      expect(res.body.data.categories).toHaveLength(3);
      expect(res.body.data.categories).toContainEqual(
        expect.objectContaining({ id: men.id, parent_id: clothing.id })
      );
    });

    it('returns a nested tree with ?tree=true', async () => {
      await createThreeLevels();

      const res = await api().get('/api/categories?tree=true');

      expect(res.status).toBe(200);
      const [clothing] = res.body.data.categories;
      expect(clothing.name).toBe('Clothing');
      expect(clothing.children[0].name).toBe('Men');
      expect(clothing.children[0].children[0].name).toBe('Shirts');
    });

    it('rejects an invalid tree value', async () => {
      const res = await api().get('/api/categories?tree=yes');

      expect(res.status).toBe(400);
    });
  });

  it('includes products of subcategories when filtering by category', async () => {
    const { clothing, shirts } = await createThreeLevels();
    const books = (await createCategory({ name: 'Books' })).body.data.category;
    await createProduct(admin.token, { name: 'Oxford Shirt', category_id: shirts.id });
    await createProduct(admin.token, { name: 'Novel', category_id: books.id });

    const res = await api().get(`/api/products?category_id=${clothing.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.products.map((p) => p.name)).toEqual(['Oxford Shirt']);
  });
});
