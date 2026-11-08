import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { expectNoA11yViolations } from '../support/a11y';
import { ADMIN, newCustomer, shippingAddress } from '../support/env';
import { linkIn, waitForMail } from '../support/mailpit';

/**
 * Every important page, scanned with axe after it has loaded. Each page is its own test,
 * so a report names exactly which page has which problem.
 */

/** Opens the page and waits until its main heading is there (content loaded) */
async function open(page: Page, path: string, heading: string | RegExp) {
  await page.goto(path);
  await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
}

async function json<T>(response: Awaited<ReturnType<APIRequestContext['get']>>) {
  expect(response.ok(), `${response.url()} answered ${response.status()}`).toBe(true);
  return ((await response.json()) as { data: T }).data;
}

// Guards the guard: a green scan only means something if the scanner does find problems
test('the scanner reports real problems', async ({ page }) => {
  await open(page, '/login', 'Log in');
  await page.evaluate(() => {
    const broken = document.createElement('div');
    broken.innerHTML =
      '<img src="/missing.png"><button></button><p style="color:#bbb;background:#fff">faint</p>';
    document.querySelector('main')!.append(broken);
  });

  const failure = await expectNoA11yViolations(page).then(
    () => '',
    (error: Error) => error.message
  );
  expect(failure).toContain('image-alt');
  expect(failure).toContain('button-name');
  expect(failure).toContain('color-contrast');
});

// axe cannot press keys: keyboard use is checked by hand
test('keyboard users can skip the header', async ({ page }) => {
  await open(page, '/', /products/i);

  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  // The next Tab stop is inside the page content, not in the header
  await page.keyboard.press('Tab');
  const focusedInMain = await page.evaluate(
    () => !!document.activeElement?.closest('main') && document.activeElement !== document.body
  );
  expect(focusedInMain).toBe(true);
});

test.describe('visitor pages', () => {
  const pages: [string, string, string | RegExp][] = [
    ['shop', '/', /products/i],
    ['category', '/?category=clothing-dresses', 'Dresses & Jumpsuits'],
    ['search without results', '/?q=nothing-matches-this', /no products/i],
    ['product', '/products/floral-wrap-maxi-dress', 'Floral Wrap Maxi Dress'],
    ['sold-out product', '/products/white-crochet-maxi-dress', 'White Crochet Maxi Dress'],
    ['login', '/login', 'Log in'],
    ['register', '/register', 'Create an account'],
    ['forgot password', '/forgot-password', 'Forgot your password?'],
    ['not found', '/this-page-does-not-exist', /not found/i],
  ];

  for (const [name, path, heading] of pages) {
    test(name, async ({ page }) => {
      await open(page, path, heading);
      await expectNoA11yViolations(page);
    });
  }
});

test.describe('customer pages', () => {
  let orderNumber = '';
  const customer = newCustomer('Lena');

  /** Logged in, verified, one order and one item in the cart */
  test.beforeEach(async ({ page, request }) => {
    // page.request shares the cookies with the page: the browser is logged in afterwards
    const api = page.request;
    if (!orderNumber) {
      await json(await api.post('/api/auth/register', { data: customer }));
      const link = linkIn(await waitForMail(request, customer.email, /confirm/i));
      const token = new URL(link).searchParams.get('token');
      await json(await api.post('/api/auth/verify-email', { data: { token } }));

      const { products } = await json<{ products: { id: string; sku: string }[] }>(
        await api.get('/api/products', { params: { search: 'sneakers' } })
      );
      const sneakers = products.find((product) => product.sku === 'SHO-009')!;
      await json(
        await api.post('/api/cart/items', { data: { productId: sneakers.id, quantity: 1 } })
      );
      const { order } = await json<{ order: { order_number: string } }>(
        await api.post('/api/orders', { data: { shippingAddress } })
      );
      orderNumber = order.order_number;
      await json(
        await api.post('/api/cart/items', { data: { productId: sneakers.id, quantity: 2 } })
      );
    } else {
      await json(
        await api.post('/api/auth/login', {
          data: { email: customer.email, password: customer.password },
        })
      );
    }
  });

  const pages: [string, () => string, string | RegExp][] = [
    ['cart', () => '/cart', 'Your cart'],
    ['checkout', () => '/checkout', 'Checkout'],
    ['orders', () => '/orders', 'My orders'],
    ['order detail', () => `/orders/${orderNumber}`, new RegExp(orderNumber || 'ORD-')],
    ['order confirmation', () => `/checkout/confirmation/${orderNumber}`, /thank you/i],
    ['profile', () => '/account', 'Profile'],
    ['addresses', () => '/account/addresses', /addresses/i],
    ['security', () => '/account/security', 'Logged-in devices'],
  ];

  for (const [name, path, heading] of pages) {
    test(name, async ({ page }) => {
      await open(page, path(), heading);
      await expectNoA11yViolations(page);
    });
  }
});

test.describe('admin pages', () => {
  test.beforeEach(async ({ page }) => {
    await json(await page.request.post('/api/auth/login', { data: ADMIN }));
  });

  test('orders and order detail', async ({ page }) => {
    await open(page, '/admin/orders', 'Orders');
    await expectNoA11yViolations(page);

    // The customer tests above placed an order (the tests of a file run in order)
    await page.getByRole('link', { name: /^ORD-/ }).first().click();
    await expect(page.getByRole('region', { name: 'Next steps' })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('products', async ({ page }) => {
    await open(page, '/admin/products', 'Products');
    await expectNoA11yViolations(page);
  });

  test('product edit (form, images, stock)', async ({ page }) => {
    await open(page, '/admin/products', 'Products');
    await page.getByRole('link', { name: 'Floral Wrap Maxi Dress' }).click();
    await expect(
      page
        .getByRole('heading', { name: 'Stock history' })
        .or(page.getByRole('table', { name: 'Stock history' }))
    ).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('new product', async ({ page }) => {
    await open(page, '/admin/products/new', 'New product');
    await expect(page.getByLabel('Category')).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('categories', async ({ page }) => {
    await open(page, '/admin/categories', 'Categories');
    await expectNoA11yViolations(page);
  });

  test('customers and customer detail', async ({ page }) => {
    await open(page, '/admin/customers?role=all', 'Customers');
    await expectNoA11yViolations(page);

    await page.getByRole('link', { name: 'Admin User' }).click();
    await expect(page.getByRole('heading', { name: 'Admin User' })).toBeVisible();
    await expectNoA11yViolations(page);
  });
});
