import { expect, request as apiRequest, test, type APIRequestContext } from '@playwright/test';
import { ADMIN, APP_URL, newCustomer, shippingAddress } from '../support/env';
import { linkIn, waitForMail } from '../support/mailpit';

/** Data of a successful API response ({ success: true, data }) */
async function data<T>(response: Awaited<ReturnType<APIRequestContext['get']>>): Promise<T> {
  expect(response.ok(), `${response.url()} answered ${response.status()}`).toBe(true);
  return ((await response.json()) as { data: T }).data;
}

/**
 * A customer orders through the API (the UI path is covered by the customer journey).
 * The request context keeps the customer's cookies, like a browser would.
 */
async function placeOrderAsCustomer(customerApi: APIRequestContext, mailApi: APIRequestContext) {
  const customer = newCustomer('Mia');
  await data(await customerApi.post('/api/auth/register', { data: customer }));

  const token = new URL(
    linkIn(await waitForMail(mailApi, customer.email, /confirm/i))
  ).searchParams.get('token');
  await data(await customerApi.post('/api/auth/verify-email', { data: { token } }));

  const { products } = await data<{ products: { id: string; sku: string }[] }>(
    await customerApi.get('/api/products', { params: { search: 'trench coat' } })
  );
  const trench = products.find((product) => product.sku === 'COT-002')!;
  await data(
    await customerApi.post('/api/cart/items', { data: { productId: trench.id, quantity: 1 } })
  );

  const { order } = await data<{ order: { id: string; order_number: string } }>(
    await customerApi.post('/api/orders', { data: { shippingAddress } })
  );
  return order;
}

test('an admin records the bank transfer and ships the order', async ({ page, request }) => {
  const customerApi = await apiRequest.newContext({ baseURL: APP_URL });
  const order = await placeOrderAsCustomer(customerApi, request);

  await test.step('log in as admin and find the order', async () => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN.email);
    await page.getByLabel('Password').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('link', { name: 'Admin' }).first()).toBeVisible();

    await page.goto('/admin/orders');
    await page.getByRole('searchbox', { name: 'Search orders' }).fill(order.order_number);
    await page.getByRole('button', { name: 'Search' }).click();
    await page.getByRole('link', { name: order.order_number }).click();
    await expect(page.getByRole('heading', { name: new RegExp(order.order_number) })).toBeVisible();
  });

  await test.step('record the payment (prefilled with the outstanding amount)', async () => {
    await expect(page.getByLabel('Amount (EUR)')).toHaveValue('169.90');
    await page.getByLabel('Bank reference (optional)').fill('STMT-E2E-1');
    await page.getByRole('button', { name: 'Record payment' }).click();
    await expect(page.getByText('Payment recorded. The order is paid.')).toBeVisible();
  });

  await test.step('start processing and ship it', async () => {
    const nextSteps = page.getByRole('region', { name: 'Next steps' });

    await nextSteps.getByRole('button', { name: 'Start processing' }).click();
    const processing = page.getByRole('dialog', { name: 'Start processing?' });
    await processing.getByLabel('Internal note (optional)').fill('Packed by the e2e test');
    await processing.getByRole('button', { name: 'Start processing' }).click();
    await expect(page.getByText(`Order ${order.order_number}: Processing`)).toBeVisible();

    await nextSteps.getByRole('button', { name: 'Mark as shipped' }).click();
    await page
      .getByRole('dialog', { name: 'Mark as shipped?' })
      .getByRole('button', { name: 'Mark as shipped' })
      .click();
    await expect(page.getByText(`Order ${order.order_number}: Shipped`)).toBeVisible();
  });

  await test.step('the customer sees the new status', async () => {
    const { order: seen } = await data<{ order: { status: string } }>(
      await customerApi.get(`/api/orders/${order.order_number}`)
    );
    expect(seen.status).toBe('shipped');
  });

  await customerApi.dispose();
});
