# AWS Amplify hosting

One static Amplify app with one production branch. Every merge to `main`
automatically runs the tests, builds the site and deploys it.

| Setting | Value |
| --- | --- |
| App | `lumi-website` (`d23q6dzef6ds5u`) |
| AWS account | `verhalenbouwer-prd` (`322513863400`) |
| Region | `eu-central-1` (Frankfurt) |
| Branch | `main` |
| Website | <https://www.lumi.nl> (`lumi.nl` redirects here) |
| Amplify URL | <https://main.d23q6dzef6ds5u.amplifyapp.com> |

Pull requests targeting `main` get temporary Amplify preview deployments.
Amplify links the preview URL from the GitHub PR, rebuilds it when commits
are pushed, and removes it when the PR is closed or merged. Automatic
deployment of ordinary branches remains disabled.

Hosting needs no backend, environment variables or private API keys.

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

## Verify a deployment

Use the PR preview to check changes before merging. After merging, check that
the `main` build succeeded in Amplify and verify on the production website:

- `/`, `/faq`, `/privacy`, `/gebruiksvoorwaarden`, `/nieuws/` and `/download`.
- Images, styling, news JSON and `/documents/lumi-uitlegfolder-pilot.pdf`.
- The legacy redirects and the styled 404 page for missing paths.
- `/download` opens the correct store on a phone and shows both store links
  on desktop. Back/reload should leave the chooser visible without reopening
  the store. Also test returning from the native store on a real phone.

PostHog and the chat widget only activate on `lumi.nl` and `www.lumi.nl`.
They do not run on PR previews.
PostHog uses the public browser token in `js/analytics.js`. Chat visibility is
also controlled by the chat service's `lumi-website` origin configuration.

## Domains and DNS

DNS is in `verhalenbouwer-shared` (`322171058948`), Route 53 zone
`Z067112010T5YQF6F9UB`. Both custom domains map to `main`.

| Record | Target |
| --- | --- |
| `lumi.nl` A alias | `d16ojxlk8twz58.cloudfront.net` (alias zone `Z2FDTNDATAQYW2`) |
| `www.lumi.nl` CNAME | `d16ojxlk8twz58.cloudfront.net` |

Keep Amplify's certificate-validation CNAME for automatic certificate renewal.
Routine releases require no DNS changes. Leave email, API and app records
unchanged when maintaining website DNS.

Export the current records before a DNS change:

```sh
aws route53 list-resource-record-sets --profile verhalenbouwer-shared \
  --hosted-zone-id Z067112010T5YQF6F9UB > /tmp/lumi-dns-before-change.json
```

## Rollback

For a website regression, revert the offending change through a pull request
and let `main` redeploy. Redirect rules are configured separately; restore
them separately if they caused the regression.

For a DNS rollback, restore only the affected website records from the saved
export. The previous destination must still serve the domains. Traffic returns
as DNS caches expire.

References: [GitHub connection](https://docs.aws.amazon.com/amplify/latest/userguide/setting-up-GitHub-access.html),
[PR previews](https://docs.aws.amazon.com/amplify/latest/userguide/pr-previews.html),
[build specification](https://docs.aws.amazon.com/amplify/latest/userguide/yml-specification-syntax.html),
[redirects](https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html),
[custom domains](https://docs.aws.amazon.com/amplify/latest/userguide/custom-domains.html).
