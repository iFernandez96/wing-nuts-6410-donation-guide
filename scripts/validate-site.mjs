import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = path.join(root, 'dist');
const html = readFileSync(path.join(publicRoot, 'index.html'), 'utf8');

assert.deepEqual(readdirSync(publicRoot).sort(), ['calculator.js', 'index.html', 'styles.css']);
assert.match(html, /6410 Wing Nuts/);
assert.match(html, /FRC Team 6410/);
assert.match(html, /Suggested Donation/);
assert.match(html, /Donations are voluntary/);
assert.match(html, /Printing services are <strong>FREE<\/strong>/);
assert.doesNotMatch(html, /TalonTech|Everett Alvarez|Club-Assisted/);
assert.doesNotMatch(html, /(?:src|href|action)="https?:|<form[^>]+action=/i);

for (const [, asset] of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)"/g)) {
  assert.ok(existsSync(path.join(publicRoot, asset)), `Missing local asset: ${asset}`);
}

console.log('Static calculator checks passed; ready for publication.');
