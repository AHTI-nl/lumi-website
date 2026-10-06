# AWS Amplify hosting

One static Amplify app, with `main` as the eventual production branch:

| Setting | Value |
| --- | --- |
| App | `lumi-website` (`d23q6dzef6ds5u`) |
| AWS account | `verhalenbouwer-prd` (`322513863400`) |
| Region | `eu-central-1` (Frankfurt) |
| Test branch | `feat/amplify-hosting` |
| Test URL | <https://amplify-test.d23q6dzef6ds5u.amplifyapp.com> |

The test branch deploys automatically. Builds for `main` are disabled until
promotion. Automatic branch creation and pull-request previews stay disabled.
The site needs no backend, environment variables or private API keys.

## Build and routing

Amplify reads `amplify.yml`, runs the tests and copies the public site into
`dist/`. Source documents, Markdown and tooling are excluded. Use Node.js 22
or later; there are no packages to install.

```sh
npm test
npm run build
npx serve dist
```

Redirects are configured separately from the build. Apply
[`amplify-redirects.json`](amplify-redirects.json) in **Hosting → Rewrites and
redirects**, or run:

```sh
aws amplify update-app --profile verhalenbouwer-prd --region eu-central-1 \
  --app-id d23q6dzef6ds5u --custom-rules file://amplify-redirects.json
```

Keep rule order intact. The final `404-200` rule targets `/404.html`; verified
on this app to serve the custom page with HTTP 404. Local static servers do
not apply these rules.

## Test before cutover

On the Amplify test URL, verify:

- `/`, `/faq`, `/privacy`, `/gebruiksvoorwaarden`, `/nieuws/` and `/download`.
- Images, styling, news JSON and `/documents/lumi-uitlegfolder-pilot.pdf`.
- The legacy redirects and the styled 404 page for missing paths.
- `/download` opens the correct store on a phone and shows both store links
  on desktop. Back/reload should leave the chooser visible without reopening
  the store. Also test returning from the native store on a real phone.

Open the test site's `/download` URL directly on the phone. The printed QR
code points to `lumi.nl/download`, which reaches the current production host
until DNS cutover.

PostHog and the chat widget only activate on `lumi.nl` and `www.lumi.nl`.
Verify these integrations using the real-hostname checks below.

## Production rollout

The previous hosting GitHub integration is suspended. Keep it suspended and
retain the existing deployment and domain assignments for rollback.

DNS is in `verhalenbouwer-shared` (`322171058948`), Route 53 zone
`Z067112010T5YQF6F9UB`. Export the current records before changing DNS:

```sh
aws route53 list-resource-record-sets --profile verhalenbouwer-shared \
  --hosted-zone-id Z067112010T5YQF6F9UB > /tmp/lumi-dns-before-amplify.json
```

1. Prepare custom domains `lumi.nl` and `www.lumi.nl` against the test branch.
   Add Amplify's certificate-validation CNAME in the shared DNS account. Keep
   the existing website A/CNAME records until the cutover step.
2. Once the certificate and custom hostnames are deployed, test using a local
   DNS override to the Amplify distribution. This preserves the real browser
   origin while public visitors continue using the existing deployment.
   Verify HTTPS, apex-to-www redirects, paths/query strings, PostHog events
   and a chat conversation using synthetic content. Use a fresh browser
   profile and remove the local override after testing.
3. After merge approval, merge PR #38, enable automatic builds for `main` in
   the same Amplify app and verify its build. Map both domains to `main` and
   repeat the real-hostname checks. Preview setup does not authorize a merge.
4. Replace only the website records with Amplify's supplied targets: apex A
   alias to its CloudFront distribution (alias zone `Z2FDTNDATAQYW2`) and
   `www` CNAME to its supplied hostname. Keep certificate validation and all
   email, API and other records intact.
5. Verify both domains from normal browsers and a mobile connection. After
   a stable 24–48 hour rollback window, disconnect the test branch and have
   the previous hosting owner retire the old deployment. Leave one Amplify
   app with one connected production branch.

For an HTTP check before cutover, substitute the distribution supplied by
Amplify. Its custom hostname must already have a valid certificate:

```sh
curl --connect-to www.lumi.nl:443:AMPLIFY_DISTRIBUTION.cloudfront.net:443 \
  --head https://www.lumi.nl/
```

The domain association may remain `AWAITING_APP_CNAME` until public cutover;
verify the actual response and TLS certificate before proceeding. A laptop's
local DNS override does not apply to a phone.

## Rollback

Restore the saved apex A and `www` CNAME records from the DNS export. Keep the
previous deployment and domain assignments available throughout the rollback
window. Traffic returns as DNS caches expire; rollback is not instantaneous.

References: [GitHub connection](https://docs.aws.amazon.com/amplify/latest/userguide/setting-up-GitHub-access.html),
[build specification](https://docs.aws.amazon.com/amplify/latest/userguide/yml-specification-syntax.html),
[redirects](https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html),
[custom domains](https://docs.aws.amazon.com/amplify/latest/userguide/custom-domains.html).
