// Route phone downloads to the appropriate app store after the page renders.
// Desktop visitors (and visitors without JavaScript) keep the store chooser.
(() => {
  const userAgent = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent)
    || (/Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);

  const storeUrl = isIOS
    ? 'https://apps.apple.com/nl/app/lumi/id6758712671'
    : /Android/i.test(userAgent)
      ? 'https://play.google.com/store/apps/details?id=org.ahti.verhalenbouwer'
      : null;

  if (!storeUrl || window.history.state?.lumiStoreOpened) return;

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) return;

    // Paint the chooser before handing off to the native store. Keep this
    // history entry so returning to the browser has a rendered page to show.
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      window.history.replaceState({ ...window.history.state, lumiStoreOpened: true }, '');
      window.location.assign(storeUrl);
    }));
  }, { once: true });
})();
