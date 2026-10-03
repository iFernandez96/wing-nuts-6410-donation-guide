import { readRequestConfig } from './request-config.js';

const form = document.getElementById('print-request-form');
const fields = document.getElementById('request-fields');
const submit = document.getElementById('request-submit');
const status = document.getElementById('request-status');
let ready = false;
let sending = false;

async function loadRequests() {
  try {
    const response = await fetch(new URL('./request-config.json', import.meta.url), { cache: 'no-store' });
    if (!response.ok) return;
    const config = readRequestConfig(await response.json());
    if (!config) return;
    form.action = config.formEndpoint;
    fields.disabled = false;
    submit.disabled = false;
    document.getElementById('request-privacy').hidden = false;
    status.textContent = 'Your calculator selections will be included in the request.';
    ready = true;
  } catch {
    // Keep the form unavailable if delivery has not been configured.
  }
}

form.addEventListener('submit', (event) => {
  if (!ready || sending) {
    event.preventDefault();
    return;
  }

  const grams = document.getElementById('grams');
  if (!grams.validity.valid || (grams.value !== '' && (!Number.isFinite(grams.valueAsNumber) || grams.valueAsNumber < 0))) {
    event.preventDefault();
    status.textContent = 'Correct the calculator amount before sending your request.';
    grams.focus();
    return;
  }

  for (const [fieldName, selectId] of [
    ['Design source', 'design'],
    ['Filament type', 'filament'],
    ['Print time', 'time'],
    ['Post-processing', 'post'],
  ]) {
    form.elements.namedItem(fieldName).value = document.getElementById(selectId).selectedOptions[0].textContent;
  }
  form.elements.namedItem('Amount (grams)').value = grams.value || 'Not provided';
  form.elements.namedItem('Suggested donation').value = document.getElementById('total').textContent;
  sending = true;
  submit.disabled = true;
  status.textContent = 'Opening the request submission page…';
});

// Browser Back restores the form without requiring a duplicate submission.
window.addEventListener('pageshow', () => {
  sending = false;
  submit.disabled = !ready;
  if (ready) status.textContent = 'Your calculator selections will be included in the request.';
});

void loadRequests();
