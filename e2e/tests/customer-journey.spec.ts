import { expect, test } from '@playwright/test';
import { newCustomer, shippingAddress } from '../support/env';
import { linkIn, waitForMail } from '../support/mailpit';

/**
 * The most important path through the shop, like a real customer does it:
 * register → confirm the email from the inbox → find a product → cart → checkout.
 * If this test is green, the API, the client, the database and the emails work together.
 */
test('a new customer registers, confirms the email and orders a dress', async ({
  page,
  request,
}) => {
  const customer = newCustomer('Anna');

  await test.step('register', async () => {
    await page.goto('/register');
    await page.getByLabel('First name').fill(customer.first_name);
    await page.getByLabel('Last name').fill(customer.last_name);
    await page.getByLabel('Email').fill(customer.email);
    await page.getByLabel('Password').fill(customer.password);
    await page.getByRole('button', { name: 'Create account' }).click();

    // Logged in right away, but asked to confirm the email
    await expect(page.getByRole('link', { name: customer.first_name })).toBeVisible();
    await expect(page.getByText(/please confirm your email/i)).toBeVisible();
  });

  await test.step('confirm the email with the link from the inbox', async () => {
    const mail = await waitForMail(request, customer.email, /confirm your email/i);
    await page.goto(linkIn(mail));
    await page.getByRole('button', { name: 'Confirm email' }).click();

    await expect(page.getByRole('heading', { name: 'Email verified' })).toBeVisible();
  });

  await test.step('find a product and put it into the cart', async () => {
    await page.goto('/');
    await page.getByRole('searchbox', { name: 'Search products' }).fill('wrap dress');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.getByRole('link', { name: 'Floral Wrap Maxi Dress' }).first().click();

    await expect(page.getByRole('heading', { name: 'Floral Wrap Maxi Dress' })).toBeVisible();
    // The seeded Unsplash photo with the alt text written for it
    await expect(page.getByRole('img', { name: /cream wrap maxi dress/i }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Add to cart' }).click();
    await expect(page.getByText('Added 1 × Floral Wrap Maxi Dress to your cart')).toBeVisible();
  });

  let orderNumber = '';

  await test.step('check out with a new address', async () => {
    await page.getByRole('link', { name: 'Cart, 1 item' }).click();
    await page.getByRole('link', { name: 'Proceed to checkout' }).click();

    const shipping = page.getByRole('region', { name: 'Shipping address' });
    await shipping.getByLabel('Street and number').fill(shippingAddress.address_line1);
    await shipping.getByLabel('Postal code').fill(shippingAddress.postal_code);
    await shipping.getByLabel('City').fill(shippingAddress.city);
    await shipping.getByLabel('Country').selectOption(shippingAddress.country);
    await page.getByRole('button', { name: /place order/i }).click();

    await expect(page.getByRole('heading', { name: 'Thank you for your order!' })).toBeVisible();
    // €94.90 is above the free shipping threshold: the total is the product price
    await expect(page.getByRole('region', { name: /please transfer €94\.90/i })).toBeVisible();
    orderNumber =
      (await page
        .getByText(/^ORD-\d{4}-\d{6}$/)
        .first()
        .textContent()) ?? '';
    expect(orderNumber).toMatch(/^ORD-\d{4}-\d{6}$/);
  });

  await test.step('see the order under "My orders"', async () => {
    await page.goto('/orders');
    await expect(page.getByRole('link', { name: orderNumber })).toBeVisible();
  });
});
