import { AppError } from '../../utils/AppError.js';
import { productRepository } from './product.repository.js';
import { categoryRepository } from '../categories/category.repository.js';

const assertCategoryExists = async (category_id) => {
    if (category_id === undefined || category_id === null) return;
    const category = await categoryRepository.findById(category_id);
    if (!category) throw new AppError('Category not found', 404);
};

export const productService = {
    async getAllProducts({ page = 1, limit = 20, search, category_id, is_active }) {
        // is_active arrives as 'true' | 'false' | undefined (query schema keeps it as a string)
        const isActiveFilter = is_active === undefined ? true : is_active === 'true';

        const { products, total } = await productRepository.findAll({
            search,
            category_id,
            // public listings default to active products only
            is_active: isActiveFilter,
            limit,
            offset: (page - 1) * limit,
        });

        return {
            products,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    },

    async getProductById(id) {
        const product = await productRepository.findById(id);
        if (!product) throw new AppError('Product not found', 404);
        return product;
    },

    async createProduct(data) {
        if (data.sku && (await productRepository.findBySku(data.sku))) {
            throw new AppError('SKU already exists', 409);
        }
        await assertCategoryExists(data.category_id);
        return productRepository.create(data);
    },

    async updateProduct(id, data) {
        const existing = await productRepository.findById(id);
        if (!existing) throw new AppError('Product not found', 404);

        if (data.sku && data.sku !== existing.sku) {
            const conflict = await productRepository.findBySku(data.sku);
            if (conflict) throw new AppError('SKU already exists', 409);
        }
        await assertCategoryExists(data.category_id);

        const updated = await productRepository.update(id, data);
        if (!updated) throw new AppError('Product not found', 404);
        return updated;
    },

    async updateStock(id, stock_quantity) {
        const qty = typeof stock_quantity === 'object' && stock_quantity !== null
            ? stock_quantity.stock_quantity
            : stock_quantity;
        const product = await productRepository.updateStock(id, qty);
        if (!product) throw new AppError('Product not found', 404);
        return product;
    },

    async deleteProduct(id) {
        const product = await productRepository.deactivate(id);
        if (!product) throw new AppError('Product not found', 404);
        return product;
    },
};

export default productService;