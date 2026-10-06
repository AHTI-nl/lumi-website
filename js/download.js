// Amplify does not support Vercel's User-Agent redirect conditions.
// Desktop visitors (and visitors without JavaScript) keep the store chooser.
(() => {
  const userAgent = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent)
    || (/Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);

  if (isIOS) {
    window.location.replace('https://apps.apple.com/nl/app/lumi/id6758712671');
  } else if (/Android/i.test(userAgent)) {
    window.location.replace('https://play.google.com/store/apps/details?id=org.ahti.verhalenbouwer');
  }
})();
