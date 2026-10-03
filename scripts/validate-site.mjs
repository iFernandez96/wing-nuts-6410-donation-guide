import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readDonationConfig } from '../dist/donation-config.js';
import { readRequestConfig } from '../dist/request-config.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = path.join(root, 'dist');
const html = readFileSync(path.join(publicRoot, 'index.html'), 'utf8');
const config = JSON.parse(readFileSync(path.join(publicRoot, 'donation-config.json'), 'utf8'));
const requestSettings = JSON.parse(readFileSync(path.join(publicRoot, 'request-config.json'), 'utf8'));

assert.match(html, /6410 Wing Nuts/);
assert.match(html, /FRC Team 6410/);
assert.doesNotMatch(html, /TalonTech|Everett Alvarez|Club-Assisted/);
assert.match(html, /Online donations are not available yet/);
assert.match(html, /Enter your chosen donation amount on Venmo\./);

for (const [, asset] of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)"/g)) {
  assert.ok(existsSync(path.join(publicRoot, asset)), `Missing local asset: ${asset}`);
}

const donationConfig = readDonationConfig(config);
const requestConfig = readRequestConfig(requestSettings);
if (requestSettings.enabled && !requestConfig) {
  throw new Error('Print request configuration must use the approved recipient and FormSubmit endpoint.');
}
if (config.recipientConfirmed === true && !donationConfig) {
  throw new Error('Confirmed donation configuration must contain the recipient name, approved email, and an HTTPS Venmo profile URL without credentials.');
}

if (process.argv.includes('--production')) {
  if (!donationConfig) {
    console.error('Deployment blocked: verify an eligible Venmo charity profile and its recipient, supply its URL, then set recipientConfirmed in dist/donation-config.json.');
    process.exitCode = 1;
  }
  if (!requestConfig || requestSettings.activationConfirmed !== true) {
    console.error('Deployment blocked: approve print-request delivery, activate the recipient email, and verify receipt before setting activationConfirmed in dist/request-config.json.');
    process.exitCode = 1;
  }
  if (!process.exitCode) console.log('Static site checks passed; donation and print-request configuration are ready.');
} else {
  console.log(donationConfig ? 'Static site checks passed; donation configuration is present.' : 'Static site checks passed; donations are unavailable until configured.');
}
