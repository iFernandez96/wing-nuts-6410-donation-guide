import { expect, test } from '@playwright/test';

async function openGuide(page) {
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

test('labels, result announcement, and keyboard focus are accessible', async ({ page }) => {
  await openGuide(page);
  await expect(page.getByRole('heading', { name: 'Wing Nuts', exact: true })).toBeVisible();
  for (const label of ['1. Design Source', '2. Filament Type', '3. Amount (Grams)', '4. Print Time', '5. Post-Processing & Labor']) {
    await expect(page.getByLabel(label, { exact: true })).toBeVisible();
  }
  await expect(page.locator('.result')).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('.result')).toHaveAttribute('aria-atomic', 'true');
  await expect(page.locator('#grams')).toHaveAttribute('aria-describedby', /grams-error/);
  for (const id of ['design', 'filament', 'grams', 'time', 'post']) {
    await page.keyboard.press('Tab');
    await expect(page.locator(`#${id}`)).toBeFocused();
    expect(await page.locator(`#${id}`).evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');
  }
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Reset Calculator' })).toBeFocused();
  expect(await page.getByRole('button', { name: 'Reset Calculator' }).evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');
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
  await openGuide(page);
  await page.locator('#grams').fill('50');
  await expect(page.locator('#total')).toHaveText('$4.50');
  for (const asset of ['styles.css', 'calculator.js']) {
    expect(loadedAssets).toContainEqual({ path: `/wing-nuts-6410-donation-guide/${asset}`, status: 200 });
  }
  expect(errors).toEqual([]);
});

for (const viewport of [{ width: 320, height: 800 }, { width: 375, height: 812 }, { width: 1280, height: 1000 }]) {
  test(`layout fits ${viewport.width}px and exposes all controls`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await openGuide(page);
    await assertLayoutFits(page);
    if (viewport.width !== 320) {
      await page.screenshot({ path: testInfo.outputPath(`${viewport.width === 375 ? 'mobile' : 'desktop'}-guide.png`), fullPage: true });
    }
  });
}

test('200% text sizing preserves controls and readable content', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openGuide(page);
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  await assertLayoutFits(page);
  await page.locator('#grams').fill('50');
  await expect(page.locator('#total')).toHaveText('$4.50');
  await page.getByRole('button', { name: 'Reset Calculator' }).click();
  await expect(page.locator('#total')).toHaveText('$3.00');
});

async function assertLayoutFits(page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    bounds: Array.from(document.querySelectorAll('input, select, button, label, h1, .donation-note')).filter((element) => element.getClientRects().length > 0).map((element) => {
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
