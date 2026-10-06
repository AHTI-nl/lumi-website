# AWS Amplify hosting

One Amplify app (`lumi-website`), one production branch (`main`), in
`verhalenbouwer-prd` (`322513863400`), region `eu-central-1` (Frankfurt).
This is a static site; it needs no server, database, Amplify backend or
environment variables. GitHub pushes to `main` trigger production builds.

## Connect GitHub manually

1. Ensure the Amplify migration changes are merged into `main`.
2. Sign into `verhalenbouwer-prd` and open the
   [Amplify console in Frankfurt](https://eu-central-1.console.aws.amazon.com/amplify/home?region=eu-central-1).
3. Choose **Create new app → GitHub**. Install/authorize the
   **AWS Amplify (eu-central-1)** GitHub app for `AHTI-nl`, granting access to
   **only `lumi-website`**. An organization owner may need to approve this.
4. Select `AHTI-nl/lumi-website` and branch `main`. Use app name `lumi-website`.
   Amplify reads `amplify.yml`: run tests, run `npm run build`, publish `dist`.
   Use Node.js 22 or later. There are no packages to install.
5. Save and deploy. Keep automatic branch creation and pull-request previews
   disabled. Connect only `main` and mark it as the production branch.
6. In **Hosting → Rewrites and redirects → Edit**, replace the rules with
   [`amplify-redirects.json`](amplify-redirects.json), preserving their order.
   These rules are configured separately; Amplify does **not** read this JSON
   file or `vercel.json` automatically. Remove any default SPA fallback.

An operator can also apply the redirect rules after the app exists:

```sh
aws amplify update-app --profile verhalenbouwer-prd --region eu-central-1 \
  --app-id YOUR_APP_ID --custom-rules file://amplify-redirects.json
```

## Verify before connecting the domain

On the `https://main.APP_ID.amplifyapp.com` URL, check:

- `/`, `/faq`, `/privacy`, `/gebruiksvoorwaarden`, `/nieuws/` and `/download`.
- Images, styling, news JSON and `/documents/lumi-uitlegfolder-pilot.pdf`.
- `/algemene-voorwaarden`, `/v1` and `/download-pilot` return redirects.
- A missing nested path returns the styled custom page with HTTP **404**.
- `/download` opens the App Store on iPhone/iPad and Google Play on Android.
  Desktop browsers show the QR code and both store links. This routing now
  uses JavaScript; without JavaScript the store links remain available.

PostHog and the Sparringpartner widget are intentionally limited to `lumi.nl`
and `www.lumi.nl` in the existing browser code. Verify them again on the custom
domain after migration.

## Connect `lumi.nl`

DNS is in a different account, `verhalenbouwer-shared` (`322171058948`), in
Route 53 zone `Z067112010T5YQF6F9UB`. Keep this hosted zone and delegation.

1. In the Amplify app, add custom domain `lumi.nl`, mapping both the apex and
   `www` to the same `main` branch. Keep `www.lumi.nl` as the canonical domain;
   the first redirect rule preserves the current apex-to-www redirect.
2. In the shared account's Route 53 zone, add the exact certificate validation
   CNAME supplied by Amplify. Leave that CNAME in place for certificate renewal.
3. Once the Amplify deployment passes the checks above and the certificate is
   issued, replace **only** the website DNS records with Amplify's supplied
   targets: apex **A alias** to its CloudFront distribution (alias hosted zone
   ID `Z2FDTNDATAQYW2`) and `www` **CNAME** to its supplied hostname.
   Preserve email, API, SES, verification and all other DNS records.
4. Wait for Amplify domain verification and DNS propagation. Check HTTPS on
   both names, apex-to-www redirection with paths/query strings, the page/asset
   checks above, the mobile download flow, PostHog and the chat widget.
5. Disconnect this repository from Vercel and retire the Vercel project after
   the custom-domain checks pass. There should be one active production app.

Before editing DNS, export the live records for rollback:

```sh
aws route53 list-resource-record-sets --profile verhalenbouwer-shared \
  --hosted-zone-id Z067112010T5YQF6F9UB > /tmp/lumi-dns-before-amplify.json
```

Observed before migration on 2026-10-06 (recheck before restoring):

| Name | Type | TTL | Vercel value |
| --- | --- | --- | --- |
| `lumi.nl` | A | 300 | `216.198.79.1` |
| `www.lumi.nl` | CNAME | 300 | `8ff7d8eaa7ac4836.vercel-dns-017.com.` |

While Vercel is retained for rollback, restoring those website records returns
traffic to it. `vercel.json` is retained during the transition.

## Local verification

```sh
npm test
npm run build
npx serve dist
```

The build copies public HTML, assets, scripts, styles, PDFs and the news JSON
into `dist/`. It excludes source documents, Markdown, configuration and Git
metadata. Local static servers do not apply Amplify's redirects; verify those
against the deployed app.

References: [GitHub connection](https://docs.aws.amazon.com/amplify/latest/userguide/setting-up-GitHub-access.html),
[build specification](https://docs.aws.amazon.com/amplify/latest/userguide/yml-specification-syntax.html),
[redirects and clean URLs](https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html),
[custom domains](https://docs.aws.amazon.com/amplify/latest/userguide/custom-domains.html).
