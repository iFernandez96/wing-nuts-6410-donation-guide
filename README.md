# 6410 Wing Nuts — 3D Printing Donation Guide

A standalone static website for Wing Nuts, FRC Team 6410. It preserves the
reference calculator's navy/gold layout, donation rates, five inputs, reset
control, $3 suggested minimum, and voluntary-donation explanation. Printing is
free; the calculated amount is a suggestion, not a required payment.

Adapted from [TalonTech's 3D Printing Donation Guide](https://zelensky-ea.github.io/TalonTech-3D-Printing-Donation-Guide/).
The project owner stated that they have permission to copy and adapt that site.
This attribution does not assert a license over the original author's work.
The wordmark and favicon use the team name and number; no official logo was supplied.

## Local development and verification

Docker Compose is the development entry point. Dependencies remain in a named
container volume; do not install dependencies with host Node/npm.

```sh
docker compose run --rm checks
docker compose up -d preview
```

Preview at [localhost:4173/wing-nuts-6410-donation-guide/](http://localhost:4173/wing-nuts-6410-donation-guide/).
Stop the preview with `docker compose stop preview`.
The site uses plain HTML/CSS/JavaScript without runtime npm dependencies or a
build step. `dist` is tracked source and the complete public deployment artifact.
The development-only Playwright suite checks the calculator, donation states,
keyboard access, mobile layouts, text enlargement, and repository-path hosting.
Screenshots and test results are ignored by Git.

## Configure donations

The draft in `dist/donation-config.json` records the requested name **Sheenal Kumar**
and `2026frc6410@gmail.com`; these are not proof of an eligible donation recipient.
No Venmo profile URL is configured or verified yet. Before enabling donations,
the owner must verify an eligible Venmo charity profile and its actual recipient,
then supply its approved HTTPS profile URL as `donationUrl`, update the recipient
name to match, and set `recipientConfirmed` to `true`. That flag confirms both
recipient identity and charity-profile eligibility. [Venmo's donation guidance](https://help.venmo.com/cs/articles/can-i-use-venmo-to-buy-or-sell-merchandise-goods-or-services-vhel227)
says personal profiles should not receive funds for donation campaigns or
nonprofits. Keep the recipient name and
email with that URL for maintenance.
Never put API keys, account credentials, or donor information in this file.

Once confirmed, **Donate with Venmo** opens the profile in a new tab. Donors
enter their amount on Venmo; the calculator does not transmit its suggested
amount or any other inputs. Donation access is independent of calculator
validation. Venmo handles payments and transaction records. This site never
claims that a payment succeeded.

Incomplete, unconfirmed, failed, or invalid configuration leaves the page showing
“Online donations are not available yet” with no active payment link. Development
checks allow the unconfirmed draft; production remains blocked. Confirmed links
must use HTTPS on exactly `venmo.com`, `www.venmo.com`, or `account.venmo.com`,
without credentials or a custom port. A valid URL alone does not establish
recipient ownership: the owner must verify the actual profile's recipient and
donor-entered amount support before launch.

Run the production gate after configuration:

```sh
docker compose run --rm checks npm run check:production
```

## Print-request emails

The expandable **Request a print** form collects a name, reply email, model URL,
quantity, and optional notes. It includes the calculator's design/material/time/
finishing choices, grams, and suggested donation in the submitted request. Blank
grams are sent as “Not provided.” A donation is not required. The form has no
payment field and never claims that a request constitutes a completed donation.

The owner approved FormSubmit, and delivery is configured in
`dist/request-config.json` for local activation and verification. The recipient is fixed to
`2026frc6410@gmail.com`. FormSubmit receives the form data and forwards the email;
the page explains that before submission. No files are uploaded to this site.
Activation and inbox delivery have not yet been confirmed.

Submission uses FormSubmit's hosted flow and default CAPTCHA. The provider must
confirm recipient ownership via an activation email. Verify an authorized test
request arrives before setting `activationConfirmed` to `true`; production
validation blocks publication until this is done. Local tests intercept the
provider and do not send emails or prove real delivery. The site does not claim
inbox delivery based on a click or browser return. Browser Back restores access
to the form after visiting the provider.

Completed-payment notifications come from the selected payment provider or bank.
Verify its recipient and email notification settings before launch; print-request
emails do not verify a donation. The website cannot detect payment completion
from an outbound link or payment instructions.

## Publishing

The separate repository is `iFernandez96/wing-nuts-6410-donation-guide`. Enable
GitHub Pages with **GitHub Actions** as its source. Pull requests run checks;
successful changes on `main` run the production-readiness check. If donation
configuration or verified request delivery is absent, the workflow reports the
missing launch inputs and skips deployment.
Otherwise, it uploads only `dist` and deploys through the `github-pages`
environment. No custom domain is configured.

Review the local preview and verify the approved recipient before the first
public deployment. After deployment, use the URL returned by the Pages action
to check the calculator, assets, and donation destination; no real donation is
needed to verify navigation. Payment completion/cancellation and receipt behavior
belong to the organization's hosted provider, not this static site's test suite.
To roll back a site change, revert its commit and let the same checks redeploy.

## Calculator behavior

The formula is `max(3, design + grams × filament rate + print time + finishing)`.
Blank grams means zero. Negative or invalid input displays an error rather than
an estimate. Totals display two decimal places. Reset restores all defaults and
clears errors. The original “Over 24 hours ($25+)” tier uses $25 in the estimate,
as in the supplied reference.

Examples:

- Defaults: **$3.00** with the minimum-suggestion notice.
- Personal design, PLA, 20g, under 1 hour, no finishing: **$3.00** without the notice.
- Personal design, PLA, 50g, 1–3 hours, light support removal: **$8.00**.
- Team-assisted, TPU, 120g, 3–6 hours, detailed cleanup: **$31.00**.

This project has no connection to the FRC Social App's accounts, data,
credentials, or deployments. It adds no analytics, donor database, or backend.
