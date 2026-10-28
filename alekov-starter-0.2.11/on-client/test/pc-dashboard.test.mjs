import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../student/extension.mjs', import.meta.url), 'utf8').split('export function createStudentView')[0];
const flush = () => new Promise(resolve => setImmediate(resolve));
const all = node => [node, ...node.childNodes.flatMap(all)];

// Small DOM fixture with node identity, reflected attributes and real parent/child moves.
function setup() {
  let now = Date.now(), nextTimer = 0;
  const timers = new Map(), requests = [];
  const document = {hidden: false, activeElement: null, addEventListener() {}};
  class Text {
    constructor(value) {this.nodeType = 3; this.nodeName = '#text'; this.nodeValue = String(value); this.childNodes = [];}
    get textContent() {return this.nodeValue;}
    remove() {if (this.parentNode) this.parentNode.childNodes.splice(this.parentNode.childNodes.indexOf(this), 1); this.parentNode = null;}
    replaceWith(node) {const parent = this.parentNode, index = parent.childNodes.indexOf(this); node.remove(); parent.childNodes[index] = node; node.parentNode = parent; this.parentNode = null;}
  }
  class Element extends Text {
    constructor(name) {
      super(''); this.nodeType = 1; this.localName = name; this.nodeName = name; this.attributes = new Map(); this.events = {};
      const attr = key => 'data-' + key.replace(/[A-Z]/g, char => '-' + char.toLowerCase());
      this.dataset = new Proxy({}, {get: (_, key) => this.getAttribute(attr(key)) ?? undefined,
        set: (_, key, value) => {this.setAttribute(attr(key), value); return true;}});
    }
    get isConnected() {return this === document.body || !!this.parentNode?.isConnected;}
    get lastChild() {return this.childNodes.at(-1);}
    get textContent() {return this.childNodes.map(node => node.textContent).join('');}
    set textContent(value) {for (const node of [...this.childNodes]) node.remove(); if (String(value)) this.append(new Text(value));}
    append(...nodes) {for (const node of nodes) {node.remove(); node.parentNode = this; this.childNodes.push(node);}}
    insertBefore(node, reference) {node.remove(); const index = this.childNodes.indexOf(reference); assert.ok(index >= 0); this.childNodes.splice(index, 0, node); node.parentNode = this;}
    getAttribute(name) {return this.attributes.get(name) ?? null;}
    getAttributeNames() {return [...this.attributes.keys()];}
    hasAttribute(name) {return this.attributes.has(name);}
    setAttribute(name, value) {this.attributes.set(name, String(value));}
    removeAttribute(name) {this.attributes.delete(name);}
    get id() {return this.getAttribute('id') ?? '';}
    set id(value) {this.setAttribute('id', value);}
    get className() {return this.getAttribute('class') ?? '';}
    set className(value) {this.setAttribute('class', value);}
    get hidden() {return this.hasAttribute('hidden');}
    set hidden(value) {if (value) this.setAttribute('hidden', ''); else this.removeAttribute('hidden');}
    get disabled() {return this.hasAttribute('disabled');}
    set disabled(value) {if (value) this.setAttribute('disabled', ''); else this.removeAttribute('disabled');}
    get tabIndex() {return Number(this.getAttribute('tabindex'));}
    set tabIndex(value) {this.setAttribute('tabindex', value);}
    get open() {return this.hasAttribute('open');}
    set open(value) {if (value) this.setAttribute('open', ''); else this.removeAttribute('open');}
    addEventListener(key, callback) {this.events[key] = callback;}
    fire(key, value = {}) {return this.events[key]?.(value);}
    focus() {document.activeElement = this;}
  }
  document.body = new Element('body');
  document.createElement = name => new Element(name);
  document.createElementNS = (_, name) => new Element(name);
  class Clock extends Date {constructor(...args) {super(...(args.length ? args : [now]));} static now() {return now;}}
  const context = vm.createContext({document, window: {addEventListener() {}}, navigator: {connection: {downlink: 10}}, Date: Clock, queueMicrotask,
    setTimeout: (fn, delay) => {const id = ++nextTimer; timers.set(id, {fn, delay}); return id;}, clearTimeout: id => timers.delete(id)});
  vm.runInContext(source, context);
  let root;
  const render = context.createPcDashboard({get: () => new Promise(resolve => requests.push(resolve))}, () => {
    const next = render(); if (root) root.replaceWith(next); else document.body.append(next); root = next;
  });
  root = render(); document.body.append(root);
  const find = predicate => all(root).find(predicate);
  return {get root() {return root;}, requests, timers, document,
    card: key => find(node => node.dataset?.metric === key),
    graph: key => {const card = find(node => node.dataset?.indicator === key); return all(card).find(node => node.localName === 'svg');},
    button: () => find(node => node.localName === 'button'),
    checkbox: () => find(node => node.dataset?.pcAutoRefresh !== undefined),
    status: () => find(node => node.getAttribute?.('role') === 'status'),
    indicators: () => find(node => node.id === 'pc-indicators'),
    advance(ms) {now += ms;},
    finish(index, cpu = 20, ok = true, memory = 50) {
      requests[index](ok ? {ok: true, data: {schema: 'aleph.on.pc-status.v1', source: 'local-pc', measuredAt: new Date(now).toISOString(),
        metrics: {cpu: cpu === null ? {state: 'unavailable', reason: 'timeout'} : {state: 'ok', usagePercent: cpu},
          memory: memory === null ? {state: 'unavailable', reason: 'timeout'} : {state: 'ok', usedBytes: memory, totalBytes: 100},
          disk: {state: 'ok', freeBytes: 30, totalBytes: 100}}}} : {ok: false});
    }};
}

test('refresh retains values and graph nodes, then changes the existing meter in place', async () => {
  const ui = setup(); await flush(); ui.finish(0); await flush();
  const root = ui.root, cpu = ui.card('cpu'), graph = ui.graph('cpu');
  const fill = all(cpu).find(node => node.className === 'pc-usage-fill');
  const measurements = all(ui.indicators()).find(node => node.localName === 'details'); measurements.open = true;
  const beforeStatus = ui.status().textContent;
  const pending = ui.button().fire('click');
  assert.equal(ui.root, root); assert.equal(ui.card('cpu'), cpu); assert.equal(ui.graph('cpu'), graph);
  assert.match(cpu.textContent, /사용 20.0%/); assert.doesNotMatch(cpu.textContent, /조회 중/);
  assert.equal(ui.status().textContent, beforeStatus); assert.equal(ui.button().disabled, true);
  assert.equal(measurements.open, true);
  ui.button().fire('click'); assert.equal(ui.requests.length, 2, 'in-flight reads are not duplicated');
  ui.advance(1000); ui.finish(1, 60); await pending;
  assert.equal(ui.card('cpu'), cpu); assert.equal(ui.graph('cpu'), graph);
  assert.equal(all(cpu).find(node => node.className === 'pc-usage-fill'), fill);
  assert.equal(Number(fill.getAttribute('width')), 192); assert.match(cpu.textContent, /사용 60.0%/);
  assert.equal(all(graph).filter(node => node.localName === 'circle').length, 2);
  assert.equal(measurements.open, true);
  const retry = ui.button().fire('click'); ui.finish(2, 40); await retry;
  assert.equal(ui.indicators().hidden, false); assert.equal(measurements.open, true);
});

test('failed refresh keeps the last measured value with an explicit failure; partial data replaces it', async () => {
  const ui = setup(); await flush(); ui.finish(0); await flush();
  let pending = ui.button().fire('click'); ui.finish(1, 0, false); await pending;
  assert.match(ui.card('cpu').textContent, /사용 20.0%/); assert.match(ui.status().textContent, /갱신 실패 · 마지막 측정값 유지/);
  pending = ui.button().fire('click'); assert.match(ui.card('cpu').textContent, /사용 20.0%/);
  ui.finish(2, null); await pending;
  assert.match(ui.card('cpu').textContent, /확인 불가/); assert.doesNotMatch(ui.card('cpu').textContent, /사용 20.0%/);
  assert.equal(all(ui.card('cpu')).some(node => node.getAttribute?.('role') === 'meter'), false);
});

test('a slow refresh retains values but still labels an expired measurement as old', async () => {
  const ui = setup(); await flush(); ui.finish(0); await flush();
  const pending = ui.button().fire('click'); ui.advance(61000);
  [...ui.timers.values()].find(timer => timer.delay > 60000).fn();
  assert.match(ui.card('cpu').textContent, /사용 20.0%/); assert.match(ui.status().textContent, /오래된 기록/);
  ui.finish(1, 25); await pending; assert.doesNotMatch(ui.status().textContent, /오래된 기록/);
});

test('10-second refresh preserves checkbox and graphs while values update', async () => {
  const ui = setup(); await flush(); ui.finish(0); await flush();
  const checkbox = ui.checkbox(); checkbox.checked = true; checkbox.fire('change'); ui.finish(1, 30); await flush();
  const graph = ui.graph('cpu');
  assert.match(ui.root.textContent, /10초마다 자동 조회/);
  const timer = [...ui.timers].find(([, timer]) => timer.delay === 10000); ui.timers.delete(timer[0]); timer[1].fn();
  assert.equal(ui.checkbox(), checkbox); assert.equal(checkbox.checked, true); assert.match(ui.card('cpu').textContent, /사용 30.0%/);
  assert.equal(ui.graph('cpu'), graph); assert.equal(ui.indicators().hidden, false);
  checkbox.checked = false; checkbox.fire('change'); ui.finish(2, 35); await flush();
  assert.equal(ui.checkbox().checked, false); assert.equal([...ui.timers.values()].some(timer => timer.delay === 10000), false);
  assert.match(ui.card('cpu').textContent, /사용 35.0%/);
});

test('indicators appear directly without tabs or query logs and retain twelve measurements', async () => {
  const ui = setup(); await flush(); ui.finish(0); await flush();
  for (let index = 1; index < 20; index++) {
    const pending = ui.button().fire('click'); ui.advance(1000); ui.finish(index); await pending;
  }
  const section = ui.indicators();
  assert.equal(section.hidden, false);
  assert.equal(section.childNodes[0].textContent, '상태 지표');
  assert.equal(section.getAttribute('aria-label'), 'PC 상태 지표');
  assert.equal(all(ui.root).some(node => ['tab', 'tablist', 'tabpanel'].includes(node.getAttribute?.('role'))), false);
  assert.doesNotMatch(ui.root.textContent, /조회 기록|상세 관측/);
  assert.equal(all(section).filter(node => node.dataset?.indicator !== undefined).length, 3);
  const table = all(section).find(node => node.localName === 'tbody');
  assert.equal(table.childNodes.length, 12);
  assert.equal(all(ui.graph('cpu')).filter(node => node.localName === 'circle').length, 12);
});

test('CPU and memory distinguish initial spikes from three consecutive high readings and recover independently', async () => {
  const ui = setup(); await flush(); ui.finish(0, 85, true, 84.9); await flush();
  const cpuCard = ui.card('cpu');
  const notice = key => all(ui.card(key)).find(node => node.className === 'pc-overload-notice');
  assert.equal(cpuCard.dataset.overload, 'elevated'); assert.match(notice('cpu').textContent, /연속 1\/3회/);
  assert.equal(ui.card('memory').dataset.overload, 'normal'); assert.equal(notice('memory').hidden, true);
  let pending = ui.button().fire('click'); ui.advance(1000); ui.finish(1, 90, true, 85); await pending;
  assert.equal(ui.card('cpu').dataset.overload, 'elevated'); assert.match(notice('cpu').textContent, /연속 2\/3회/);
  pending = ui.button().fire('click'); ui.advance(1000); ui.finish(2, 95, true, 90); await pending;
  assert.equal(ui.card('cpu'), cpuCard); assert.equal(cpuCard.dataset.overload, 'sustained');
  assert.match(notice('cpu').textContent, /CPU 사용량이 계속 높습니다.*3회 연속 85% 이상/);
  assert.equal(notice('cpu').getAttribute('aria-live'), 'polite');
  assert.equal(ui.card('memory').dataset.overload, 'elevated');
  pending = ui.button().fire('click');
  assert.equal(cpuCard.dataset.overload, 'sustained', 'pending refresh preserves the last alert without counting another reading');
  ui.advance(1000); ui.finish(3, 84.9, true, 90); await pending;
  assert.equal(cpuCard.dataset.overload, 'normal'); assert.equal(notice('cpu').hidden, true);
  assert.equal(ui.card('memory').dataset.overload, 'sustained'); assert.match(notice('memory').textContent, /메모리 사용량이 계속 높습니다/);
  pending = ui.button().fire('click'); ui.advance(1000); ui.finish(4, 85, true, 50); await pending;
  assert.equal(cpuCard.dataset.overload, 'elevated'); assert.match(notice('cpu').textContent, /연속 1\/3회/);
  assert.equal(ui.card('memory').dataset.overload, 'normal');
});

test('unavailable metrics reset their own streak and failed queries reset both streaks', async () => {
  const ui = setup(); await flush(); ui.finish(0, 90, true, 90); await flush();
  const refresh = async (cpu, memory = 90, ok = true) => {
    const pending = ui.button().fire('click'); ui.advance(1000); ui.finish(ui.requests.length - 1, cpu, ok, memory); await pending;
  };
  await refresh(90);
  await refresh(null);
  assert.equal(ui.card('cpu').dataset.overload, 'unavailable'); assert.match(ui.card('cpu').textContent, /확인 불가/);
  assert.equal(ui.card('memory').dataset.overload, 'sustained');
  await refresh(90, null);
  assert.equal(ui.card('cpu').dataset.overload, 'elevated'); assert.match(ui.card('cpu').textContent, /연속 1\/3회/);
  assert.equal(ui.card('memory').dataset.overload, 'unavailable');
  await refresh(90);
  await refresh(90, 90, false);
  for (const key of ['cpu', 'memory']) {
    assert.equal(ui.card(key).dataset.overload, 'unavailable'); assert.match(ui.card(key).textContent, /과거 측정/);
  }
  await refresh(90);
  for (const key of ['cpu', 'memory']) assert.match(ui.card(key).textContent, /연속 1\/3회/);
  await refresh(90);
  for (const key of ['cpu', 'memory']) assert.equal(ui.card(key).dataset.overload, 'elevated');
  await refresh(90);
  for (const key of ['cpu', 'memory']) assert.equal(ui.card(key).dataset.overload, 'sustained');
});

test('duplicate timestamps and gaps longer than sixty seconds do not establish sustained overload', async () => {
  const ui = setup(); await flush(); ui.finish(0, 90); await flush();
  let pending = ui.button().fire('click'); ui.finish(1, 90); await pending;
  assert.match(ui.card('cpu').textContent, /연속 1\/3회/);
  for (let index = 2; index <= 3; index++) {
    pending = ui.button().fire('click'); ui.advance(1000); ui.finish(index, 90); await pending;
  }
  assert.equal(ui.card('cpu').dataset.overload, 'sustained');
  ui.advance(61000); [...ui.timers.values()].find(timer => timer.delay > 60000).fn();
  assert.equal(ui.card('cpu').dataset.overload, 'unavailable'); assert.match(ui.card('cpu').textContent, /과거 측정/);
  pending = ui.button().fire('click'); ui.finish(4, 90); await pending;
  assert.equal(ui.card('cpu').dataset.overload, 'elevated'); assert.match(ui.card('cpu').textContent, /연속 1\/3회/);
});
