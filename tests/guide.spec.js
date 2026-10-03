import { expect, test } from '@playwright/test';

const donationUrl = 'https://www.paypal.com/donate/?hosted_button_id=TEST_ONLY';
const configured = { recipientName: 'Wing Nuts Robotics Boosters', donationUrl };

async function openGuide(page, configuration = {}) {
  await page.route('**/donation-config.json', (route) => route.fulfill({ json: configuration }));
  await page.goto('./');
  await page.waitForLoadState('networkidle');
}

test('defaults, minimum threshold, decimal weights, and reset', async ({ page }) => {
  await openGuide(page);
  const total = page.locator('#total');
  const grams = page.getByLabel('3. Amount (Grams)');
  const minimum = page.locator('#min-msg');

  await expect(grams).toHaveValue('');
  await expect(total).toHaveText('$3.00');
  await expect(minimum).toBeVisible();
  await grams.fill('20');
  await expect(total).toHaveText('$3.00');
  await expect(minimum).toBeHidden();
  await grams.fill('25.5');
  await expect(total).toHaveText('$3.28');
  await grams.fill('');
  await expect(total).toHaveText('$3.00');
  await expect(minimum).toBeVisible();

  await page.locator('#design').selectOption('5.5');
  await page.locator('#filament').selectOption('0.125');
  await page.locator('#time').selectOption('6.5');
  await page.locator('#post').selectOption('4');
  await grams.fill('-1');
  await expect(grams).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#grams-error')).toBeVisible();
  await expect(total).not.toContainText('$');
  await expect(minimum).toBeHidden();

  await page.getByRole('button', { name: 'Reset Calculator' }).click();
  await expect(page.locator('#design')).toHaveValue('1');
  await expect(page.locator('#filament')).toHaveValue('0.05');
  await expect(page.locator('#time')).toHaveValue('1');
  await expect(page.locator('#post')).toHaveValue('0');
  await expect(grams).toHaveValue('');
  await expect(grams).toHaveAttribute('aria-invalid', 'false');
  await expect(page.locator('#grams-error')).toBeHidden();
  await expect(total).toHaveText('$3.00');
  await expect(minimum).toBeVisible();
});

for (const example of [
  { name: 'personal PLA with light support removal', design: '1', filament: '0.05', grams: '50', time: '3', post: '1.5', total: '$8.00' },
  { name: 'team-assisted TPU with detailed cleanup', design: '5.5', filament: '0.125', grams: '120', time: '6.5', post: '4', total: '$31.00' },
]) {
  test(`calculates ${example.name}`, async ({ page }) => {
    await openGuide(page);
    for (const field of ['design', 'filament', 'time', 'post']) {
      await page.locator(`#${field}`).selectOption(example[field]);
    }
    await page.locator('#grams').fill(example.grams);
    await expect(page.locator('#total')).toHaveText(example.total);
    await expect(page.locator('#min-msg')).toBeHidden();
  });
}

test('rejects an incomplete numeric entry and recovers on valid input', async ({ page }) => {
  await openGuide(page);
  const grams = page.locator('#grams');
  await grams.pressSequentially('e');
  await expect(grams).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#grams-error')).toBeVisible();
  await expect(page.locator('#total')).not.toContainText('$');
  await grams.fill('50');
  await expect(grams).toHaveAttribute('aria-invalid', 'false');
  await expect(page.locator('#grams-error')).toBeHidden();
  await expect(page.locator('#total')).toHaveText('$4.50');
});

test('donation works independently, opens the correct recipient, and preserves calculator state', async ({ page, context }) => {
  await context.route(donationUrl, (route) => route.fulfill({
    contentType: 'text/html',
    body: '<title>Test donation destination</title><p>Hosted payment placeholder</p>',
  }));
  await openGuide(page, configured);
  const link = page.getByRole('link', { name: /Donate to Wing Nuts/ });
  await expect(link).toBeVisible();
  await expect(page.locator('#donation-recipient')).toContainText(configured.recipientName);
  await expect(page.locator('#donation-help')).toContainText('Enter your chosen donation amount on the payment page.');
  await expect(link).toHaveAttribute('href', donationUrl);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
  await expect(link).toHaveAttribute('rel', /noreferrer/);
  await expect(link).toHaveAccessibleDescription(/new tab/i);

  const initialPopupPromise = page.waitForEvent('popup');
  await link.click();
  const initialPopup = await initialPopupPromise;
  await expect(initialPopup).toHaveURL(donationUrl);
  await initialPopup.close();

  await page.locator('#grams').fill('-1');
  await expect(page.locator('#grams-error')).toBeVisible();
  await expect(link).toBeVisible();
  const popupPromise = page.waitForEvent('popup');
  await link.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(donationUrl);
  await expect(page.locator('#grams')).toHaveValue('-1');
  await expect(page.locator('#grams-error')).toBeVisible();
  await expect(page.locator('#donation-status')).not.toContainText(/success|received|thank you/i);
  await expect(page.getByText(/payment successful|donation received|thank you for (your )?donat/i)).toHaveCount(0);
});

for (const configuration of [
  { name: 'empty', value: { recipientName: '', donationUrl: '' } },
  { name: 'missing recipient', value: { recipientName: '', donationUrl } },
  { name: 'non-HTTPS', value: { recipientName: 'Wing Nuts', donationUrl: 'http://donate.example.org/' } },
  { name: 'script URL', value: { recipientName: 'Wing Nuts', donationUrl: 'javascript:alert(1)' } },
  { name: 'malformed URL', value: { recipientName: 'Wing Nuts', donationUrl: 'not a URL' } },
]) {
  test(`${configuration.name} configuration shows no active payment link`, async ({ page }) => {
    await openGuide(page, configuration.value);
    await expect(page.locator('#donation-status')).toHaveText('Online donations are not available yet');
    await expect(page.getByRole('link', { name: /Donate to Wing Nuts/ })).toHaveCount(0);
    await expect(page.locator('#donate-link')).not.toHaveAttribute('href', /.+/);
    await expect(page.locator('#total')).toHaveText('$3.00');
  });
}

test('missing configuration leaves the calculator usable', async ({ page }) => {
  await page.route('**/donation-config.json', (route) => route.fulfill({ status: 404, body: 'Not found' }));
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#donation-status')).toHaveText('Online donations are not available yet');
  await expect(page.getByRole('link', { name: /Donate to Wing Nuts/ })).toHaveCount(0);
  await page.locator('#grams').fill('50');
  await expect(page.locator('#total')).toHaveText('$4.50');
});

test('labels, result announcement, and keyboard focus are accessible', async ({ page }) => {
  await openGuide(page, configured);
  await expect(page.getByRole('heading', { name: 'Wing Nuts', exact: true })).toBeVisible();
  for (const label of ['1. Design Source', '2. Filament Type', '3. Amount (Grams)', '4. Print Time', '5. Post-Processing & Labor']) {
    await expect(page.getByLabel(label, { exact: true })).toBeVisible();
  }
  await expect(page.locator('.result')).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('.result')).toHaveAttribute('aria-atomic', 'true');
  await expect(page.locator('#grams')).toHaveAttribute('aria-describedby', /grams-error/);
  await page.locator('#donate-link').waitFor({ state: 'visible' });
  for (const id of ['design', 'filament', 'grams', 'time', 'post']) {
    await page.keyboard.press('Tab');
    await expect(page.locator(`#${id}`)).toBeFocused();
    expect(await page.locator(`#${id}`).evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');
  }
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Reset Calculator' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#donate-link')).toBeFocused();
  expect(await page.locator('#donate-link').evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');
});

test('loads assets from the repository path without runtime errors', async ({ page }) => {
  const errors = [];
  const loadedAssets = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (/\.(css|js)$/.test(new URL(response.url()).pathname)) {
      loadedAssets.push({ path: new URL(response.url()).pathname, status: response.status() });
    }
  });
  await openGuide(page, configured);
  await expect(page.locator('#donate-link')).toBeVisible();
  await page.locator('#grams').fill('50');
  await expect(page.locator('#total')).toHaveText('$4.50');
  for (const asset of ['styles.css', 'calculator.js', 'donations.js']) {
    expect(loadedAssets).toContainEqual({ path: `/wing-nuts-6410-donation-guide/${asset}`, status: 200 });
  }
  expect(errors).toEqual([]);
});

for (const viewport of [{ width: 320, height: 800 }, { width: 375, height: 812 }, { width: 1280, height: 1000 }]) {
  test(`layout fits ${viewport.width}px and exposes all controls`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await openGuide(page, configured);
    await expect(page.locator('#donate-link')).toBeVisible();
    await assertLayoutFits(page);
    if (viewport.width !== 320) {
      await page.screenshot({ path: testInfo.outputPath(`${viewport.width === 375 ? 'mobile' : 'desktop'}-guide.png`), fullPage: true });
    }
  });
}

test('200% text sizing preserves controls and readable content', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openGuide(page, configured);
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  await expect(page.locator('#donate-link')).toBeVisible();
  await assertLayoutFits(page);
  await page.locator('#grams').fill('50');
  await expect(page.locator('#total')).toHaveText('$4.50');
  await expect(page.locator('#donation-help')).toContainText('Enter your chosen donation amount on the payment page.');
  await page.getByRole('button', { name: 'Reset Calculator' }).click();
  await expect(page.locator('#total')).toHaveText('$3.00');
});

async function assertLayoutFits(page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    bounds: Array.from(document.querySelectorAll('input, select, button, #donate-link, label, h1, #donation-help')).filter((element) => element.getClientRects().length > 0).map((element) => {
      const rectangle = element.getBoundingClientRect();
      return { left: rectangle.left, right: rectangle.right, width: rectangle.width };
    }),
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  for (const bounds of dimensions.bounds) {
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(dimensions.viewport);
    expect(bounds.width).toBeGreaterThan(0);
  }
}
