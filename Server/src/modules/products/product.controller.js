import { productService } from './product.service.js';
import { productQuerySchema } from './product.validation.js';
import { catchAsync } from '../../utils/catchAsync.js';

// Set by optionalAuthenticate on public routes
const isAdmin = (req) => req.user?.role === 'admin';

export const productController = {
  getAll: catchAsync(async (req, res) => {
    const query = productQuerySchema.parse(req.query);
    const products = await productService.getAllProducts(query, { isAdmin: isAdmin(req) });

    res.status(200).json({
      success: true,
      data: products,
    });
  }),

  /**
   * GET /api/products/:idOrSlug
   */
  getOne: catchAsync(async (req, res) => {
    const product = await productService.getProductByIdOrSlug(req.params.idOrSlug, {
      isAdmin: isAdmin(req),
    });

    res.status(200).json({
      success: true,
      data: product,
    });
  }),

  create: catchAsync(async (req, res) => {
    const product = await productService.createProduct(req.body, req.user.id);

    res.status(201).json({
      success: true,
      data: product,
    });
  }),

  update: catchAsync(async (req, res) => {
    const id = req.idParam || req.params.id;
    const product = await productService.updateProduct(id, req.body);

    res.status(200).json({
      success: true,
      data: product,
    });
  }),

  updateStock: catchAsync(async (req, res) => {
    const id = req.idParam || req.params.id;
    const product = await productService.updateStock(id, req.body, req.user.id);

    res.status(200).json({
      success: true,
      data: product,
    });
  }),

  delete: catchAsync(async (req, res) => {
    const id = req.idParam || req.params.id;
    await productService.deleteProduct(id);

    res.status(200).json({
      success: true,
      data: null,
    });
  }),

  /**
   * POST /api/products/:id/images
   */
  addImage: catchAsync(async (req, res) => {
    const image = await productService.addImage(req.idParam, req.body);

    res.status(201).json({
      success: true,
      data: { image },
    });
  }),

  /**
   * PUT /api/products/:id/images/order
   */
  reorderImages: catchAsync(async (req, res) => {
    const images = await productService.reorderImages(req.idParam, req.body.image_ids);

    res.status(200).json({
      success: true,
      data: { images },
    });
  }),

  /**
   * DELETE /api/products/:id/images/:imageId
   */
  deleteImage: catchAsync(async (req, res) => {
    await productService.deleteImage(req.params.id, req.params.imageId);

    res.status(200).json({
      success: true,
      data: null,
    });
  }),
};

export default productController;
