/** Public configuration only: never place credentials in the static website. */
export function readDonationConfig(config) {
  if (!config || typeof config.recipientName !== 'string' || typeof config.donationUrl !== 'string') {
    return null;
  }

  const recipientName = config.recipientName.trim();
  const donationUrl = config.donationUrl.trim();
  if (!recipientName || !donationUrl) return null;

  try {
    const url = new URL(donationUrl);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const hostname = url.hostname.toLowerCase();
    if (!hostname.includes('.') || hostname.endsWith('.invalid') || hostname.endsWith('.test') ||
        /(^|\.)example\.(com|org|net)$/.test(hostname) || hostname === '127.0.0.1' || hostname === '[::1]') {
      return null;
    }
    return { recipientName, donationUrl: url.href };
  } catch {
    return null;
  }
}
