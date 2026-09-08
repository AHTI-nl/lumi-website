/* ============================================
   Lumi Marketing — Privacy-first analytics
   ============================================ */

(function initLumiAnalytics() {
  'use strict';

  // Public browser project token: intentionally visible in the SDK and event requests.
  // It cannot read analytics or administer the project. Never put phx_/phs_ keys here.
  // https://posthog.com/docs/api#github-secret-scanning
  const POSTHOG_PROJECT_TOKEN = 'phc_DfN68D79GQwwTEPzQoiK55SmBMNDPwviJTTKE5LwfbZk';
  const POSTHOG_API_HOST = 'https://eu.i.posthog.com';
  const POSTHOG_UI_HOST = 'https://eu.posthog.com';
  const PRODUCTION_HOSTS = new Set(['lumi.nl', 'www.lumi.nl']);

  if (
    !PRODUCTION_HOSTS.has(window.location.hostname) ||
    !POSTHOG_PROJECT_TOKEN.startsWith('phc_') ||
    hasPrivacyOptOut()
  ) {
    return;
  }

  loadPostHog();

  window.posthog.init(POSTHOG_PROJECT_TOKEN, {
    api_host: POSTHOG_API_HOST,
    ui_host: POSTHOG_UI_HOST,
    defaults: '2026-08-30',
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    capture_performance: false,
    capture_exceptions: false,
    advanced_disable_feature_flags: true,
    cookieless_mode: 'always',
    person_profiles: 'never',
    disable_session_recording: true,
    disable_surveys: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    respect_dnt: true,
    before_send: sanitizeEvent,
  });

  document.addEventListener('click', captureTrackedClick);

  function captureTrackedClick(domEvent) {
    if (!(domEvent.target instanceof Element)) return;

    const element = domEvent.target.closest('[data-analytics-event]');
    if (!element) return;

    const eventName = element.dataset.analyticsEvent;
    if (!eventName) return;

    const properties = {
      placement: element.dataset.analyticsPlacement,
      store: element.dataset.analyticsStore,
      purpose: element.dataset.analyticsPurpose,
    };

    const href = element.getAttribute('href');
    if (href) {
      try {
        const destination = new URL(href, window.location.origin);
        properties.destination_type = destination.protocol === 'mailto:' ? 'email' : 'web';
        if (destination.protocol === 'http:' || destination.protocol === 'https:') {
          properties.destination_domain = destination.hostname;
        }
      } catch (_) {
        // Ignore malformed destinations instead of sending raw link values.
      }
    }

    Object.keys(properties).forEach((key) => {
      if (properties[key] === undefined || properties[key] === null || properties[key] === '') {
        delete properties[key];
      }
    });

    window.posthog.capture(eventName, properties);
  }

  function sanitizeEvent(event) {
    if (hasPrivacyOptOut()) return null;
    if (!event || !event.properties) return event;

    const urlProperties = [
      '$current_url',
      '$referrer',
      '$initial_current_url',
      '$initial_referrer',
    ];

    urlProperties.forEach((property) => {
      if (event.properties[property]) {
        event.properties[property] = stripQueryAndHash(event.properties[property]);
      }
    });

    event.properties.surface = 'website';
    return event;
  }

  function hasPrivacyOptOut() {
    // In cookieless "always" mode, respect_dnt alone still permits counting.
    // Honour browser opt-outs by skipping the SDK and dropping later events.
    return [
      navigator.doNotTrack,
      navigator.msDoNotTrack,
      window.doNotTrack,
      navigator.globalPrivacyControl,
    ].some((signal) => signal === true || signal === 1 || signal === '1' || signal === 'yes');
  }

  function stripQueryAndHash(value) {
    if (typeof value !== 'string' || !/^(https?:|\/)/.test(value)) return value;

    try {
      const url = new URL(value, window.location.origin);
      return `${url.origin}${url.pathname}`;
    } catch (_) {
      return undefined;
    }
  }

  function loadPostHog() {
    // Official PostHog JavaScript snippet. Keep this in sync with their installation docs.
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  }
})();
