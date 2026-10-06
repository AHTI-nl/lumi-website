# AWS Amplify hosting

Target: one Amplify app (`lumi-website`), one production branch (`main`), in
`verhalenbouwer-prd` (`322513863400`), region `eu-central-1` (Frankfurt).
This is a static site; it needs no server, database, Amplify backend or
environment variables. GitHub pushes to `main` trigger production builds.
During migration, first deploy `feat/amplify-hosting` on Amplify's own hostname.
No merge or website DNS cutover is needed for this initial test deployment.

Current test app: `d23q6dzef6ds5u`, branch `feat/amplify-hosting`, at
<https://amplify-test.d23q6dzef6ds5u.amplifyapp.com>. The initially connected
`main` branch has automatic builds disabled until promotion.

## Connect GitHub manually

1. Keep PR #38 unmerged while testing.
2. Sign into `verhalenbouwer-prd` and open the
   [Amplify console in Frankfurt](https://eu-central-1.console.aws.amazon.com/amplify/home?region=eu-central-1).
3. Choose **Create new app → GitHub**. Install/authorize the
   **AWS Amplify (eu-central-1)** GitHub app for `AHTI-nl`, granting access to
   **only `lumi-website`**. An organization owner may need to approve this.
4. Select `AHTI-nl/lumi-website` and branch `feat/amplify-hosting`.
   Use app name `lumi-website`.
   Amplify reads `amplify.yml`: run tests, run `npm run build`, publish `dist`.
   Use Node.js 22 or later. There are no packages to install.
5. Save and deploy. Keep automatic branch creation and pull-request previews
   disabled. Connect only this feature branch for now, and leave custom domains
   unset. Use the HTTPS branch URL displayed by Amplify.
6. In **Hosting → Rewrites and redirects → Edit**, replace the rules with
   [`amplify-redirects.json`](amplify-redirects.json), preserving their order.
   These rules are configured separately; Amplify does **not** read this JSON
   file or `vercel.json` automatically. Remove any default SPA fallback.
   The final rule uses `404-200` with `/404.html`: verified on this app to return
   the custom page with HTTP 404. The `404` rule instead produced a 302 redirect
   to the error page, ending in HTTP 200.

An operator can also apply the redirect rules after the app exists:

```sh
aws amplify update-app --profile verhalenbouwer-prd --region eu-central-1 \
  --app-id YOUR_APP_ID --custom-rules file://amplify-redirects.json
```

## Verify before connecting the domain

On the feature branch's Amplify URL, check:

- `/`, `/faq`, `/privacy`, `/gebruiksvoorwaarden`, `/nieuws/` and `/download`.
- Images, styling, news JSON and `/documents/lumi-uitlegfolder-pilot.pdf`.
- `/algemene-voorwaarden`, `/v1` and `/download-pilot` return redirects.
- A missing nested path returns the styled custom page with HTTP **404**.
- `/download` opens the App Store on iPhone/iPad and Google Play on Android.
  Desktop browsers show the QR code and both store links. This routing now
  uses JavaScript; without JavaScript the store links remain available.
  Open the Amplify `/download` URL directly on the phone: the existing QR code
  points to `lumi.nl/download`, which still reaches Vercel before DNS cutover.
  Return to the browser after visiting the store: the rendered chooser should
  remain available, and Back/reload should not automatically reopen the store.

PostHog and the Sparringpartner widget are intentionally limited to `lumi.nl`
and `www.lumi.nl` in the existing browser code. The Amplify hostname cannot
validate those integrations end to end. Use the pre-cutover custom-domain
checks below before moving public traffic.

## Test the real hostname before moving public traffic

After the feature branch passes the preview checks, prepare a custom-domain
association for `lumi.nl` and `www.lumi.nl` against that branch. Add only the
certificate validation CNAME in the shared Route 53 account. Do not replace
the existing website A/CNAME records yet.

Once Amplify has deployed the certificate and custom hostnames to CloudFront,
test using a local DNS override that sends `lumi.nl` and `www.lumi.nl` to the
Amplify distribution only on the test machine. This keeps the real hostname,
TLS verification and browser origin while public visitors still reach Vercel.
First verify the association is sufficiently provisioned: it may report
`AWAITING_APP_CNAME` until the public cutover. Do not bypass TLS checks or assume
the custom hostname is ready solely because the preview works.

For an HTTP check, use the distribution hostname supplied by Amplify:

```sh
curl --connect-to www.lumi.nl:443:AMPLIFY_DISTRIBUTION.cloudfront.net:443 \
  --head https://www.lumi.nl/
```

For browser checks, temporarily map both hostnames to an IP resolved from that
distribution, using a local hosts override or a separate browser profile with
DNS overrides. Confirm responses come from Amplify and use a fresh browser
profile to avoid Vercel's cached responses. Remove overrides after testing.

Verify the chat widget opens and exchanges a test message, and that PostHog
receives page views and annotated link events. These are real production
integrations; use synthetic test content. Check apex-to-www redirects, paths,
query parameters and valid HTTPS on both names. A local override on a laptop
does not apply to a phone; test mobile routing on the Amplify URL separately.

## Promote the tested deployment

Only after merge approval, merge PR #38, connect `main` within the same Amplify
app, enable its automatic builds, and verify its build. Mark `main` as the
production branch and update the
custom-domain mappings to it. Repeat the custom-hostname checks against that
deployment before cutting over DNS. Disconnect `feat/amplify-hosting` after the
migration, leaving one app and one connected branch. No merge is authorized by
the initial preview setup.

## Connect `lumi.nl`

DNS is in a different account, `verhalenbouwer-shared` (`322171058948`), in
Route 53 zone `Z067112010T5YQF6F9UB`. Keep this hosted zone and delegation.

1. In the Amplify app, confirm custom domain `lumi.nl` maps both the apex and
   `www` to the tested `main` branch. Keep `www.lumi.nl` as the canonical domain;
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
