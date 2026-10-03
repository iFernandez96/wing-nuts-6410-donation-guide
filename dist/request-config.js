export function readRequestConfig(config) {
  if (!config || config.enabled !== true || config.recipientEmail !== '2026frc6410@gmail.com') return null;
  // The recipient is fixed. Only enable delivery after the owner approves it.
  if (config.formEndpoint !== 'https://formsubmit.co/2026frc6410@gmail.com') return null;
  return { recipientEmail: config.recipientEmail, formEndpoint: config.formEndpoint };
}
