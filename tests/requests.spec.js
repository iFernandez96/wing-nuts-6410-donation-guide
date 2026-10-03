import { expect, test } from '@playwright/test';

const recipientEmail = '2026frc6410@gmail.com';
const formEndpoint = `https://formsubmit.co/${recipientEmail}`;
const requestConfiguration = { recipientEmail, formEndpoint, enabled: true };
const donationUrl = 'https://venmo.com/u/TEST-ONLY-NOT-A-REAL-RECIPIENT';
const donationConfiguration = { recipientName: 'Sheenal Kumar', recipientEmail, donationUrl, recipientConfirmed: true };

test.beforeEach(async ({ context }) => {
  // All provider traffic stays inside the test. No request or email is sent.
  await context.route('https://formsubmit.co/**', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<title>Intercepted request destination</title><p>Test provider response</p>',
  }));
  await context.route('https://venmo.com/**', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<title>Intercepted donation destination</title>',
  }));
});

async function openGuide(page, configuration = requestConfiguration) {
  await page.route('**/request-config.json', (route) => route.fulfill({ json: configuration }));
  await page.route('**/donation-config.json', (route) => route.fulfill({
    json: donationConfiguration,
  }));
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  await page.getByText('Request a print', { exact: true }).click();
}

async function fillRequest(page) {
  await page.locator('#request-name').fill('Test Sender');
  await page.locator('#request-email').fill('print-test@example.org');
  await page.locator('#model-url').fill('https://models.example.org/test-part');
  await page.locator('#request-quantity').fill('2');
  await page.locator('#request-notes').fill('Synthetic test request; please do not print.');
}

for (const configuration of [
  { name: 'disabled', value: { ...requestConfiguration, enabled: false } },
  { name: 'unconfigured', value: { recipientEmail, formEndpoint: '', enabled: false } },
  { name: 'insecure endpoint', value: { ...requestConfiguration, formEndpoint: `http://formsubmit.co/${recipientEmail}` } },
  { name: 'different provider', value: { ...requestConfiguration, formEndpoint: `https://unapproved.example.org/${recipientEmail}` } },
]) {
  test(`${configuration.name} print requests expose no usable submit action`, async ({ page }) => {
    await openGuide(page, configuration.value);
    await expect(page.locator('#request-status')).toHaveText('Print requests are not available yet');
    await expect(page.locator('#request-fields')).toHaveJSProperty('disabled', true);
    await expect(page.locator('#request-name')).toBeDisabled();
    await expect(page.locator('#request-email')).toBeDisabled();
    await expect(page.locator('#request-submit')).toBeDisabled();
    await expect(page.locator('#total')).toHaveText('$3.00');
    await expect(page.locator('#donate-link')).toBeVisible();
  });
}

test('unreachable request configuration preserves calculator and donation access', async ({ page }) => {
  await page.route('**/request-config.json', (route) => route.fulfill({ status: 404, body: 'Not found' }));
  await page.route('**/donation-config.json', (route) => route.fulfill({ json: donationConfiguration }));
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  await page.getByText('Request a print', { exact: true }).click();
  await expect(page.locator('#request-submit')).toBeDisabled();
  await expect(page.locator('#request-status')).toHaveText('Print requests are not available yet');
  await page.locator('#grams').fill('50');
  await expect(page.locator('#total')).toHaveText('$4.50');
  await expect(page.locator('#donate-link')).toBeVisible();
});

test('configured request form explains delivery and requires contact, model, and bounded quantity', async ({ page }) => {
  await openGuide(page);
  const form = page.locator('#print-request-form');
  await expect(page.locator('#request-submit')).toBeEnabled();
  await expect(form).toContainText('FormSubmit');
  await expect(form).toContainText(recipientEmail);
  await expect(page.locator('.print-request')).toContainText(/donation.*optional|optional.*donation/i);

  for (const id of ['request-name', 'request-email', 'model-url', 'request-quantity']) {
    await expect(page.locator(`#${id}`)).toHaveAttribute('required', '');
    await expect(page.locator(`#${id}`)).toHaveAccessibleName(/\S/);
  }
  await expect(page.locator('#request-notes')).toHaveAccessibleName(/\S/);
  await expect(page.locator('#request-notes')).toHaveAttribute('maxlength', '2000');
  expect(await form.evaluate((element) => element.checkValidity())).toBe(false);
  await fillRequest(page);
  expect(await form.evaluate((element) => element.checkValidity())).toBe(true);

  await page.locator('#request-email').fill('not-an-email');
  expect(await form.evaluate((element) => element.checkValidity())).toBe(false);
  await page.locator('#request-email').fill('print-test@example.org');
  for (const quantity of ['0', '101', '1.5']) {
    await page.locator('#request-quantity').fill(quantity);
    expect(await form.evaluate((element) => element.checkValidity())).toBe(false);
  }
  for (const quantity of ['1', '100']) {
    await page.locator('#request-quantity').fill(quantity);
    expect(await form.evaluate((element) => element.checkValidity())).toBe(true);
  }
});

test('request sends selected calculator context in a native POST without requiring a donation', async ({ page, context }) => {
  let submitted;
  await context.route(formEndpoint, async (route) => {
    submitted = route.request();
    await route.fulfill({ contentType: 'text/html', body: '<title>Intercepted request destination</title>' });
  });
  await openGuide(page);
  await page.locator('#design').selectOption('5.5');
  await page.locator('#filament').selectOption('0.125');
  await page.locator('#grams').fill('120');
  await page.locator('#time').selectOption('6.5');
  await page.locator('#post').selectOption('4');
  await expect(page.locator('#total')).toHaveText('$31.00');
  const selectionLabels = await page.locator('#donation-form select option:checked').allTextContents();
  await fillRequest(page);

  await page.locator('#request-submit').click();
  await expect(page).toHaveURL(formEndpoint);
  expect(submitted.method()).toBe('POST');
  expect(submitted.isNavigationRequest()).toBe(true);
  const values = submittedValues(submitted);
  for (const value of [...selectionLabels, '120', '$31.00', 'Test Sender', 'print-test@example.org', 'https://models.example.org/test-part', '2', 'Synthetic test request; please do not print.']) {
    expect(values).toContain(value);
  }
});

test('non-web model URL does not submit', async ({ page, context }) => {
  let attempts = 0;
  await context.route(formEndpoint, (route) => {
    attempts += 1;
    return route.fulfill({ body: 'Intercepted unexpected submission' });
  });
  await openGuide(page);
  await fillRequest(page);
  await page.locator('#model-url').fill('javascript:alert(1)');
  await page.locator('#request-submit').click();
  await expect(page).toHaveURL(/\/wing-nuts-6410-donation-guide\/$/);
  expect(attempts).toBe(0);
  expect(await page.locator('#print-request-form').evaluate((element) => element.checkValidity())).toBe(false);
});

test('invalid calculator prevents request submission while donation stays available', async ({ page, context }) => {
  let attempts = 0;
  await context.route(formEndpoint, (route) => {
    attempts += 1;
    return route.fulfill({ body: 'Intercepted unexpected submission' });
  });
  await openGuide(page);
  await fillRequest(page);
  await page.locator('#grams').fill('-1');
  await page.locator('#request-submit').click();
  await expect(page.locator('#request-status')).toHaveText('Correct the calculator amount before sending your request.');
  expect(attempts).toBe(0);
  const popupPromise = page.waitForEvent('popup');
  await page.locator('#donate-link').click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(donationUrl);
  await expect(page.locator('#request-name')).toHaveValue('Test Sender');
  await expect(page.locator('#grams')).toHaveValue('-1');
});

test('duplicate submission is blocked immediately without claiming successful delivery', async ({ page, context }) => {
  let attempts = 0;
  let releaseResponse;
  const responseGate = new Promise((resolve) => { releaseResponse = resolve; });
  await context.route(formEndpoint, async (route) => {
    attempts += 1;
    await responseGate;
    await route.fulfill({ contentType: 'text/html', body: '<title>Intercepted request destination</title>' });
  });
  await openGuide(page);
  await fillRequest(page);
  try {
    const afterSubmit = await page.locator('#print-request-form').evaluate((form) => {
      form.requestSubmit();
      form.requestSubmit();
      return {
        disabled: document.getElementById('request-submit').disabled,
        status: document.getElementById('request-status').textContent,
      };
    });
    expect(afterSubmit.disabled).toBe(true);
    expect(afterSubmit.status).not.toMatch(/success|request (?:sent|received)|email (?:sent|delivered)|thank you/i);
    await expect.poll(() => attempts).toBe(1);
  } finally {
    releaseResponse();
  }
  await expect(page).toHaveURL(formEndpoint);
  expect(attempts).toBe(1);
});

test('expanded print request fits a narrow screen and preserves accessible focus', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openGuide(page);
  await fillRequest(page);
  await page.locator('#request-name').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#request-email')).toBeFocused();
  expect(await page.locator('#request-email').evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');
  await page.locator('#request-notes').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#request-submit')).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  for (const locator of [page.locator('#request-notes'), page.locator('#request-submit')]) {
    const bounds = await locator.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(375);
  }
  await page.screenshot({ path: testInfo.outputPath('mobile-print-request.png'), fullPage: true });
});

function submittedValues(request) {
  const contentType = request.headers()['content-type'] || '';
  const body = request.postData() || '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return [...new URLSearchParams(body).values()];
  }
  // Support a native form changing to multipart without overlooking field data.
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
  expect(boundary, 'native form encoding').not.toBeNull();
  return body.split(`--${boundary[1] || boundary[2]}`)
    .filter((part) => part.includes('Content-Disposition: form-data;'))
    .map((part) => part.split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/, ''));
}
