import { catchAsync } from '../../utils/catchAsync.js';
import { categoryService } from './category.service.js';
import { categoryQuerySchema } from './category.validation.js';

export const categoryController = {
  /**
   * List all categories (Public)
   * GET /api/categories?tree=true
   */
  getAll: catchAsync(async (req, res) => {
    const query = categoryQuerySchema.parse(req.query);
    const categories = await categoryService.getAllCategories(query);
    res.status(200).json({
      success: true,
      count: categories.length,
      data: { categories },
    });
  }),

  /**
   * Get single category by ID or slug (Public)
   * GET /api/categories/:id
   */
  getOne: catchAsync(async (req, res) => {
    const category = await categoryService.getCategoryByIdOrSlug(req.params.id);
    res.status(200).json({
      success: true,
      data: { category },
    });
  }),

  /**
   * Create a new category (Admin only)
   * POST /api/categories
   */
  create: catchAsync(async (req, res) => {
    const category = await categoryService.createCategory(req.body);
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category },
    });
  }),

  /**
   * Update an existing category (Admin only)
   * PUT /api/categories/:id
   */
  update: catchAsync(async (req, res) => {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: { category },
    });
  }),

  /**
   * Delete a category (Admin only)
   * DELETE /api/categories/:id
   */
  delete: catchAsync(async (req, res) => {
    await categoryService.deleteCategory(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  }),
};

export default categoryController;
