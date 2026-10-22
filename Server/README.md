# Ecommerce REST API

Feature-based REST API structure for the ecommerce database.

## Structure

- `src/config` - Environment and database configuration
- `src/db` - Migrations and seed data
- `src/modules` - Feature modules such as products, cart, and orders
- `src/middleware` - Shared Express middleware
- `src/routes` - API route registration
- `src/utils` - Shared utility classes and functions
- `tests` - Automated tests

Each feature module can contain routes, controllers, services, repositories, validation, and models.