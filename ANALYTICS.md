# Website analytics

The website reuses Lumi's existing EU PostHog project. Every website event has
`surface: website`; filter website reports by this property. Existing app events
are not relabeled. Localhost and Vercel preview hosts do not initialize PostHog.

## Implementation

`js/analytics.js` loads the official browser SDK once per HTML document. This is
a static multi-page site, so the SDK captures one `$pageview` on each page load
and `$pageleave` on exit. A delegated listener captures only links annotated with
`data-analytics-event`; it does not delay navigation or send link text or email
contents. Keep analytics annotations when editing or adding conversion links.

| Event | Properties | Meaning |
| --- | --- | --- |
| `$pageview`, `$pageleave` | Standard PostHog properties, `surface` | Website visits and page exits |
| `store link clicked` | `store`, `placement`, `surface` | Click to `app_store`, `google_play`, or `testflight` |
| `contact link clicked` | `purpose`, `placement`, `surface` | Click to email for `partner`, `feedback`, `support`, `privacy`, or `general` |

Store clicks are not confirmed downloads. Contact clicks are not confirmed emails
or partner registrations. Report TestFlight separately from public store clicks.

## Sources and QR links

PostHog captures standard UTMs and referrers. Use session entry attribution for
conversion reports when visitors navigate between pages. Cookies and person
profiles are disabled, so do not rely on persistent first-touch person properties.
Cookieless unique visitor counts are estimates and do not link across days or app
installation.

For a QR campaign, encode a Lumi website URL, for example:

`https://lumi.nl/?utm_source=partner_slug&utm_medium=qr&utm_campaign=launch_2026&utm_content=poster_01`

Use lowercase, stable campaign values. Never include names, email addresses, or
patient identifiers. A QR code that links directly to an app store bypasses the
website and cannot produce these events. For future printed short links, create
an owned Lumi redirect URL first so its destination can be changed later. Actual
install attribution needs store campaign reporting in addition to PostHog clicks.

## Privacy and rollout

The SDK uses `cookieless_mode: 'always'` and `person_profiles: 'never'`.
Autocapture, session replay, surveys, heatmaps, exception capture, performance
capture, and feature flag evaluation are disabled. Do Not Track and Global Privacy
Control skip SDK loading; a send hook also checks for later opt-outs. The SDK's
`respect_dnt` option alone still allows counting in cookieless `always` mode.
Querystrings and fragments are removed from captured page/referrer URLs while
standard UTM properties remain available for source reporting.

Rollout checklist:

1. In PostHog **Settings → Project → Web analytics**, enable **Cookieless server
   hash mode**. Without it, cookieless events are dropped. This is a prerequisite,
   not a setting the public browser token can manage.
2. Enable **Discard client IP data** in the project/environment settings.
   Existing projects retain their settings; do not assume the EU default
   changed this project.
3. Confirm the existing project's data retention and processing arrangements with
   the privacy owner, and add the applicable website retention period to the
   privacy statement. No retention period has been invented or changed here.
4. After deployment, verify `$pageview` and each conversion in PostHog's live
   events with `surface = website`. Open a UTM-tagged URL, navigate to another
   page, and check its session's entry source. Confirm no PostHog cookies or
   local/session storage entries are created in a fresh browser session.
5. Create a website report filtered to `surface = website`, with store clicks
   split by `store`/`placement` and session entry source/campaign. Configure
   separate conversion goals for public store clicks and partner contact clicks.

The Lumi project owner confirmed on 2026-09-08 that **Cookieless server hash
mode** and **Discard client IP data** are both enabled. The browser project token
cannot independently inspect these admin settings.

Vercel Web Analytics remains enabled during rollout. Once PostHog ingestion is
verified, it can be removed in a follow-up to avoid maintaining two dashboards.
The privacy text's cookieless claims describe the PostHog integration specifically.

## Public token and secret scanning

The `phc_` project token in the browser code is public by design. It allows event
ingestion and client configuration, not reading analytics or administering the
project. A Vercel environment variable would still need to be emitted into the
browser bundle; it helps manage environments but does not make this token secret.
This static site currently needs no build step, so the token is configured directly.

Do not disable secret scanning. If a generic scanner flags this public token,
review the finding and use an exception scoped to this token/finding with the
reason "Public PostHog browser project token". No scanning exception is currently
configured. Personal (`phx_`) and project secret (`phs_`) API keys must never be
committed or exposed to the browser.

References: [JavaScript SDK](https://posthog.com/docs/libraries/js),
[cookieless tracking](https://posthog.com/tutorials/cookieless-tracking),
[UTM attribution](https://posthog.com/docs/data/utm-segmentation),
[API and secret scanning](https://posthog.com/docs/api#github-secret-scanning).
