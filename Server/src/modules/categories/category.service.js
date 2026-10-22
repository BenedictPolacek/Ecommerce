import { AppError } from '../../utils/AppError.js';
import { categoryRepository } from './category.repository.js';
import { slugify } from './category.validation.js';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const categoryService = {
  /**
   * Retrieve all categories
   */
  async getAllCategories() {
    return await categoryRepository.findAll();
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
   * Create a new category with slug generation
   */
  async createCategory({ name, slug, description }) {
    const finalSlug = slug ? slugify(slug) : slugify(name);

    // Check slug uniqueness proactively
    const existing = await categoryRepository.findBySlug(finalSlug);
    if (existing) {
      throw new AppError(`A category with the slug "${finalSlug}" already exists`, 409);
    }

    return await categoryRepository.create({
      name,
      slug: finalSlug,
      description,
    });
  },

  /**
   * Update category by ID
   */
  async updateCategory(id, { name, slug, description }) {
    // 1. Verify existence
    const existingCategory = await categoryRepository.findById(id);
    if (!existingCategory) {
      throw new AppError('Category not found', 404);
    }

    // 2. Check slug conflict if slug is being changed
    let finalSlug = slug !== undefined ? slugify(slug) : undefined;
    if (finalSlug && finalSlug !== existingCategory.slug) {
      const slugConflict = await categoryRepository.findBySlug(finalSlug);
      if (slugConflict && slugConflict.id !== id) {
        throw new AppError(`A category with the slug "${finalSlug}" already exists`, 409);
      }
    }

    return await categoryRepository.update(id, {
      name,
      slug: finalSlug,
      description,
    });
  },

  /**
   * Delete category by ID
   */
  async deleteCategory(id) {
    const deleted = await categoryRepository.delete(id);
    if (!deleted) {
      throw new AppError('Category not found', 404);
    }
    return deleted;
  },
};

export default categoryService;
