// Shared by GET /orders and GET /orders/all
const ORDER_LIST_PARAMETERS = [
  {
    name: 'status',
    in: 'query',
    required: false,
    schema: {
      type: 'string',
      enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    },
    description: 'Only orders with this status',
  },
  { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
  {
    name: 'limit',
    in: 'query',
    required: false,
    schema: { type: 'integer', default: 20, maximum: 100 },
  },
];

// { success, message } responses without data
const messageResponse = (description, message) => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: message },
        },
      },
    },
  },
});

const errorResponse = (description, message) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
      example: { success: false, message },
    },
  },
});

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Ecommerce REST API',
    version: '1.0.0',
    description:
      'A feature-based REST API for an eCommerce platform backed by PostgreSQL. Implements authentication, category & product catalogs, inventory management, shopping cart, user addresses, and a transactional checkout/order system.',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'API base path',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication & session management' },
    { name: 'Users', description: 'User account & profile management' },
    { name: 'Categories', description: 'Product category catalog' },
    { name: 'Products', description: 'Product catalog & inventory management' },
    { name: 'Cart', description: 'Shopping cart & item quantity management' },
    { name: 'Addresses', description: 'Customer shipping and billing addresses' },
    { name: 'Orders', description: 'Checkout & order lifecycle management' },
    { name: 'Health', description: 'System health and status' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT token in Authorization header: `Bearer <token>`',
      },
      CookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'token',
        description: 'JWT token stored in httpOnly cookie automatically upon login',
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication token is missing, invalid, or expired',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Authentication token missing. Please log in.',
            },
          },
        },
      },
      ForbiddenError: {
        description: 'Insufficient permissions (admin required)',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Forbidden. You do not have permission to perform this action.',
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Resource not found',
            },
          },
        },
      },
      TooManyRequestsError: {
        description:
          'Rate limit reached (10 requests per 15 minutes per IP for login, registration and email links). The `RateLimit` header tells when to retry.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Too many attempts. Please try again in 15 minutes.',
            },
          },
        },
      },
      ValidationError: {
        description: 'Request validation failed',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Validation failed',
              errors: [
                {
                  field: 'email',
                  message: 'Please provide a valid email address',
                },
              ],
            },
          },
        },
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error description' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'e3b0c442-98fc-1c14-9afb-4c8996fb9242' },
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          first_name: { type: 'string', example: 'John' },
          last_name: { type: 'string', example: 'Doe' },
          role: { type: 'string', enum: ['customer', 'admin'], example: 'customer' },
          email_verified_at: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'null until the email address is confirmed; required for checkout',
          },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'first_name', 'last_name'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', minLength: 6, example: 'password123' },
          first_name: { type: 'string', example: 'John' },
          last_name: { type: 'string', example: 'Doe' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', example: 'password123' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Login successful' },
          data: {
            type: 'object',
            properties: {
              token: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsIn...',
                description: 'Access token (JWT), valid for 15 minutes by default',
              },
              refreshToken: {
                type: 'string',
                example: 'q3V9cL0x...',
                description:
                  'Single-use refresh token for POST /auth/refresh (also set as httpOnly cookie `refresh_token`)',
              },
              user: { $ref: '#/components/schemas/User' },
            },
          },
        },
      },
      RefreshTokenRequest: {
        type: 'object',
        description: 'Browsers can omit the body: the `refresh_token` cookie is used instead',
        properties: {
          refreshToken: { type: 'string', example: 'q3V9cL0x...' },
        },
      },
      TokenPairResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Token refreshed' },
          data: {
            type: 'object',
            properties: {
              token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' },
              refreshToken: { type: 'string', example: 'r8Kp2mZt...' },
            },
          },
        },
      },
      Session: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_agent: { type: 'string', nullable: true, example: 'Mozilla/5.0 (Windows NT 10.0)' },
          created_at: { type: 'string', format: 'date-time' },
          last_used_at: {
            type: 'string',
            format: 'date-time',
            description: 'Last token refresh',
          },
          expires_at: { type: 'string', format: 'date-time' },
          current: { type: 'boolean', description: 'The session this request comes from' },
        },
      },
      UpdateProfileRequest: {
        type: 'object',
        properties: {
          first_name: { type: 'string', example: 'Jane' },
          last_name: { type: 'string', example: 'Smith' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'b0a70183-4bc9-4b6e-8263-1282be344d9f' },
          parent_id: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'null for top-level categories',
          },
          name: { type: 'string', example: 'Electronics' },
          slug: { type: 'string', example: 'electronics' },
          description: { type: 'string', example: 'Gadgets, devices, and accessories' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      CategoryTreeNode: {
        allOf: [
          { $ref: '#/components/schemas/Category' },
          {
            type: 'object',
            properties: {
              children: {
                type: 'array',
                items: { $ref: '#/components/schemas/CategoryTreeNode' },
              },
            },
          },
        ],
      },
      CreateCategoryRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'Shirts' },
          slug: {
            type: 'string',
            example: 'men-shirts',
            description: "Optional. Defaults to the name, prefixed with the parent's slug",
          },
          description: { type: 'string', example: 'Casual and formal shirts' },
          parent_id: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Parent category. Max 3 levels deep',
          },
        },
      },
      UpdateCategoryRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Home Appliances & Electronics' },
          slug: { type: 'string', example: 'home-appliances-electronics' },
          description: { type: 'string', example: 'Updated category description' },
          parent_id: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description:
              'Move the category (null = top level). Not allowed into its own subtree or beyond 3 levels. The slug is kept.',
          },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '4a0f4a7c-87d3-4613-8d0a-9d62d2948eb3' },
          name: { type: 'string', example: 'Wireless Mechanical Keyboard' },
          slug: { type: 'string', example: 'wireless-mechanical-keyboard' },
          sku: { type: 'string', example: 'KB-WL-001' },
          description: { type: 'string', example: 'Compact 75% hot-swappable keyboard' },
          price_cents: {
            type: 'integer',
            example: 9999,
            description: 'Gross price incl. VAT in cents (9999 = 99.99 €)',
          },
          stock_quantity: { type: 'integer', example: 45 },
          category_id: { type: 'string', format: 'uuid', nullable: true },
          category_name: { type: 'string', nullable: true, example: 'Computer Accessories' },
          is_active: { type: 'boolean', example: true },
          primary_image: {
            type: 'object',
            nullable: true,
            description: 'Only in list responses: the image with the lowest sort_order',
            properties: {
              url: { type: 'string', example: 'https://cdn.example.com/keyboard-front.jpg' },
              alt_text: { type: 'string', nullable: true },
            },
          },
          images: {
            type: 'array',
            description: 'Only in single-product responses, ordered by sort_order',
            items: { $ref: '#/components/schemas/ProductImage' },
          },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      ProductImage: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          url: { type: 'string', example: 'https://cdn.example.com/keyboard-front.jpg' },
          alt_text: { type: 'string', nullable: true, example: 'Keyboard, front view' },
          sort_order: { type: 'integer', example: 0, description: '0 = primary image' },
        },
      },
      AddProductImageRequest: {
        type: 'object',
        required: ['url'],
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            example: 'https://cdn.example.com/keyboard-front.jpg',
            description:
              'http(s) only. The file is hosted elsewhere (CDN), only the URL is stored.',
          },
          alt_text: { type: 'string', example: 'Keyboard, front view' },
        },
      },
      CreateProductRequest: {
        type: 'object',
        required: ['name', 'price_cents'],
        properties: {
          name: { type: 'string', example: 'Wireless Mechanical Keyboard' },
          slug: {
            type: 'string',
            example: 'wireless-mechanical-keyboard',
            description: 'Optional. Generated from the name; duplicates get -2, -3, ...',
          },
          sku: { type: 'string', example: 'KB-WL-001' },
          description: { type: 'string', example: 'Compact 75% mechanical switches' },
          price_cents: { type: 'integer', example: 9999, description: 'Gross price in cents' },
          stock_quantity: {
            type: 'integer',
            example: 45,
            default: 0,
            description: 'Opening stock, recorded as an `initial` stock movement',
          },
          category_id: { type: 'string', format: 'uuid', nullable: true },
          is_active: { type: 'boolean', default: true },
        },
      },
      UpdateProductRequest: {
        type: 'object',
        description:
          'stock_quantity is rejected here (400); use PATCH /products/{id}/stock or POST /products/{id}/stock-movements',
        properties: {
          name: { type: 'string', example: 'Updated Keyboard Name' },
          slug: {
            type: 'string',
            example: 'keyboard-v2',
            description: 'Renaming keeps the old slug; send this to change it explicitly',
          },
          sku: { type: 'string', example: 'KB-WL-001-V2' },
          description: { type: 'string', example: 'Enhanced bluetooth support' },
          price_cents: { type: 'integer', example: 10999 },
          category_id: { type: 'string', format: 'uuid', nullable: true },
          is_active: { type: 'boolean' },
        },
      },
      UpdateStockRequest: {
        type: 'object',
        required: ['stock_quantity'],
        properties: {
          stock_quantity: { type: 'integer', minimum: 0, example: 100 },
          note: { type: 'string', maxLength: 500, example: 'Inventory count 2026' },
        },
      },
      StockMovement: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          product_id: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer', example: -2, description: 'Signed change (+ in, - out)' },
          balance_after: { type: 'integer', example: 43, description: 'Stock after this movement' },
          reason: {
            type: 'string',
            enum: ['initial', 'sale', 'order_cancelled', 'restock', 'damage', 'adjustment'],
            example: 'sale',
          },
          order_id: { type: 'string', format: 'uuid', nullable: true },
          order_number: {
            type: 'string',
            nullable: true,
            example: 'ORD-2026-001001',
            description: 'Only in the history list',
          },
          created_by: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Customer for a sale, admin otherwise; null for seed/migration data',
          },
          note: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      RecordStockMovementRequest: {
        type: 'object',
        required: ['reason', 'quantity'],
        properties: {
          reason: { type: 'string', enum: ['restock', 'damage', 'adjustment'] },
          quantity: {
            type: 'integer',
            example: 50,
            description: 'Signed, not 0: restock > 0, damage < 0, adjustment either',
          },
          note: { type: 'string', maxLength: 500, example: 'Delivery #42' },
        },
      },
      ProductListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              products: {
                type: 'array',
                items: { $ref: '#/components/schemas/Product' },
              },
              pagination: { $ref: '#/components/schemas/Pagination' },
            },
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 1 },
          totalPages: { type: 'integer', example: 1 },
        },
      },
      OrderSummary: {
        type: 'object',
        description: 'Order without items; GET /orders/{id} returns the full order',
        properties: {
          id: { type: 'string', format: 'uuid' },
          order_number: { type: 'string', example: 'ORD-2026-001001' },
          user_id: { type: 'string', format: 'uuid' },
          status: { type: 'string', example: 'paid' },
          currency: { type: 'string', example: 'EUR' },
          subtotal_cents: { type: 'integer', example: 2100 },
          shipping_fee_cents: { type: 'integer', example: 499 },
          tax_cents: { type: 'integer', example: 415 },
          total_cents: { type: 'integer', example: 2599 },
          item_count: { type: 'integer', example: 2, description: 'Number of units ordered' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      OrderListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              orders: {
                type: 'array',
                items: { $ref: '#/components/schemas/OrderSummary' },
              },
              pagination: { $ref: '#/components/schemas/Pagination' },
            },
          },
        },
      },
      CartItem: {
        type: 'object',
        properties: {
          cart_item_id: { type: 'string', format: 'uuid' },
          cart_id: { type: 'string', format: 'uuid' },
          product_id: { type: 'string', format: 'uuid' },
          product_name: { type: 'string', example: 'Wireless Mechanical Keyboard' },
          sku: { type: 'string', example: 'KB-WL-001' },
          price_cents: { type: 'integer', example: 9999 },
          quantity: { type: 'integer', example: 2 },
          line_total_cents: { type: 'integer', example: 19998 },
          stock_quantity: { type: 'integer', example: 45 },
          is_active: { type: 'boolean', example: true },
        },
      },
      Cart: {
        type: 'object',
        description:
          'Totals use the same calculation as checkout, so the customer sees the final price.',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/CartItem' },
          },
          totalItems: { type: 'integer', example: 2 },
          subtotalCents: { type: 'integer', example: 19998 },
          shippingFeeCents: { type: 'integer', example: 0, description: 'Free from 50 € on' },
          taxCents: { type: 'integer', example: 3193, description: 'VAT contained in totalCents' },
          totalCents: { type: 'integer', example: 19998 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AddCartItemRequest: {
        type: 'object',
        required: ['productId', 'quantity'],
        properties: {
          productId: {
            type: 'string',
            format: 'uuid',
            example: '4a0f4a7c-87d3-4613-8d0a-9d62d2948eb3',
          },
          quantity: { type: 'integer', minimum: 1, example: 1 },
        },
      },
      UpdateCartItemRequest: {
        type: 'object',
        required: ['quantity'],
        properties: {
          quantity: { type: 'integer', minimum: 1, example: 3 },
        },
      },
      Address: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
          user_id: { type: 'string', format: 'uuid' },
          address_line1: { type: 'string', example: '123 Main Street' },
          address_line2: { type: 'string', nullable: true, example: 'Suite 400' },
          city: { type: 'string', example: 'New York' },
          state: { type: 'string', nullable: true, example: 'NY' },
          postal_code: { type: 'string', example: '10001' },
          country: { type: 'string', example: 'US' },
          is_default: { type: 'boolean', example: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      CreateAddressRequest: {
        type: 'object',
        required: ['address_line1', 'city', 'postal_code', 'country'],
        properties: {
          address_line1: { type: 'string', example: '123 Main Street' },
          address_line2: { type: 'string', nullable: true, example: 'Suite 400' },
          city: { type: 'string', example: 'New York' },
          state: { type: 'string', nullable: true, example: 'NY' },
          postal_code: { type: 'string', example: '10001' },
          country: { type: 'string', minLength: 2, maxLength: 2, example: 'US' },
          is_default: { type: 'boolean', default: false },
        },
      },
      UpdateAddressRequest: {
        type: 'object',
        properties: {
          address_line1: { type: 'string', example: '456 Broadway' },
          address_line2: { type: 'string', nullable: true, example: 'Apt 2B' },
          city: { type: 'string', example: 'New York' },
          state: { type: 'string', nullable: true, example: 'NY' },
          postal_code: { type: 'string', example: '10002' },
          country: { type: 'string', example: 'US' },
          is_default: { type: 'boolean', example: false },
        },
      },
      OrderItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          order_id: { type: 'string', format: 'uuid' },
          product_id: { type: 'string', format: 'uuid' },
          product_name: { type: 'string', example: 'Wireless Mechanical Keyboard' },
          unit_price_cents: { type: 'integer', example: 9999 },
          quantity: { type: 'integer', example: 2 },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'c1f7dfaa-3475-430c-b26a-9359332ea679' },
          order_number: {
            type: 'string',
            example: 'ORD-2026-001001',
            description: 'Human-readable, assigned by the database',
          },
          user_id: { type: 'string', format: 'uuid' },
          currency: { type: 'string', example: 'EUR', description: 'ISO 4217 code' },
          status: {
            type: 'string',
            enum: [
              'pending',
              'paid',
              'processing',
              'shipped',
              'delivered',
              'cancelled',
              'refunded',
            ],
            example: 'pending',
          },
          subtotal_cents: { type: 'integer', example: 2100 },
          shipping_fee_cents: { type: 'integer', example: 499 },
          total_cents: {
            type: 'integer',
            example: 2599,
            description: 'subtotal_cents + shipping_fee_cents',
          },
          tax_cents: {
            type: 'integer',
            example: 415,
            description: 'VAT contained in total_cents (not added on top)',
          },
          vat_rate_percent: {
            type: 'integer',
            nullable: true,
            example: 19,
            description:
              'VAT rate at the time of the order; null for orders before this field existed',
          },
          shipping_address: { $ref: '#/components/schemas/CreateAddressRequest' },
          billing_address: {
            $ref: '#/components/schemas/CreateAddressRequest',
            description: 'Snapshot; equals shipping_address unless a billing address was given',
          },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/OrderItem' },
          },
          payments: {
            type: 'array',
            items: { $ref: '#/components/schemas/Payment' },
          },
          status_history: {
            type: 'array',
            description: 'Oldest first. Customers only get from_status, to_status and created_at.',
            items: { $ref: '#/components/schemas/OrderStatusHistoryEntry' },
          },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      CheckoutRequest: {
        type: 'object',
        description:
          'Provide either `addressId` for an existing address OR `shippingAddress` for a custom address. Shipping fee and tax are always calculated by the server.',
        properties: {
          addressId: { type: 'string', format: 'uuid', description: 'Existing user address UUID' },
          shippingAddress: { $ref: '#/components/schemas/CreateAddressRequest' },
          billingAddressId: {
            type: 'string',
            format: 'uuid',
            description:
              'Optional saved address for billing (takes precedence over billingAddress)',
          },
          billingAddress: {
            $ref: '#/components/schemas/CreateAddressRequest',
            description: 'Optional. Without billingAddress/billingAddressId, billing = shipping',
          },
        },
      },
      Payment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          order_id: { type: 'string', format: 'uuid' },
          provider: { type: 'string', example: 'manual' },
          provider_payment_id: { type: 'string', nullable: true, example: 'SEPA-2026-0042' },
          status: {
            type: 'string',
            enum: ['pending', 'succeeded', 'failed', 'cancelled', 'refunded'],
            example: 'succeeded',
          },
          amount_cents: { type: 'integer', example: 2599 },
          currency: { type: 'string', example: 'EUR', description: 'Always the order currency' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      RecordPaymentRequest: {
        type: 'object',
        properties: {
          provider: {
            type: 'string',
            default: 'manual',
            example: 'bank_transfer',
            description: 'Lowercase letters, digits and underscores',
          },
          providerPaymentId: {
            type: 'string',
            example: 'SEPA-2026-0042',
            description: 'Optional reference; unique per provider',
          },
          amountCents: {
            type: 'integer',
            minimum: 1,
            example: 2599,
            description: 'Defaults to the outstanding balance of the order',
          },
        },
      },
      UpdateOrderStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
            description: '`paid` is set by recording a payment, `pending` is only the start state',
            example: 'processing',
          },
          note: {
            type: 'string',
            maxLength: 500,
            example: 'Customer asked to cancel by phone',
            description: 'Internal note stored in the status history (admins only)',
          },
        },
      },
      OrderStatusHistoryEntry: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Admins only' },
          order_id: { type: 'string', format: 'uuid', description: 'Admins only' },
          from_status: { type: 'string', nullable: true, example: 'paid' },
          to_status: { type: 'string', example: 'processing' },
          changed_by: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Admins only. Customer (checkout) or admin; null for migrated data',
          },
          note: { type: 'string', nullable: true, description: 'Admins only' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Service health check',
        responses: {
          200: {
            description: 'API is running and healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    message: { type: 'string', example: 'Ecommerce REST API is running' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new customer account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          409: {
            description: 'Email already registered',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { success: false, message: 'Email already registered' },
              },
            },
          },
          429: { $ref: '#/components/responses/TooManyRequestsError' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in to an existing account',
        description:
          'Starts a new session. Returns an access token (JWT) and a refresh token, and sets them as httpOnly cookies `token` and `refresh_token` (the latter only sent to /api/auth).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Authentication successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { success: false, message: 'Invalid email or password' },
              },
            },
          },
          429: { $ref: '#/components/responses/TooManyRequestsError' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out current session',
        description:
          'Revokes the current session (found via refresh token, or via the access token even if expired) and clears both cookies. Always 200.',
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Logged out successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Logged out successfully' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Get a new token pair with the refresh token (rotation)',
        description:
          'Each refresh token works once and is replaced by a new one. Using an already used refresh token again is treated as theft: the whole session is revoked (401).',
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'New access and refresh token (also set as cookies)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokenPairResponse' },
              },
            },
          },
          401: {
            description: 'Refresh token missing, unknown, expired, revoked or reused',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/auth/logout-all': {
      post: {
        tags: ['Auth'],
        summary: 'Log out of all sessions (every device)',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          200: {
            description: 'All sessions revoked',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Logged out of 3 session(s)' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/auth/sessions': {
      get: {
        tags: ['Auth'],
        summary: 'List my active sessions (devices)',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          200: {
            description: 'Active sessions, most recently used first',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        sessions: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Session' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/auth/sessions/{id}': {
      delete: {
        tags: ['Auth'],
        summary: 'End one of my sessions (e.g. a lost phone)',
        description: "Someone else's session returns 404.",
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Session UUID',
          },
        ],
        responses: {
          200: {
            description: 'Session ended',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Session ended' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Confirm the email address',
        description:
          'Registration sends an email with a link to `${APP_URL}/verify-email?token=...`. The frontend posts that token here. Single use, valid for 24 hours. No login required (the link may be opened on another device).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: { token: { type: 'string', example: 'Zk3q...' } },
              },
            },
          },
        },
        responses: {
          200: messageResponse('Email address verified', 'Email address verified'),
          400: errorResponse(
            'Validation failed, or the token is unknown, used or expired',
            'Invalid or expired verification link. Please request a new one.'
          ),
          429: { $ref: '#/components/responses/TooManyRequestsError' },
        },
      },
    },
    '/auth/verify-email/resend': {
      post: {
        tags: ['Auth'],
        summary: 'Send a new verification email',
        description:
          'Older links stop working. At most one email per minute. Locally the mails show up in Mailpit (http://localhost:8025).',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          200: messageResponse('Email sent', 'Verification email sent'),
          400: errorResponse('Already verified', 'Email address is already verified'),
          401: { $ref: '#/components/responses/UnauthorizedError' },
          429: errorResponse(
            'An email was sent less than a minute ago',
            'Please wait a minute before requesting another email.'
          ),
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password reset link',
        description:
          'Always answers 200 with the same message, whether or not the account exists, so nobody can find out which emails are registered. If it exists, a link to `${APP_URL}/reset-password?token=...` is sent (valid for 1 hour, at most one email per minute).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: {
          200: messageResponse(
            'Same answer for every email address',
            'If an account with this email exists, we have sent a password reset link.'
          ),
          400: { $ref: '#/components/responses/ValidationError' },
          429: { $ref: '#/components/responses/TooManyRequestsError' },
        },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Set a new password with the token from the reset link',
        description:
          'Single use. Ends all sessions of the user (every device must log in again), clears the auth cookies, marks the email as verified and sends a "password changed" notice.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: {
                  token: { type: 'string', example: 'Zk3q...' },
                  password: { type: 'string', minLength: 6, example: 'new-password123' },
                },
              },
            },
          },
        },
        responses: {
          200: messageResponse(
            'Password changed, all sessions ended',
            'Password has been reset. Please log in with your new password.'
          ),
          400: errorResponse(
            'Validation failed, or the token is unknown, used or expired',
            'Invalid or expired password reset link. Please request a new one.'
          ),
          429: { $ref: '#/components/responses/TooManyRequestsError' },
        },
      },
    },
    '/users/me/password': {
      patch: {
        tags: ['Users'],
        summary: 'Change my password',
        description:
          'Requires the current password. Other sessions are ended, the current one stays logged in. Sends a "password changed" notice.',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string', example: 'password123' },
                  newPassword: { type: 'string', minLength: 6, example: 'new-password123' },
                },
              },
            },
          },
        },
        responses: {
          200: messageResponse(
            'Password changed',
            'Password changed. Your other devices have been logged out.'
          ),
          400: errorResponse(
            'Validation failed, or the current password is wrong',
            'Current password is incorrect'
          ),
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get current user profile',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          200: {
            description: 'User profile retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update current user profile',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateProfileRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'User profile updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete my account (GDPR)',
        description:
          'Requires the current password. Without orders the account is deleted. With orders it is anonymized (email, name and password removed, `deleted_at` set), because invoices must be kept for 10 years (§ 147 AO); the orders, including their address snapshots, stay. Addresses, cart, sessions and email tokens are deleted either way. All sessions end, the auth cookies are cleared and a confirmation email is sent. Blocked while orders are still open (pending, paid, processing, shipped). The last admin cannot delete their account.',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: { password: { type: 'string', example: 'password123' } },
              },
            },
          },
        },
        responses: {
          200: messageResponse('Account deleted', 'Your account has been deleted.'),
          400: errorResponse(
            'Validation failed, or the password is wrong',
            'Password is incorrect'
          ),
          401: { $ref: '#/components/responses/UnauthorizedError' },
          409: errorResponse(
            'Open orders, or the last admin',
            'There are still open orders. The account can be deleted once they are completed.'
          ),
        },
      },
    },
    '/users/{id}': {
      delete: {
        tags: ['Users'],
        summary: 'Delete a customer account (admin only)',
        description:
          'For deletion requests that reach support (email, phone). Same rules as DELETE /users/me, without the password. Admin accounts are refused (403).',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'User UUID',
          },
        ],
        responses: {
          200: messageResponse('User deleted or anonymized', 'User has been deleted.'),
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: errorResponse(
            'Not an admin, or the target is an admin',
            'Admin accounts cannot be deleted here. Demote the admin first.'
          ),
          404: { $ref: '#/components/responses/NotFoundError' },
          409: errorResponse(
            'The customer still has open orders',
            'There are still open orders. The account can be deleted once they are completed.'
          ),
        },
      },
    },
    '/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List all categories',
        parameters: [
          {
            name: 'tree',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['true', 'false'] },
            description:
              'true = nested top-level categories with children[]; default = flat list with parent_id',
          },
        ],
        responses: {
          200: {
            description: 'List of categories (flat, or nested when tree=true)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    count: { type: 'integer', example: 4 },
                    data: {
                      type: 'object',
                      properties: {
                        categories: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/CategoryTreeNode' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
      post: {
        tags: ['Categories'],
        summary: 'Create a new category (Admin)',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateCategoryRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Category created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Category' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
        },
      },
    },
    '/categories/{id}': {
      get: {
        tags: ['Categories'],
        summary: 'Get category by ID or slug',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Category UUID or unique slug',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Category details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Category' },
                  },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
      put: {
        tags: ['Categories'],
        summary: 'Update category (Admin)',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Category UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateCategoryRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Category updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Category' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
      delete: {
        tags: ['Categories'],
        summary: 'Delete category (Admin)',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Category UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: { description: 'Category successfully deleted' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
          404: { $ref: '#/components/responses/NotFoundError' },
          409: { description: 'Category still has subcategories or products' },
        },
      },
    },
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'List products with filtering and pagination',
        parameters: [
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 1 },
            description: 'Page number',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 20 },
            description: 'Number of products per page',
          },
          {
            name: 'search',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description:
              'Full-text search on name (ranked higher) and description. English stemming, every word must match as a prefix ("mech keyb"). Results are sorted by relevance.',
          },
          {
            name: 'category_id',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
            description: 'Filter by category UUID, including all of its subcategories',
          },
          {
            name: 'is_active',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['true', 'false'] },
            description:
              'Admins only: filter by active status. Ignored for everyone else, who always gets active products.',
          },
        ],
        responses: {
          200: {
            description: 'Paginated list of products',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProductListResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Create a new product (Admin)',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateProductRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Product created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Product' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
          409: {
            description: 'SKU or slug already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { success: false, message: 'SKU already exists' },
              },
            },
          },
        },
      },
    },
    '/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get single product by UUID or slug (includes all images)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description:
              'Product UUID or slug, e.g. mechanical-keyboard. Inactive products return 404 unless the caller is an admin.',
          },
        ],
        responses: {
          200: {
            description: 'Product details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Product' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
      put: {
        tags: ['Products'],
        summary: 'Update product details (Admin)',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Product UUID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateProductRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Product updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Product' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Delete product (Admin)',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Product UUID',
          },
        ],
        responses: {
          204: { description: 'Product deleted' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/products/{id}/images': {
      post: {
        tags: ['Products'],
        summary: 'Add an image to the end of the gallery (Admin, max 10)',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AddProductImageRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Image added',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: { image: { $ref: '#/components/schemas/ProductImage' } },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/products/{id}/images/order': {
      put: {
        tags: ['Products'],
        summary: 'Reorder images; the first ID becomes the primary image (Admin)',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['image_ids'],
                properties: {
                  image_ids: {
                    type: 'array',
                    description: 'Every image ID of the product exactly once, in the new order',
                    items: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Images in their new order',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        images: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/ProductImage' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/products/{id}/images/{imageId}': {
      delete: {
        tags: ['Products'],
        summary: 'Delete an image (Admin)',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          {
            name: 'imageId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: { description: 'Image deleted' },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/products/{id}/stock-movements': {
      get: {
        tags: ['Products'],
        summary: 'Stock history of a product (Admin, paginated, newest first)',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Product UUID',
          },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          200: {
            description: 'One page of stock movements',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        movements: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/StockMovement' },
                        },
                        pagination: { $ref: '#/components/schemas/Pagination' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Record a restock, damage or adjustment (Admin)',
        description:
          'Relative change. Sales, cancellations and opening stock are recorded automatically and cannot be posted here.',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Product UUID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RecordStockMovementRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Movement recorded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: { movement: { $ref: '#/components/schemas/StockMovement' } },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
          404: { $ref: '#/components/responses/NotFoundError' },
          409: {
            description: 'The movement would make the stock negative',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/products/{id}/stock': {
      patch: {
        tags: ['Products'],
        summary: 'Set stock after an inventory count (Admin)',
        description:
          'Absolute value. The difference to the current stock is recorded as an `adjustment` stock movement (none if equal).',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Product UUID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateStockRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Stock updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Product' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/cart': {
      get: {
        tags: ['Cart'],
        summary: 'Get active user shopping cart',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          200: {
            description: 'Shopping cart details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Cart' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Clear all items from shopping cart',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          200: {
            description: 'Cart emptied',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Cart cleared successfully' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/cart/items': {
      post: {
        tags: ['Cart'],
        summary: 'Add item to shopping cart',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AddCartItemRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Item added to cart',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Cart' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/cart/items/{productId}': {
      put: {
        tags: ['Cart'],
        summary: 'Update item quantity in cart',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'productId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Product UUID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateCartItemRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Cart updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Cart' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Remove item from shopping cart',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'productId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Product UUID',
          },
        ],
        responses: {
          200: {
            description: 'Item removed from cart',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Cart' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/addresses': {
      get: {
        tags: ['Addresses'],
        summary: 'List all addresses for current user',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          200: {
            description: 'List of user addresses',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Address' },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
      post: {
        tags: ['Addresses'],
        summary: 'Create a new address for current user',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateAddressRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Address created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Address' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/addresses/{id}': {
      get: {
        tags: ['Addresses'],
        summary: 'Get single address by UUID',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Address UUID',
          },
        ],
        responses: {
          200: {
            description: 'Address details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Address' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
      put: {
        tags: ['Addresses'],
        summary: 'Update address by UUID',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Address UUID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateAddressRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Address updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Address' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
      delete: {
        tags: ['Addresses'],
        summary: 'Delete address by UUID',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Address UUID',
          },
        ],
        responses: {
          200: {
            description: 'Address deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Address deleted successfully' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Checkout cart and create new order',
        description:
          'Runs atomic transaction: validates cart items, reserves stock, creates order & items, and empties cart. Requires a verified email address.',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CheckoutRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Order created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Order placed successfully' },
                    data: { $ref: '#/components/schemas/Order' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: errorResponse(
            'Email address not verified yet',
            'Please verify your email address first. A new link can be requested via POST /api/auth/verify-email/resend.'
          ),
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
      get: {
        tags: ['Orders'],
        summary: 'List order history for current user (paginated, newest first)',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: ORDER_LIST_PARAMETERS,
        responses: {
          200: {
            description: 'One page of the user’s order summaries',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OrderListResponse' },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
        },
      },
    },
    '/orders/all': {
      get: {
        tags: ['Orders'],
        summary: 'List all platform orders (Admin only, paginated, newest first)',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: ORDER_LIST_PARAMETERS,
        responses: {
          200: {
            description: 'One page of order summaries',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OrderListResponse' },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
        },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get single order details by UUID or order number',
        description:
          "Available to the order owner or admins. Someone else's order returns 404 (not 403), so sequential order numbers cannot be probed.",
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Order UUID or order number, e.g. ORD-2026-001001',
          },
        ],
        responses: {
          200: {
            description: 'Order details with items',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Order' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
    },
    '/orders/{id}/status': {
      patch: {
        tags: ['Orders'],
        summary: 'Update order status (Admin only)',
        description:
          'Allowed transitions: pending → cancelled; paid → processing | cancelled | refunded; processing → shipped | cancelled | refunded; shipped → delivered | refunded; delivered → refunded. `cancelled` and `refunded` are final. Other transitions return 409; the current status again is a no-op (200). Every change is recorded in `status_history`. Setting `cancelled` puts the ordered quantities back into stock (`order_cancelled` movements).',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Order UUID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateOrderStatusRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Order status updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Order' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
          404: { $ref: '#/components/responses/NotFoundError' },
          409: {
            description: 'Transition not allowed from the current status',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/orders/{id}/payments': {
      post: {
        tags: ['Orders'],
        summary: 'Record a manual payment, e.g. a bank transfer (Admin only)',
        description:
          'Only for orders with status `pending`. Once the succeeded payments cover the order total, the order status becomes `paid`.',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Order UUID',
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RecordPaymentRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Payment recorded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        payment: { $ref: '#/components/schemas/Payment' },
                        orderStatus: { type: 'string', example: 'paid' },
                        outstandingCents: { type: 'integer', example: 0 },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          403: { $ref: '#/components/responses/ForbiddenError' },
          404: { $ref: '#/components/responses/NotFoundError' },
          409: {
            description:
              'Order is not pending, the amount exceeds the outstanding balance, or the provider reference already exists',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
  },
};

export default swaggerSpec;
