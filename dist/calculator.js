'use strict';

const form = document.getElementById('donation-form');
const gramsInput = document.getElementById('grams');
const totalOutput = document.getElementById('total');
const minimumMessage = document.getElementById('min-msg');
const gramsError = document.getElementById('grams-error');

function calculate() {
  const grams = gramsInput.value === '' ? 0 : gramsInput.valueAsNumber;
  const valid = gramsInput.validity.valid && Number.isFinite(grams) && grams >= 0;

  gramsInput.setAttribute('aria-invalid', String(!valid));
  gramsError.hidden = valid;

  if (!valid) {
    totalOutput.textContent = '—';
    minimumMessage.hidden = true;
    return;
  }

  const design = Number(document.getElementById('design').value);
  const filament = Number(document.getElementById('filament').value);
  const time = Number(document.getElementById('time').value);
  const post = Number(document.getElementById('post').value);
  const amount = design + grams * filament + time + post;

  minimumMessage.hidden = amount >= 3;
  totalOutput.textContent = `$${Math.max(3, amount).toFixed(2)}`;
}

form.addEventListener('input', calculate);
form.addEventListener('change', calculate);
form.addEventListener('submit', (event) => event.preventDefault());
// Native reset applies its default values after the reset event finishes.
form.addEventListener('reset', () => setTimeout(calculate, 0));
calculate();
