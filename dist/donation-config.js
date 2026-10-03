/** Public configuration only: never place credentials in the static website. */
export function readDonationConfig(config) {
  // The owner confirms both the actual recipient and eligible charity profile.
  if (!config || config.recipientConfirmed !== true ||
      typeof config.recipientName !== 'string' || typeof config.donationUrl !== 'string' ||
      config.recipientEmail !== '2026frc6410@gmail.com') {
    return null;
  }

  const recipientName = config.recipientName.trim();
  const donationUrl = config.donationUrl.trim();
  if (!recipientName || !donationUrl) return null;

  try {
    const url = new URL(donationUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const hostname = url.hostname.toLowerCase();
    if (!['venmo.com', 'www.venmo.com', 'account.venmo.com'].includes(hostname) || url.pathname === '/') return null;
    return { recipientName, recipientEmail: config.recipientEmail, donationUrl: url.href };
  } catch {
    return null;
  }
}
