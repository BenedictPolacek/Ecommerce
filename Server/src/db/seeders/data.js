// Sample data for local development. Products reference their category by slug.

export const categories = [
  { name: 'Electronics', slug: 'electronics', description: 'Gadgets, computers and accessories' },
  { name: 'Books', slug: 'books', description: 'Fiction, non-fiction and technical books' },
  { name: 'Clothing', slug: 'clothing', description: 'Apparel for every season' },
  { name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Everything for your home' },
];

export const products = [
  {
    sku: 'ELEC-KB-001',
    name: 'Mechanical Keyboard',
    description: 'Tenkeyless keyboard with hot-swappable switches',
    price: 89.99,
    stock_quantity: 50,
    category: 'electronics',
  },
  {
    sku: 'ELEC-MS-001',
    name: 'Wireless Mouse',
    description: 'Ergonomic mouse with 70 days of battery life',
    price: 39.9,
    stock_quantity: 120,
    category: 'electronics',
  },
  {
    sku: 'ELEC-HP-001',
    name: 'Noise-Cancelling Headphones',
    description: 'Over-ear headphones with active noise cancellation',
    price: 199.0,
    stock_quantity: 25,
    category: 'electronics',
  },
  {
    sku: 'BOOK-JS-001',
    name: 'JavaScript: The Good Parts',
    description: 'A classic on writing clean JavaScript',
    price: 24.5,
    stock_quantity: 40,
    category: 'books',
  },
  {
    sku: 'BOOK-PG-001',
    name: 'PostgreSQL Up and Running',
    description: 'Practical guide to PostgreSQL',
    price: 34.0,
    stock_quantity: 30,
    category: 'books',
  },
  {
    sku: 'CLTH-TS-001',
    name: 'Organic Cotton T-Shirt',
    description: 'Unisex t-shirt made from 100% organic cotton',
    price: 19.99,
    stock_quantity: 200,
    category: 'clothing',
  },
  {
    sku: 'CLTH-HD-001',
    name: 'Zip Hoodie',
    description: 'Warm hoodie with a full-length zipper',
    price: 49.0,
    stock_quantity: 0,
    category: 'clothing',
  },
  {
    sku: 'HOME-CF-001',
    name: 'French Press',
    description: '1 litre stainless steel coffee maker',
    price: 29.95,
    stock_quantity: 60,
    category: 'home-kitchen',
  },
];
