import { readDonationConfig } from './donation-config.js';

const link = document.getElementById('donate-link');
const recipient = document.getElementById('donation-recipient');
const status = document.getElementById('donation-status');
const help = document.getElementById('donation-help');

async function loadDonations() {
  try {
    const response = await fetch(new URL('./donation-config.json', import.meta.url), { cache: 'no-store' });
    if (!response.ok) return;
    const config = readDonationConfig(await response.json());
    if (!config) return;

    recipient.textContent = `Recipient: ${config.recipientName}`;
    link.href = config.donationUrl;
    recipient.hidden = false;
    help.hidden = false;
    link.hidden = false;
    status.hidden = true;
  } catch {
    // Missing, invalid, or unreachable configuration leaves donations unavailable.
  }
}

void loadDonations();
