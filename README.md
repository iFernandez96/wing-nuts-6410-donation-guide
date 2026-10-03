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

The source repository remains `iFernandez96/wing-nuts-6410-donation-guide`.
The public calculator is [wingnuts6410-printing.pages.dev](https://wingnuts6410-printing.pages.dev/)
on **Cloudflare Pages**, in the `wingnuts6410-printing` project.
GitHub Actions runs lint, browser tests, and static publication checks
on pull requests and changes to `main`; it does not deploy to GitHub Pages.
No payment or email setup is required. No purchased domain is needed.

Run the publication check locally:

```sh
docker compose run --rm checks npm run check:production
```

After checks pass, upload the contents of `dist` to the existing Cloudflare Pages
project using **Create a new deployment** and the production environment.
Cloudflare's Direct Upload accepts a folder or a ZIP with `index.html` at its root.
Only the three public files in `dist` belong in the upload. Source code pushes
do not automatically publish this Direct Upload project.

Review locally before publishing, then use the returned production URL to check
the calculator and its assets. To roll back, select a previous successful
production deployment in Cloudflare Pages or upload a previously verified
version of `dist`.

The former `wing-nuts-6410.pages.dev` address redirects to the new address.
Its separate Cloudflare project, `wing-nuts-6410`, receives only the files in
`hosting/old-address-redirect`; do not upload that redirect bundle to the current
calculator project. The redirect preserves paths for previously shared links.

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
