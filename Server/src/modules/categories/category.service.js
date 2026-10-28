import { AppError } from '../../utils/AppError.js';
import { categoryRepository } from './category.repository.js';
import { slugify } from './category.validation.js';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// e.g. Clothing → Men → Shirts
export const MAX_CATEGORY_DEPTH = 3;

/**
 * Nests a flat category list into a tree via children[] (O(n) with a lookup map)
 */
export const buildCategoryTree = (categories) => {
  const byId = new Map(categories.map((category) => [category.id, { ...category, children: [] }]));
  const roots = [];

  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : null;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
};

const getParentOrFail = async (parentId) => {
  const parent = await categoryRepository.findById(parentId);
  if (!parent) {
    throw new AppError('Parent category not found', 404);
  }
  return parent;
};

const assertSlugAvailable = async (slug, ownId = null) => {
  const conflict = await categoryRepository.findBySlug(slug);
  if (conflict && conflict.id !== ownId) {
    throw new AppError(`A category with the slug "${slug}" already exists`, 409);
  }
};

const assertNameAvailable = async (parentId, name, ownId = null) => {
  const conflict = await categoryRepository.findSiblingByName(parentId, name);
  if (conflict && conflict.id !== ownId) {
    throw new AppError(`A category named "${name}" already exists at this level`, 409);
  }
};

export const categoryService = {
  /**
   * Retrieve all categories, flat (with parent_id) or nested as a tree
   */
  async getAllCategories({ tree = false } = {}) {
    const categories = await categoryRepository.findAll();
    return tree ? buildCategoryTree(categories) : categories;
  },

  /**
   * Retrieve single category by UUID or slug
   */
  async getCategoryByIdOrSlug(idOrSlug) {
    let category = null;

    if (UUID_REGEX.test(idOrSlug)) {
      category = await categoryRepository.findById(idOrSlug);
    }

    if (!category) {
      category = await categoryRepository.findBySlug(idOrSlug);
    }

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    return category;
  },

  /**
   * Create a new category with slug generation.
   * Without an explicit slug, subcategories get their parent's slug as prefix (men-shirts).
   */
  async createCategory({ name, slug, description, parent_id = null }) {
    let parent = null;
    if (parent_id) {
      parent = await getParentOrFail(parent_id);
      const parentDepth = await categoryRepository.getDepth(parent_id);
      if (parentDepth >= MAX_CATEGORY_DEPTH) {
        throw new AppError(
          `Categories can be nested at most ${MAX_CATEGORY_DEPTH} levels deep`,
          400
        );
      }
    }

    const finalSlug = slug ? slugify(slug) : slugify(parent ? `${parent.slug} ${name}` : name);

    await assertSlugAvailable(finalSlug);
    await assertNameAvailable(parent_id, name);

    return await categoryRepository.create({
      name,
      slug: finalSlug,
      description,
      parent_id,
    });
  },

  /**
   * Update category by ID. Moving it (parent_id) keeps its slug so existing URLs stay valid.
   */
  async updateCategory(id, { name, slug, description, parent_id }) {
    // 1. Verify existence
    const existingCategory = await categoryRepository.findById(id);
    if (!existingCategory) {
      throw new AppError('Category not found', 404);
    }

    // 2. Moving: no cycles, and the whole subtree must still fit into MAX_CATEGORY_DEPTH
    const isMoving = parent_id !== undefined && parent_id !== existingCategory.parent_id;
    if (isMoving && parent_id !== null) {
      await getParentOrFail(parent_id);

      const subtreeIds = await categoryRepository.findSubtreeIds(id);
      if (subtreeIds.includes(parent_id)) {
        throw new AppError('A category cannot be moved into itself or its own subcategory', 400);
      }

      const parentDepth = await categoryRepository.getDepth(parent_id);
      const subtreeHeight = await categoryRepository.getSubtreeHeight(id);
      if (parentDepth + subtreeHeight > MAX_CATEGORY_DEPTH) {
        throw new AppError(
          `Categories can be nested at most ${MAX_CATEGORY_DEPTH} levels deep`,
          400
        );
      }
    }

    // 3. Name must stay unique among its (possibly new) siblings
    const finalParentId = parent_id !== undefined ? parent_id : existingCategory.parent_id;
    if (name !== undefined || isMoving) {
      await assertNameAvailable(finalParentId, name ?? existingCategory.name, id);
    }

    // 4. Check slug conflict if slug is being changed
    const finalSlug = slug !== undefined ? slugify(slug) : undefined;
    if (finalSlug && finalSlug !== existingCategory.slug) {
      await assertSlugAvailable(finalSlug, id);
    }

    return await categoryRepository.update(id, {
      name,
      slug: finalSlug,
      description,
      parent_id,
    });
  },

  /**
   * Delete category by ID. Blocked while it still has subcategories or products,
   * so nothing gets lost or orphaned by accident.
   */
  async deleteCategory(id) {
    const existingCategory = await categoryRepository.findById(id);
    if (!existingCategory) {
      throw new AppError('Category not found', 404);
    }

    const { has_children, has_products } = await categoryRepository.getUsage(id);
    if (has_children) {
      throw new AppError('Category still has subcategories. Move or delete them first.', 409);
    }
    if (has_products) {
      throw new AppError(
        'Category still has products (including inactive ones). Move them first.',
        409
      );
    }

    return await categoryRepository.delete(id);
  },
};

export default categoryService;
