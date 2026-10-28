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
    panel: key => find(node => node.id === `pc-details-panel-${key}`),
    tab: key => find(node => node.dataset?.pcDetailsTab === key),
    advance(ms) {now += ms;},
    finish(index, cpu = 20, ok = true) {
      requests[index](ok ? {ok: true, data: {schema: 'aleph.on.pc-status.v1', source: 'local-pc', measuredAt: new Date(now).toISOString(),
        metrics: {cpu: cpu === null ? {state: 'unavailable', reason: 'timeout'} : {state: 'ok', usagePercent: cpu},
          memory: {state: 'ok', usedBytes: 50, totalBytes: 100}, disk: {state: 'ok', freeBytes: 30, totalBytes: 100}}}} : {ok: false});
    }};
}

test('refresh retains values and graph nodes, then changes the existing meter in place', async () => {
  const ui = setup(); await flush(); ui.finish(0); await flush();
  const root = ui.root, cpu = ui.card('cpu'), graph = ui.graph('cpu');
  const fill = all(cpu).find(node => node.className === 'pc-usage-fill');
  const measurements = all(ui.panel('indicators')).find(node => node.localName === 'details'); measurements.open = true;
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
  ui.tab('records').fire('click'); assert.equal(ui.panel('records').hidden, false); assert.equal(ui.panel('indicators').hidden, true);
  const retry = ui.button().fire('click'); ui.finish(2, 40); await retry;
  assert.equal(ui.panel('records').hidden, false, 'existing tab listeners still target the retained panels');
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

test('30-second refresh preserves checkbox and selected tab while values update', async () => {
  const ui = setup(); await flush(); ui.finish(0); await flush();
  const checkbox = ui.checkbox(); checkbox.checked = true; checkbox.fire('change'); ui.finish(1, 30); await flush();
  ui.tab('observations').fire('click');
  const timer = [...ui.timers].find(([, timer]) => timer.delay === 30000); ui.timers.delete(timer[0]); timer[1].fn();
  assert.equal(ui.checkbox(), checkbox); assert.equal(checkbox.checked, true); assert.match(ui.card('cpu').textContent, /사용 30.0%/);
  assert.equal(ui.panel('observations').hidden, false);
  checkbox.checked = false; checkbox.fire('change'); ui.finish(2, 35); await flush();
  assert.equal(ui.checkbox().checked, false); assert.equal([...ui.timers.values()].some(timer => timer.delay === 30000), false);
  assert.match(ui.card('cpu').textContent, /사용 35.0%/);
});
