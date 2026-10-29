import pool from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { paginationMeta, toOffset } from '../../utils/pagination.js';
import { slugify } from '../../utils/slug.js';
import { isUuid } from '../../utils/uuid.js';
import { productRepository } from './product.repository.js';
import { productImageRepository } from './product-image.repository.js';
import { categoryRepository } from '../categories/category.repository.js';
import { stockRepository } from '../stock/stock.repository.js';
import { stockService } from '../stock/stock.service.js';

export const MAX_IMAGES_PER_PRODUCT = 10;

const assertCategoryExists = async (category_id) => {
  if (category_id === undefined || category_id === null) return;
  const category = await categoryRepository.findById(category_id);
  if (!category) throw new AppError('Category not found', 404);
};

const assertSlugAvailable = async (slug, ownId = null) => {
  const conflict = await productRepository.findBySlug(slug);
  if (conflict && conflict.id !== ownId) {
    throw new AppError(`A product with the slug "${slug}" already exists`, 409);
  }
};

/**
 * Picks the first free slug: t-shirt, t-shirt-2, t-shirt-3, ...
 * Product names repeat often, so a generated slug never fails with 409.
 */
export const nextFreeSlug = (base, takenSlugs) => {
  const taken = new Set(takenSlugs);
  if (!taken.has(base)) return base;

  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
};

const generateSlug = async (name) => {
  const base = slugify(name) || 'product';
  const taken = await productRepository.findSlugsStartingWith(base);
  return nextFreeSlug(base, taken);
};

const getProductOrFail = async (id) => {
  const product = await productRepository.findById(id);
  if (!product) throw new AppError('Product not found', 404);
  return product;
};

export const productService = {
  /**
   * Only admins may filter by is_active; everyone else always gets active products.
   * The parameter is ignored (not rejected) so hidden products are not even hinted at.
   */
  async getAllProducts(
    { page = 1, limit = 20, search, category_id, is_active },
    { isAdmin = false } = {}
  ) {
    // is_active arrives as 'true' | 'false' | undefined (query schema keeps it as a string)
    const isActiveFilter = isAdmin && is_active !== undefined ? is_active === 'true' : true;

    const { products, total } = await productRepository.findAll({
      search,
      category_id,
      // public listings default to active products only
      is_active: isActiveFilter,
      limit,
      offset: toOffset({ page, limit }),
    });

    return {
      products,
      pagination: paginationMeta({ page, limit }, total),
    };
  },

  /**
   * Retrieve a product by UUID or slug (/products/mechanical-keyboard).
   * Inactive products only exist for admins; customers get the same 404 as for unknown ones.
   */
  async getProductByIdOrSlug(idOrSlug, { isAdmin = false } = {}) {
    const product = isUuid(idOrSlug)
      ? await productRepository.findById(idOrSlug)
      : await productRepository.findBySlug(idOrSlug);
    if (!product || (!product.is_active && !isAdmin)) {
      throw new AppError('Product not found', 404);
    }
    return product;
  },

  async createProduct(data, userId) {
    if (data.sku && (await productRepository.findBySku(data.sku))) {
      throw new AppError('SKU already exists', 409);
    }
    await assertCategoryExists(data.category_id);

    // An explicit slug must be free; a generated one gets a numeric suffix instead
    let slug;
    if (data.slug) {
      slug = data.slug;
      await assertSlugAvailable(slug);
    } else {
      slug = await generateSlug(data.name);
    }

    // Product and its opening stock movement are written together or not at all
    const client = await pool.connect();
    let created;
    try {
      await client.query('BEGIN');
      created = await productRepository.create({ ...data, slug }, client);
      if (data.stock_quantity > 0) {
        await stockRepository.applyMovement(client, {
          productId: created.id,
          quantity: data.stock_quantity,
          reason: 'initial',
          createdBy: userId,
        });
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Same shape as GET /products/:id (category_name, images)
    return productRepository.findById(created.id);
  },

  /**
   * Renaming keeps the slug so existing links stay valid; only an explicit slug changes it.
   */
  async updateProduct(id, data) {
    const existing = await getProductOrFail(id);

    if (data.sku && data.sku !== existing.sku) {
      const conflict = await productRepository.findBySku(data.sku);
      if (conflict) throw new AppError('SKU already exists', 409);
    }
    if (data.slug && data.slug !== existing.slug) {
      await assertSlugAvailable(data.slug, id);
    }
    await assertCategoryExists(data.category_id);

    const updated = await productRepository.update(id, data);
    if (!updated) throw new AppError('Product not found', 404);
    return productRepository.findById(id);
  },

  /**
   * Inventory count: sets the absolute stock, the difference is logged as an adjustment
   */
  async updateStock(id, { stock_quantity, note }, userId) {
    await stockService.setStock(id, { stock_quantity, note }, userId);
    return getProductOrFail(id);
  },

  async deleteProduct(id) {
    const product = await productRepository.deactivate(id);
    if (!product) throw new AppError('Product not found', 404);
    return product;
  },

  // ─── Images ────────────────────────────────────────────────────────────────

  async addImage(productId, { url, alt_text }) {
    await getProductOrFail(productId);

    const images = await productImageRepository.findByProductId(productId);
    if (images.length >= MAX_IMAGES_PER_PRODUCT) {
      throw new AppError(`A product can have at most ${MAX_IMAGES_PER_PRODUCT} images`, 400);
    }

    return productImageRepository.create(productId, { url, alt_text });
  },

  /**
   * imageIds must list every image of the product exactly once, in the new order
   */
  async reorderImages(productId, imageIds) {
    await getProductOrFail(productId);

    const current = await productImageRepository.findByProductId(productId);
    const currentIds = new Set(current.map((image) => image.id));
    // Same size + no duplicates + all known = exactly the same set ([a, a] for {a, b} fails)
    const isSameSet =
      imageIds.length === currentIds.size &&
      new Set(imageIds).size === imageIds.length &&
      imageIds.every((id) => currentIds.has(id));
    if (!isSameSet) {
      throw new AppError('image_ids must contain every image of this product exactly once', 400);
    }

    await productImageRepository.reorder(productId, imageIds);
    return productImageRepository.findByProductId(productId);
  },

  async deleteImage(productId, imageId) {
    const deleted = await productImageRepository.delete(productId, imageId);
    if (!deleted) throw new AppError('Image not found', 404);
    return deleted;
  },
};

export default productService;
