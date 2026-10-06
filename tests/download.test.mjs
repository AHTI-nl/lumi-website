import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../js/download.js', import.meta.url), 'utf8');
const apple = 'https://apps.apple.com/nl/app/lumi/id6758712671';
const google = 'https://play.google.com/store/apps/details?id=org.ahti.verhalenbouwer';

for (const [device, userAgent, maxTouchPoints, expected] of [
  ['iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5, apple],
  ['iPad', 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)', 5, apple],
  ['iPad desktop mode', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 5, apple],
  ['Android', 'Mozilla/5.0 (Linux; Android 15; Pixel 9)', 5, google],
  ['Mac desktop', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 0, undefined],
  ['Windows touchscreen', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 10, undefined],
  ['unknown browser', '', 0, undefined],
]) {
  test(`${device}: ${expected ? 'opens the correct store' : 'keeps the chooser'}`, () => {
    const redirects = [];
    runInNewContext(script, {
      navigator: { userAgent, maxTouchPoints },
      window: { location: { replace: (url) => redirects.push(url) } },
    });
    assert.deepEqual(redirects, expected ? [expected] : []);
  });
}
