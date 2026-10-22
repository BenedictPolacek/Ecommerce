import { productService } from './product.service.js';
import { productQuerySchema } from './product.validation.js';
import { catchAsync } from '../../utils/catchAsync.js';

export const productController = {
    getAll: catchAsync(async (req, res) => {
        const query = productQuerySchema.parse(req.query);
        const products = await productService.getAllProducts(query);

        res.status(200).json({
            success: true,
            data: products,
        });
    }),

    getOne: catchAsync(async (req, res) => {
        const id = req.idParam || req.params.id;
        const product = await productService.getProductById(id);

        res.status(200).json({
            success: true,
            data: product,
        });
    }),

    create: catchAsync(async (req, res) => {
        const product = await productService.createProduct(req.body);

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
        const stockQuantity = req.body.stock_quantity !== undefined ? req.body.stock_quantity : req.body;
        const product = await productService.updateStock(id, stockQuantity);

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
};

export default productController;