import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readDonationConfig } from '../dist/donation-config.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = path.join(root, 'dist');
const html = readFileSync(path.join(publicRoot, 'index.html'), 'utf8');
const config = JSON.parse(readFileSync(path.join(publicRoot, 'donation-config.json'), 'utf8'));

assert.match(html, /6410 Wing Nuts/);
assert.match(html, /FRC Team 6410/);
assert.doesNotMatch(html, /TalonTech|Everett Alvarez|Club-Assisted/);
assert.match(html, /Online donations are not available yet/);
assert.match(html, /Enter your chosen donation amount on the payment page\./);

for (const [, asset] of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)"/g)) {
  assert.ok(existsSync(path.join(publicRoot, asset)), `Missing local asset: ${asset}`);
}

const donationConfig = readDonationConfig(config);
const hasAnyConfig = Boolean(config.recipientName || config.donationUrl);
if (hasAnyConfig && !donationConfig) {
  throw new Error('Donation configuration must contain a recipient name and a real HTTPS payment URL without credentials.');
}

if (process.argv.includes('--production') && !donationConfig) {
  console.error('Deployment blocked: supply the approved recipientName and donationUrl in dist/donation-config.json.');
  process.exitCode = 1;
} else {
  console.log(donationConfig ? 'Static site checks passed; donation configuration is present.' : 'Static site checks passed; donations are unavailable until configured.');
}
