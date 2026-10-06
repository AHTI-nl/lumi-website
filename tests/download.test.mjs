import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../js/download.js', import.meta.url), 'utf8');
const apple = 'https://apps.apple.com/nl/app/lumi/id6758712671';
const google = 'https://play.google.com/store/apps/details?id=org.ahti.verhalenbouwer';

function browser(userAgent, maxTouchPoints, initialState = null) {
  const redirects = [];
  const listeners = new Map();
  let frames = [];
  const history = {
    state: initialState,
    replaceState(state) { this.state = state; },
  };
  runInNewContext(script, {
    navigator: { userAgent, maxTouchPoints },
    window: {
      history,
      location: {
        assign: (url) => redirects.push(url),
        replace: () => assert.fail('The rendered download page must remain in browser history'),
      },
      addEventListener: (name, callback, options) => listeners.set(name, { callback, options }),
      requestAnimationFrame: (callback) => frames.push(callback),
    },
  });
  return {
    redirects,
    history,
    show(persisted = false) {
      const listener = listeners.get('pageshow');
      if (listener?.options?.once) listeners.delete('pageshow');
      listener?.callback({ persisted });
    },
    frame() {
      const pending = frames;
      frames = [];
      pending.forEach((callback) => callback());
    },
  };
}

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
    const page = browser(userAgent, maxTouchPoints);
    assert.deepEqual(page.redirects, [], 'Do not leave while the page is parsing');
    page.show();
    page.frame();
    assert.deepEqual(page.redirects, [], 'Let the browser paint before opening the store');
    page.frame();
    assert.deepEqual(page.redirects, expected ? [expected] : []);
  });
}

test('returning from the store does not reopen it', () => {
  const page = browser('iPhone', 5);
  page.show();
  page.frame();
  page.frame();
  page.show(true);
  page.frame();
  page.frame();
  assert.deepEqual(page.redirects, [apple]);
});

test('returning without the back-forward cache keeps the chooser', () => {
  const firstVisit = browser('Android', 5, { existing: 'preserved' });
  firstVisit.show();
  firstVisit.frame();
  firstVisit.frame();
  assert.equal(firstVisit.history.state.existing, 'preserved');
  const restoredPage = browser('Android', 5, firstVisit.history.state);
  restoredPage.show();
  restoredPage.frame();
  restoredPage.frame();
  assert.deepEqual(restoredPage.redirects, []);
});

test('restoring a cached page does not start a new store navigation', () => {
  const page = browser('iPhone', 5);
  page.show(true);
  page.frame();
  page.frame();
  assert.deepEqual(page.redirects, []);
});
