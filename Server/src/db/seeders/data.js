// Sample data for local development. Products reference their category by slug.

export const categories = [
  { name: 'Electronics', slug: 'electronics', description: 'Gadgets, computers and accessories' },
  { name: 'Books', slug: 'books', description: 'Fiction, non-fiction and technical books' },
  { name: 'Clothing', slug: 'clothing', description: 'Apparel for every season' },
  { name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Everything for your home' },
  // Subcategories reference their parent by slug, so parents must be listed first
  {
    name: 'Computer Accessories',
    slug: 'electronics-computer-accessories',
    description: 'Keyboards, mice and more',
    parent: 'electronics',
  },
  {
    name: 'Audio',
    slug: 'electronics-audio',
    description: 'Headphones and speakers',
    parent: 'electronics',
  },
  { name: 'Tops', slug: 'clothing-tops', description: 'Shirts and sweaters', parent: 'clothing' },
  {
    name: 'Hoodies',
    slug: 'clothing-tops-hoodies',
    description: 'Hooded sweatshirts',
    parent: 'clothing-tops',
  },
];

export const products = [
  {
    sku: 'ELEC-KB-001',
    name: 'Mechanical Keyboard',
    description: 'Tenkeyless keyboard with hot-swappable switches',
    price_cents: 8999,
    stock_quantity: 50,
    category: 'electronics-computer-accessories',
  },
  {
    sku: 'ELEC-MS-001',
    name: 'Wireless Mouse',
    description: 'Ergonomic mouse with 70 days of battery life',
    price_cents: 3990,
    stock_quantity: 120,
    category: 'electronics-computer-accessories',
  },
  {
    sku: 'ELEC-HP-001',
    name: 'Noise-Cancelling Headphones',
    description: 'Over-ear headphones with active noise cancellation',
    price_cents: 19900,
    stock_quantity: 25,
    category: 'electronics-audio',
  },
  {
    sku: 'BOOK-JS-001',
    name: 'JavaScript: The Good Parts',
    description: 'A classic on writing clean JavaScript',
    price_cents: 2450,
    stock_quantity: 40,
    category: 'books',
  },
  {
    sku: 'BOOK-PG-001',
    name: 'PostgreSQL Up and Running',
    description: 'Practical guide to PostgreSQL',
    price_cents: 3400,
    stock_quantity: 30,
    category: 'books',
  },
  {
    sku: 'CLTH-TS-001',
    name: 'Organic Cotton T-Shirt',
    description: 'Unisex t-shirt made from 100% organic cotton',
    price_cents: 1999,
    stock_quantity: 200,
    category: 'clothing-tops',
  },
  {
    sku: 'CLTH-HD-001',
    name: 'Zip Hoodie',
    description: 'Warm hoodie with a full-length zipper',
    price_cents: 4900,
    stock_quantity: 0,
    category: 'clothing-tops-hoodies',
  },
  {
    sku: 'HOME-CF-001',
    name: 'French Press',
    description: '1 litre stainless steel coffee maker',
    price_cents: 2995,
    stock_quantity: 60,
    category: 'home-kitchen',
  },
];
