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
The development-only Playwright suite checks the calculator, keyboard access,
mobile layouts, text enlargement, and repository-path hosting.
Screenshots and test results are ignored by Git.

## Current scope

The public site calculates a suggested donation only. Calculator values stay in
the browser; there are no payment links, print-request forms, email submissions,
accounts, or external service configuration. Online payments and request emails
are deferred for a future update.

## Publishing

The separate repository is `iFernandez96/wing-nuts-6410-donation-guide`. Enable
GitHub Pages with **GitHub Actions** as its source. Pull requests run lint and
browser tests. Passing changes on `main` also validate the static calculator,
upload only `dist`, and deploy through the `github-pages` environment.
No payment or email setup is required. No custom domain is configured.

Run the publication check locally:

```sh
docker compose run --rm checks npm run check:production
```

Review the local preview before the first public deployment. After deployment,
use the URL returned by the Pages action to check the calculator and its assets.
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
