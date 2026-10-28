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
    renderMode: mode => render(mode),
    finish(index, cpu = 20, ok = true, memory = 50, traffic = {state: 'ok', source: 'adapter-counters', uploadMbps: 1, downloadMbps: 10, sampleMs: 1000}, extra = {}) {
      requests[index](ok ? {ok: true, data: {schema: 'aleph.on.pc-status.v1', source: 'local-pc', measuredAt: new Date(now).toISOString(),
        metrics: {cpu: cpu === null ? {state: 'unavailable', reason: 'timeout'} : {state: 'ok', usagePercent: cpu},
          memory: memory === null ? {state: 'unavailable', reason: 'timeout'} : {state: 'ok', usedBytes: memory, totalBytes: 100},
          disk: {state: 'ok', freeBytes: 30, totalBytes: 100}, network: {state: 'ok', interfaceCount: 1, ipv4Count: 1, traffic}, ...extra}}} : {ok: false});
    }};
}

test('refresh retains values and graph nodes, then changes the existing meter in place', async () => {
  const ui = setup(); await flush(); ui.finish(0); await flush();
  const root = ui.root, cpu = ui.card('cpu'), graph = ui.graph('cpu');
  const fill = all(cpu).find(node => node.className === 'pc-usage-fill');
  const beforeStatus = ui.status().textContent;
  const pending = ui.button().fire('click');
  assert.equal(ui.root, root); assert.equal(ui.card('cpu'), cpu); assert.equal(ui.graph('cpu'), graph);
  assert.match(cpu.textContent, /사용 20.0%/); assert.doesNotMatch(cpu.textContent, /조회 중/);
  assert.equal(ui.status().textContent, beforeStatus); assert.equal(ui.button().disabled, true);
  ui.button().fire('click'); assert.equal(ui.requests.length, 2, 'in-flight reads are not duplicated');
  ui.advance(1000); ui.finish(1, 60); await pending;
  assert.equal(ui.card('cpu'), cpu); assert.equal(ui.graph('cpu'), graph);
  assert.equal(all(cpu).find(node => node.className === 'pc-usage-fill'), fill);
  assert.equal(Number(fill.getAttribute('width')), 192); assert.match(cpu.textContent, /사용 60.0%/);
  assert.equal(all(graph).filter(node => node.localName === 'circle').length, 2);
  const retry = ui.button().fire('click'); ui.finish(2, 40); await retry;
  assert.equal(ui.indicators().hidden, false);
});

test('PC configuration, firewall and Windows counts distinguish partial and unavailable results', async () => {
  const ui = setup(); await flush();
  const firewall = {state: 'ok', profiles: [{name: 'Public', enabled: true}, {name: 'Domain', enabled: true}, {name: 'Private', enabled: false}]};
  ui.finish(0, 20, true, 50, undefined, {firewall, events: {state: 'ok', warningCount: 30, errorCount: 10, sampleLimit: 5000, truncated: true}}); await flush();
  assert.equal(ui.card('configuration'), undefined);
  assert.match(ui.card('network').textContent, /업로드.*다운로드.*인터페이스 1개.*IPv4 구성 1개/);
  assert.match(ui.card('firewall').textContent, /Domain 켜짐.*Private 꺼짐.*Public 켜짐/);
  const firewallValues = all(ui.card('firewall')).find(node => node.className === 'pc-extra-value pc-firewall-values');
  assert.deepEqual(firewallValues.childNodes.map(node => node.textContent), ['Domain 켜짐', 'Private 꺼짐', 'Public 켜짐']);
  assert.match(ui.card('events').textContent, /경고 30건.*오류 10건.*일부 집계/);
  assert.match(ui.card('events').textContent, /침해나 공격 탐지 결과가 아닙니다/);
  assert.match(ui.status().textContent, /PC 실측/);
  const pending = ui.button().fire('click'); ui.advance(1000);
  ui.finish(1, 20, true, 50, undefined, {firewall: {state: 'unavailable', reason: 'permission_denied'}, events: {state: 'unavailable', reason: 'permission_denied'}}); await pending;
  for (const key of ['firewall', 'events']) assert.match(ui.card(key).textContent, /확인 불가.*읽기 권한 부족/);
  const partial = ui.button().fire('click'); ui.advance(1000);
  ui.finish(2, 20, true, 50, undefined, {network: {state: 'unavailable', reason: 'permission_denied', traffic: {state: 'ok', source: 'adapter-counters', uploadMbps: 1, downloadMbps: 2, sampleMs: 1000}}}); await partial;
  assert.match(ui.card('network').textContent, /업로드1.00 Mbps.*다운로드2.00 Mbps.*구성 확인 불가 · 읽기 권한 부족/);
  assert.match(ui.root.textContent, /내 PC 상태 대시보드/);
  assert.doesNotMatch(ui.root.textContent, /SDP 미연결|SDP 예시 모드|SDP 연결 확인 필요/);
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

test('automatic refresh uses start-to-start intervals and skips missed intervals without overlap', async () => {
  const ui = setup(); await flush(); ui.finish(0); await flush();
  const checkbox = ui.checkbox(); checkbox.checked = true; checkbox.fire('change');
  ui.advance(2500); ui.finish(1, 30); await flush();
  let timer = [...ui.timers].find(([, value]) => value.delay === 7500);
  assert.ok(timer, 'remaining interval excludes request duration');
  ui.timers.delete(timer[0]); ui.advance(7500); timer[1].fn();
  assert.equal(ui.requests.length, 3);
  ui.advance(25000); assert.equal(ui.requests.length, 3, 'slow request does not overlap');
  ui.finish(2, 35); await flush();
  timer = [...ui.timers].find(([, value]) => value.delay === 5000);
  assert.ok(timer, 'missed intervals are skipped until the next scheduled start');
  checkbox.checked = false; checkbox.fire('change');
  assert.equal([...ui.timers.values()].some(value => value.delay === 5000), false);
});

test('indicator tab retains twelve measurements', async () => {
  const ui = setup(); await flush(); ui.finish(0); await flush();
  for (let index = 1; index < 20; index++) {
    const pending = ui.button().fire('click'); ui.advance(1000); ui.finish(index); await pending;
  }
  const section = ui.indicators();
  assert.equal(section.hidden, false);
  assert.equal(section.childNodes[0].textContent, '상세보기');
  assert.equal(section.getAttribute('aria-label'), 'PC 상세보기');
  assert.equal(all(section).filter(node => node.getAttribute?.('role') === 'tab').length, 2);
  assert.equal(all(section).filter(node => node.dataset?.indicator !== undefined).length, 3);
  assert.doesNotMatch(section.textContent, /마지막 기록:/);
  assert.equal(all(section).some(node => node.localName === 'strong'), false, 'current upload/download readings remain in the top cards only');
  assert.equal(all(ui.graph('cpu')).filter(node => node.localName === 'circle').length, 12);
});

test('records retain fifty snapshots, paginate five at a time and preserve failures and earlier values', async () => {
  const ui = setup(); await flush(); ui.finish(0, 10); await flush();
  for (let i = 1; i < 55; i++) {const pending = ui.button().fire('click'); ui.advance(1000); ui.finish(i, i, i !== 53); await pending;}
  const find = id => all(ui.indicators()).find(node => node.id === id);
  find('pc-tab-records').fire('click');
  assert.equal(find('pc-panel-records').hidden, false); assert.equal(find('pc-panel-indicators').hidden, true);
  const rows = () => all(find('pc-panel-records')).filter(node => node.dataset?.recordId !== undefined);
  assert.equal(rows().length, 5); assert.equal(rows()[0].dataset.recordId, '55');
  assert.match(find('pc-history-page').textContent, /총 50개 · 1\/10페이지/);
  assert.match(rows()[0].textContent, /CPU: 54.0%/);
  assert.match(rows()[0].textContent, /메모리:.*디스크 사용:.*네트워크:/);
  assert.doesNotMatch(rows()[0].textContent, /네트워크 구성:|방화벽:|Windows 기록:/);
  assert.match(rows()[1].textContent, /조회 실패/); assert.doesNotMatch(rows()[1].textContent, /CPU:/);
  for (let page = 2; page <= 10; page++) find('pc-history-next').fire('click');
  assert.match(find('pc-history-page').textContent, /10\/10페이지/);
  assert.equal(rows().at(-1).dataset.recordId, '6'); assert.match(rows().at(-1).textContent, /CPU: 5.0%/);
  assert.equal(find('pc-history-next').disabled, true); assert.equal(ui.requests.length, 55);
  find('pc-tab-indicators').fire('click'); assert.equal(find('pc-panel-indicators').hidden, false);
});

test('CPU and memory distinguish initial spikes from three consecutive high readings and recover independently', async () => {
  const ui = setup(); await flush(); ui.finish(0, 85, true, 84.9); await flush();
  const cpuCard = ui.card('cpu');
  const notice = key => all(ui.card(key)).find(node => node.className === 'pc-overload-notice');
  assert.equal(cpuCard.dataset.overload, 'elevated'); assert.match(notice('cpu').textContent, /높은 사용량 감지/);
  assert.equal(ui.card('memory').dataset.overload, 'normal'); assert.equal(notice('memory').hidden, true);
  let pending = ui.button().fire('click'); ui.advance(1000); ui.finish(1, 90, true, 85); await pending;
  assert.equal(ui.card('cpu').dataset.overload, 'elevated'); assert.match(notice('cpu').textContent, /높은 사용량 감지/);
  pending = ui.button().fire('click'); ui.advance(1000); ui.finish(2, 95, true, 90); await pending;
  assert.equal(ui.card('cpu'), cpuCard); assert.equal(cpuCard.dataset.overload, 'sustained');
  assert.match(notice('cpu').textContent, /CPU 사용량이 계속 높습니다\.$/);
  assert.doesNotMatch(notice('cpu').textContent, /연속|\\d+회/);
  assert.equal(notice('cpu').getAttribute('aria-live'), 'polite');
  assert.equal(ui.card('memory').dataset.overload, 'elevated');
  pending = ui.button().fire('click');
  assert.equal(cpuCard.dataset.overload, 'sustained', 'pending refresh preserves the last alert without counting another reading');
  ui.advance(1000); ui.finish(3, 84.9, true, 90); await pending;
  assert.equal(cpuCard.dataset.overload, 'normal'); assert.equal(notice('cpu').hidden, true);
  assert.equal(ui.card('memory').dataset.overload, 'sustained'); assert.match(notice('memory').textContent, /메모리 사용량이 계속 높습니다/);
  pending = ui.button().fire('click'); ui.advance(1000); ui.finish(4, 85, true, 50); await pending;
  assert.equal(cpuCard.dataset.overload, 'elevated'); assert.match(notice('cpu').textContent, /높은 사용량 감지/);
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
  assert.equal(ui.card('cpu').dataset.overload, 'elevated'); assert.match(ui.card('cpu').textContent, /높은 사용량 감지/);
  assert.equal(ui.card('memory').dataset.overload, 'unavailable');
  await refresh(90);
  await refresh(90, 90, false);
  for (const key of ['cpu', 'memory']) {
    assert.equal(ui.card(key).dataset.overload, 'unavailable');
    assert.equal(all(ui.card(key)).find(node => node.className === 'pc-overload-notice').hidden, true);
  }
  assert.match(ui.status().textContent, /갱신 실패/);
  assert.doesNotMatch(ui.root.textContent, /과거 측정|그래프는 과거 기록/);
  await refresh(90);
  for (const key of ['cpu', 'memory']) assert.match(ui.card(key).textContent, /높은 사용량 감지/);
  await refresh(90);
  for (const key of ['cpu', 'memory']) assert.equal(ui.card(key).dataset.overload, 'elevated');
  await refresh(90);
  for (const key of ['cpu', 'memory']) assert.equal(ui.card(key).dataset.overload, 'sustained');
});

test('duplicate timestamps and gaps longer than sixty seconds do not establish sustained overload', async () => {
  const ui = setup(); await flush(); ui.finish(0, 90); await flush();
  let pending = ui.button().fire('click'); ui.finish(1, 90); await pending;
  assert.match(ui.card('cpu').textContent, /높은 사용량 감지/);
  for (let index = 2; index <= 3; index++) {
    pending = ui.button().fire('click'); ui.advance(1000); ui.finish(index, 90); await pending;
  }
  assert.equal(ui.card('cpu').dataset.overload, 'sustained');
  ui.advance(61000); [...ui.timers.values()].find(timer => timer.delay > 60000).fn();
  assert.equal(ui.card('cpu').dataset.overload, 'unavailable');
  assert.equal(all(ui.card('cpu')).find(node => node.className === 'pc-overload-notice').hidden, true);
  assert.match(ui.status().textContent, /오래된 기록/);
  assert.doesNotMatch(ui.root.textContent, /과거 측정|그래프는 과거 기록/);
  pending = ui.button().fire('click'); ui.finish(4, 90); await pending;
  assert.equal(ui.card('cpu').dataset.overload, 'elevated'); assert.match(ui.card('cpu').textContent, /높은 사용량 감지/);
});

test('network card and chart distinguish upload and download, preserve zero and break unavailable series', async () => {
  const ui = setup(); await flush(); ui.finish(0); await flush();
  const direction = key => all(ui.card('network')).find(node => node.dataset?.trafficDirection === key);
  assert.match(direction('upload').textContent, /↑ 업로드1.00 Mbps/);
  assert.match(direction('download').textContent, /↓ 다운로드10.00 Mbps/);
  assert.equal(direction('upload').className, 'pc-network-upload');
  assert.equal(direction('download').className, 'pc-network-download');
  let pending = ui.button().fire('click'); ui.advance(1000);
  ui.finish(1, 20, true, 50, {state: 'ok', source: 'adapter-counters', uploadMbps: 2, downloadMbps: 0, sampleMs: 1000}); await pending;
  assert.match(direction('download').textContent, /0.00 Mbps/);
  assert.match(ui.indicators().textContent, /직전 대비 \+1.00 Mbps/);
  assert.match(ui.indicators().textContent, /직전 대비 -10.00 Mbps/);
  const lines = all(ui.graph('network')).filter(node => node.localName === 'polyline');
  assert.deepEqual(lines.map(node => node.getAttribute('stroke')), ['var(--allow)', 'var(--network-download)']);
  pending = ui.button().fire('click'); ui.advance(1000);
  ui.finish(2, 20, true, 50, {state: 'unavailable', reason: 'timeout'}); await pending;
  assert.match(direction('upload').textContent, /확인 불가/); assert.match(direction('download').textContent, /확인 불가/);
  assert.doesNotMatch(ui.card('network').textContent, /10.00 Mbps|다운로드 추정/);
  pending = ui.button().fire('click'); ui.advance(1000); ui.finish(3); await pending;
  assert.equal(all(ui.graph('network')).filter(node => node.localName === 'polyline').length, 2, 'neither direction joins over missing samples');
});

test('loading, success, overload, missing data and failures retain the same card slots and graph frames', async () => {
  const ui = setup(); await flush();
  const metrics = ['cpu', 'memory', 'disk', 'network'].map(key => ({key, card: ui.card(key), slots: [...ui.card(key).childNodes]}));
  const indicators = ['cpu', 'memory', 'network'].map(key => {
    const card = all(ui.indicators()).find(node => node.dataset?.indicator === key);
    return {key, card, slots: [...card.childNodes], graph: ui.graph(key)};
  });
  assert.match(ui.card('cpu').textContent, /조회 중/);
  assert.equal(all(ui.card('cpu')).some(node => node.getAttribute?.('role') === 'meter'), false);
  for (const {graph} of indicators) {
    assert.equal(graph.getAttribute('height'), '190');
    assert.equal(all(graph).filter(node => node.localName === 'circle').length, 0, 'the initial chart contains no invented readings');
  }
  const checkFrames = () => {
    for (const {key, card, slots} of metrics) {
      assert.equal(ui.card(key), card); assert.equal(card.childNodes.length, slots.length);
      slots.forEach((slot, index) => assert.equal(card.childNodes[index], slot));
    }
    for (const {key, card, slots, graph} of indicators) {
      assert.equal(ui.graph(key), graph); assert.equal(card.childNodes.length, slots.length);
      slots.forEach((slot, index) => assert.equal(card.childNodes[index], slot));
    }
  };
  ui.finish(0, 90, true, 90); await flush(); checkFrames();
  for (let index = 1; index <= 2; index++) {
    const pending = ui.button().fire('click'); checkFrames(); ui.advance(1000); ui.finish(index, 90, true, 90); await pending; checkFrames();
  }
  assert.equal(ui.card('memory').dataset.overload, 'sustained');
  let pending = ui.button().fire('click'); ui.advance(1000); ui.finish(3, null, true, null, {state: 'unavailable', reason: 'timeout'}); await pending; checkFrames();
  assert.equal(all(ui.card('cpu')).some(node => node.getAttribute?.('role') === 'meter'), false);
  pending = ui.button().fire('click'); ui.finish(4, 0, false); await pending; checkFrames();
});

test('service placeholders and PC evidence distinguish actual, stale, failed and unavailable observations', async () => {
  const ui = setup(); await flush();
  const find = id => all(ui.root).find(node => node.id === id);
  assert.equal(all(find('pc-service-section')).filter(node => node.localName === 'article').length, 4);
  assert.match(find('pc-service-section').textContent, /GitHub · 연결 전 · 확인 불가/);
  assert.doesNotMatch(find('pc-service-section').textContent, /0원|안전|연결됨/);
  assert.match(find('pc-evidence-section').textContent, /조회 전 · 확인 불가/);
  const firewall = {state: 'ok', profiles: [{name: 'Domain', enabled: true}, {name: 'Private', enabled: false}, {name: 'Public', enabled: true}]};
  ui.finish(0, 90, true, 88, undefined, {disk: {state: 'ok', freeBytes: 5, totalBytes: 100}, firewall}); await flush();
  const evidence = find('pc-evidence-section');
  assert.match(evidence.textContent, /PC 실측.*CPU 사용률 90.0%.*메모리 사용률 88.0%.*디스크 여유 5.0%.*Private 꺼짐/);
  assert.match(evidence.textContent, /출처: PC 실측/); assert.match(evidence.textContent, /원인은 확인하지 않았습니다/);
  assert.doesNotMatch(evidence.textContent, /공격 감지|침해 확정|안전합니다/);
  ui.advance(61000); [...ui.timers.values()].find(timer => timer.delay > 60000).fn();
  assert.match(evidence.textContent, /오래된 조회/);
  let pending = ui.button().fire('click'); ui.finish(1, 0, false); await pending;
  assert.match(evidence.textContent, /갱신 실패 · 이전 조회/); assert.match(evidence.textContent, /CPU 사용률 90.0%/);
  pending = ui.button().fire('click'); ui.advance(1000);
  ui.finish(2, null, true, 50, undefined, {firewall: {state: 'unavailable', reason: 'permission_denied'}}); await pending;
  assert.match(evidence.textContent, /확인 불가 · CPU: 조회 시간 초과.*방화벽: 읽기 권한 부족/);
  assert.doesNotMatch(evidence.textContent, /CPU 사용률 90.0%/);
});
