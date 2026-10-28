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
              token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' },
              user: { $ref: '#/components/schemas/User' },
            },
          },
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
          stock_quantity: { type: 'integer', example: 45, default: 0 },
          category_id: { type: 'string', format: 'uuid', nullable: true },
          is_active: { type: 'boolean', default: true },
        },
      },
      UpdateProductRequest: {
        type: 'object',
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
          stock_quantity: { type: 'integer', example: 30 },
          category_id: { type: 'string', format: 'uuid', nullable: true },
          is_active: { type: 'boolean' },
        },
      },
      UpdateStockRequest: {
        type: 'object',
        required: ['stock_quantity'],
        properties: {
          stock_quantity: { type: 'integer', minimum: 0, example: 100 },
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
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer', example: 1 },
                  limit: { type: 'integer', example: 20 },
                  total: { type: 'integer', example: 1 },
                  totalPages: { type: 'integer', example: 1 },
                },
              },
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
          paymentProvider: { type: 'string', example: 'stripe' },
          paymentId: { type: 'string', example: 'pi_3MtwBwLkdIwHu7ix28a3tqPa' },
        },
      },
      UpdateOrderStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
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
            example: 'processing',
          },
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
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in to an existing account',
        description: 'Returns JWT token in response and sets an httpOnly cookie named `token`.',
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
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out current session',
        description: 'Clears the authentication httpOnly cookie.',
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
    '/products/{id}/stock': {
      patch: {
        tags: ['Products'],
        summary: 'Update product stock inventory (Admin)',
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
          'Runs atomic transaction: validates cart items, reserves stock, creates order & items, and empties cart.',
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
          404: { $ref: '#/components/responses/NotFoundError' },
        },
      },
      get: {
        tags: ['Orders'],
        summary: 'List order history for current user',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          200: {
            description: 'User order history',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Order' },
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
    '/orders/all': {
      get: {
        tags: ['Orders'],
        summary: 'List all platform orders (Admin only)',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        responses: {
          200: {
            description: 'All system orders',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Order' },
                    },
                  },
                },
              },
            },
          },
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
        },
      },
    },
  },
};

export default swaggerSpec;
