import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EventEmitter} from 'node:events';
import {correctDarkAppearancePalette, correctAppearancePalette, contrastRatio, APPEARANCE_DARK_FOREGROUNDS,
  APPEARANCE_FIXED_FOREGROUNDS, parseStudentAppearance, appearanceView, appearanceCss} from '../src/student-appearance.mjs';
import {createOnServer} from '../src/server.mjs';
import {initTheme} from '../public/student-appearance.mjs';

const source = readFileSync(new URL('../public/student-appearance.mjs', import.meta.url), 'utf8');
const storageKey = 'alekov.ui-theme.v1';
function browser({saved = null, blocked = false, readyState = 'loading'} = {}) {
  const domEvents = {}, windowEvents = {}, buttonEvents = {}, attributes = {}, writes = [];
  const icons = ['sun', 'moon'];
  const button = {children: icons, disabled: true, setAttribute: (key, value) => attributes[key] = value,
    set textContent(value) {throw Error('아이콘을 텍스트로 덮어쓰면 안 됩니다.');},
    addEventListener: (key, callback) => (buttonEvents[key] ??= []).push(callback)};
  let ready = readyState !== 'loading';
  const document = {documentElement: {dataset: {}}, readyState,
    getElementById: id => ready && id === 'theme-toggle' ? button : null,
    addEventListener: (key, callback) => domEvents[key] = callback};
  const window = {addEventListener: (key, callback) => windowEvents[key] = callback,
    localStorage: {getItem: () => {if (blocked) throw Error('blocked'); return saved;},
      setItem: (key, value) => {if (blocked) throw Error('blocked'); writes.push([key, value]);}}};
  initTheme(document, window);
  return {document, button, attributes, writes, windowEvents, window,
    mount() {ready = true; document.readyState = 'interactive'; domEvents.DOMContentLoaded();},
    click() {for (const callback of buttonEvents.click) callback();}};
}

test('first visit is dark; the icon button enables switching and persists both modes', () => {
  const page = browser();
  assert.equal(page.document.documentElement.dataset.theme, 'dark');
  page.mount(); assert.equal(page.button.title, '라이트 모드로 전환');
  assert.equal(page.button.disabled, false);
  page.click(); assert.equal(page.document.documentElement.dataset.theme, 'light');
  assert.equal(page.button.title, '다크 모드로 전환');
  assert.match(page.attributes['aria-label'], /현재 라이트 모드/);
  page.click(); assert.equal(page.document.documentElement.dataset.theme, 'dark');
  assert.deepEqual(page.writes, [[storageKey, 'light'], [storageKey, 'dark']]);
  assert.deepEqual(page.button.children, ['sun', 'moon']);
});

test('restores the saved mode and handles blocked or invalid storage', () => {
  const restored = browser({saved: 'light'});
  assert.equal(restored.document.documentElement.dataset.theme, 'light');
  restored.mount(); assert.equal(restored.button.title, '다크 모드로 전환');
  assert.equal(browser({saved: 'invalid'}).document.documentElement.dataset.theme, 'dark');
  const blocked = browser({blocked: true}); blocked.mount(); blocked.click();
  assert.equal(blocked.document.documentElement.dataset.theme, 'light');
});

test('initializes after DOM ready and repeated initialization does not double-toggle', () => {
  const page = browser({readyState: 'interactive'});
  assert.equal(page.button.disabled, false);
  initTheme(page.document, page.window);
  page.click(); assert.equal(page.document.documentElement.dataset.theme, 'light');
  assert.equal(page.writes.length, 1);
});

test('other tabs can update or clear the saved preference', () => {
  const page = browser(); page.mount();
  page.windowEvents.storage({key: storageKey, newValue: 'light'});
  assert.equal(page.document.documentElement.dataset.theme, 'light');
  page.windowEvents.storage({key: 'unrelated', newValue: 'dark'});
  assert.equal(page.document.documentElement.dataset.theme, 'light');
  page.windowEvents.storage({key: null, newValue: null});
  assert.equal(page.document.documentElement.dataset.theme, 'dark');
});

test('dark palette preserves the chosen dark surfaces and maintains readable colors', () => {
  const palette = {accent: '#60a5fa', background: '#0f172a', surface: '#1e293b'};
  const dark = correctDarkAppearancePalette(palette);
  assert.equal(dark.background, palette.background); assert.equal(dark.surface, palette.surface);
  for (const asked of [palette, {accent: '#000000', background: '#ffffff', surface: '#ffff00'},
    {accent: '#ff0000', background: '#ff00ff', surface: '#00ff00'}, null]) {
    const corrected = correctDarkAppearancePalette(asked);
    for (const front of Object.values(APPEARANCE_DARK_FOREGROUNDS)) {
      assert.ok(contrastRatio(front, corrected.background) >= 4.5);
      assert.ok(contrastRatio(front, corrected.surface) >= 4.5);
    }
    assert.ok(contrastRatio(corrected.accent, corrected.surface) >= 4.5);
    assert.ok(contrastRatio(corrected.accent, corrected.accentSoft) >= 4.5);
    assert.ok(contrastRatio(corrected.accent, '#0f172a') >= 4.5);
    assert.ok(contrastRatio(APPEARANCE_DARK_FOREGROUNDS.muted, corrected.accentSoft) >= 4.5);
  }
  const light = correctAppearancePalette(palette);
  for (const front of Object.values(APPEARANCE_FIXED_FOREGROUNDS)) {
    assert.ok(contrastRatio(front, light.background) >= 4.5);
    assert.ok(contrastRatio(front, light.surface) >= 4.5);
  }
});

test('appearance CSS supplies separate mode palettes without changing the JSON schema', () => {
  const parsed = parseStudentAppearance(readFileSync(new URL('../student/appearance.json', import.meta.url)));
  assert.equal(parsed.ok, true);
  const view = appearanceView({state: 'valid', value: parsed.value});
  const css = appearanceCss(view, parsed.value.palette);
  assert.match(css, /:root\{/);
  assert.match(css, /:root\[data-theme="dark"\]\{[^}]*--bg:#0f172a;--surface:#1e293b/);
  assert.doesNotMatch(appearanceCss(view, {accent: 'red;} body{display:none'}), /:root/);
  assert.doesNotMatch(appearanceCss(appearanceView({state: 'absent'})), /:root/);
});

test('icon button belongs to the sidebar footer and both mode palettes remain readable', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /src="\/theme.js"/);
  const sidebar = html.slice(html.indexOf('<nav class="sidebar"'), html.indexOf('</nav>'));
  assert.match(sidebar, /class="sidebar-footer"[\s\S]*id="theme-toggle"/);
  assert.match(sidebar, /theme-icon-sun/); assert.match(sidebar, /theme-icon-moon/);
  assert.equal((html.match(/id="theme-toggle"/g) ?? []).length, 1);
  assert.match(html, /<html[^>]*data-theme="dark"/);
  const css = readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
  const blocks = [css.match(/:root\s*\{([^}]+)\}/)[1], css.match(/:root:not\(\[data-theme="light"\]\)\s*\{([^}]+)\}/)[1]];
  for (const block of blocks) {
    const variables = Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/g)].map(match => [match[1], match[2]]));
    for (const key of ['allow', 'deny', 'challenge', 'unknown', 'student']) {
      assert.ok(contrastRatio(variables[key], variables[`${key}-soft`]) >= 4.5, key);
    }
    assert.ok(contrastRatio(variables.text, variables.surface) >= 4.5);
    assert.ok(contrastRatio(variables.muted, variables.surface) >= 4.5);
  }
});

// Serve real route handlers in memory: no port binding, login, external API or PC measurement.
test('theme control uses existing served modules without a new script route', async () => {
  const server = createOnServer({aiEnv: {}});
  server.address = () => ({port: 5189});
  async function request(url) {
    const req = new EventEmitter(); Object.assign(req, {method: 'GET', url, headers: {host: '127.0.0.1:5189'}});
    const res = new EventEmitter(); let status, headers;
    const response = new Promise(resolve => {
      res.writeHead = (value, fields) => {status = value; headers = fields;};
      res.end = data => {res.writableEnded = true; resolve({status, headers, body: String(data)});};
    });
    server.emit('request', req, res); return response;
  }
  try {
    const script = await request('/student-appearance.mjs');
    assert.equal(script.status, 200); assert.match(script.headers['content-type'], /javascript/);
    assert.match(script.headers['content-security-policy'], /script-src 'self'/);
    assert.equal(script.body, source);
    assert.match(script.body, /export function initTheme/);
    const app = await request('/app.js');
    assert.equal(app.status, 200); assert.match(app.body, /import \{initTheme\} from '\/student-appearance.mjs'/);
    const removed = await request('/theme.js'); assert.equal(removed.status, 404);
    const palette = await request('/student/appearance.css');
    assert.equal(palette.status, 200); assert.match(palette.body, /data-theme="dark"/);
    assert.match(palette.body, /--bg:#0f172a;--surface:#1e293b/);
    const page = await request('/'); assert.match(page.body, /id="theme-toggle"/);
  } finally {server.emit('close');}
});
