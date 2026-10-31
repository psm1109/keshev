import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../student/extension.mjs', import.meta.url), 'utf8').replace('export function createStudentView', 'function createStudentView');
const all = node => [node, ...node.children.flatMap(all)];
function setup({loadDiagnostics = () => {}, diagnosticButton, refreshButton} = {}) {
  class Element {
    constructor(name) {this.localName = name; this.children = []; this.dataset = {}; this.attributes = {}; this.events = {}; this.className = ''; this._text = '';}
    set textContent(value) {this._text = String(value); this.children = [];}
    get textContent() {return this._text + this.children.map(node => node.textContent).join('');}
    append(...nodes) {this.children.push(...nodes);}
    setAttribute(name, value) {this.attributes[name] = String(value);}
    addEventListener(name, fn) {this.events[name] = fn;}
  }
  const document = {hidden: false, createElement: name => new Element(name), createElementNS: (_, name) => new Element(name), addEventListener() {},
    getElementById: id => id === 'diag-load' ? diagnosticButton === undefined ? {disabled: false, click: loadDiagnostics} : diagnosticButton
      : id === 'refresh' ? refreshButton ?? null : null};
  let copied;
  const context = vm.createContext({document, window: {addEventListener() {}}, navigator: {clipboard: {writeText: async text => {copied = text;}}},
    queueMicrotask() {}, setTimeout() {}, clearTimeout() {}, Date, console});
  vm.runInContext(source, context);
  return {view: context.createStudentView(), copied: () => copied};
}

test('identity refresh uses the shared lookup once and blocks a second click while it is busy', () => {
  let calls = 0;
  const refreshButton = {disabled: false, click() {calls++; this.disabled = true;}};
  const {view} = setup({refreshButton});
  const resource = {status: 'error', mode: 'disconnected', error: {code: 'OFFLINE', message: '연결 없음'}};
  const root = view.renderIdentity({me: resource, devices: resource, sessions: resource});
  const button = all(root).find(node => node.localName === 'button' && node.textContent === '로그인·기기·세션 다시 조회');
  button.events.click(); button.events.click();
  assert.equal(calls, 1); assert.equal(button.disabled, true);
  const busy = view.renderIdentity({me: resource, devices: resource, sessions: resource});
  assert.match(busy.textContent, /상단 조회가 진행 중/);
});

test('only identical notification codes and messages are grouped; resources and codes remain visible in details', () => {
  const {view} = setup();
  const root = view.renderStatus({mode: 'disconnected', diagnostics: {status: 'idle'}, notifications: [
    {resource: 'me', code: 'OFFLINE', message: '연결 없음'}, {resource: 'apps', code: 'OFFLINE', message: '연결 없음'},
    {resource: 'events', code: 'OFFLINE', message: '시간 초과'}, {resource: 'devices', code: 'TIMEOUT', message: '연결 없음'},
    {resource: 'sessions', code: 'TOKEN', message: 'token: secret'},
  ]});
  const groups = all(root).filter(node => node.localName === 'details');
  assert.equal(groups.length, 4);
  assert.match(groups[0].textContent, /연결 없음 · 2개 항목/);
  assert.match(groups[0].textContent, /자료: me · 코드: OFFLINE/);
  assert.match(groups[0].textContent, /자료: apps · 코드: OFFLINE/);
  assert.match(groups[1].textContent, /시간 초과/); assert.match(groups[2].textContent, /코드: TIMEOUT/);
  assert.doesNotMatch(root.textContent, /token: secret/);
});

test('identity groups identical errors once while preserving distinct errors and example mode', () => {
  const {view} = setup();
  const disconnected = {status: 'error', mode: 'disconnected', error: {code: 'ENGINE_NOT_CONNECTED', message: '서버 연결을 확인할 수 없습니다.'}};
  const root = view.renderIdentity({me: disconnected, devices: disconnected, sessions: disconnected});
  assert.equal(root.textContent.split('서버 연결을 확인할 수 없습니다.').length - 1, 1);
  assert.match(root.textContent, /로그인 정보: 연결 없음.*기기: 연결 없음.*세션: 연결 없음/);
  const different = view.renderIdentity({me: disconnected, devices: disconnected,
    sessions: {status: 'error', mode: 'demo', error: {code: 'TIMEOUT', message: '시간 초과'}}});
  assert.equal(different.textContent.split('서버 연결을 확인할 수 없습니다.').length - 1, 1);
  assert.match(different.textContent, /세션: 예제 자료.*세션: 연결 실패: 시간 초과/);
});

test('student diagnostics load button invokes the provided shared lookup and is disabled while loading', () => {
  let calls = 0;
  const {view} = setup({loadDiagnostics: () => {calls++;}});
  const idle = view.renderStatus({notifications: [], diagnostics: {status: 'idle'}});
  const button = all(idle).find(node => node.localName === 'button' && node.textContent === '도움정보 불러오기');
  assert.equal(button.disabled, false); button.events.click(); assert.equal(calls, 1);
  const loading = view.renderStatus({notifications: [], diagnostics: {status: 'loading'}});
  const loadingButton = all(loading).find(node => node.localName === 'button' && node.textContent === '불러오는 중…');
  assert.equal(loadingButton.disabled, true);
  const copyButton = all(loading).find(node => node.localName === 'button' && node.textContent === '도움정보 복사');
  assert.equal(copyButton.disabled, true);
});

test('diagnostic copy retains its limited safe fields and identity sections preserve data', async () => {
  const {view, copied} = setup();
  const root = view.renderStatus({notifications: [], diagnostics: {status: 'ok', data: {requestId: 'r1', component: 'engine', version: '1', checkedAt: 'now', engine: {mode: 'demo', code: 'OK'}, secret: 'must-not-copy'}}});
  const button = all(root).find(node => node.localName === 'button' && node.textContent === '도움정보 복사');
  assert.equal(button.disabled, false); await button.events.click();
  const payload = JSON.parse(copied()); assert.deepEqual(Object.keys(payload), ['requestId', 'component', 'version', 'checkedAt', 'engine']);
  assert.equal(payload.secret, undefined);
  const layout = all(root).find(node => node.className === 'student-diagnostics-layout');
  assert.equal(layout.children[0].className, 'student-diagnostics-console');
  assert.equal(layout.children[0].textContent, copied());
  assert.equal(layout.children[1].className, 'student-diagnostics-info');
  assert.match(layout.children[1].textContent, /요청 ID \(requestId\): r1/);
  const identity = view.renderIdentity({me: {status: 'ok', data: {user: {id: 'user'}, device: {id: 'device', status: 'unknown'}, session: {id: 'session', status: 'active'}}},
    devices: {status: 'ok', data: [{id: 'device', status: 'unknown'}]}, sessions: {status: 'ok', data: [{id: 'session', status: 'active'}]}});
  assert.equal(all(identity).filter(node => node.className === 'student-section').length, 3);
  assert.match(identity.textContent, /user.*device.*session/);
  const sections = all(identity).filter(node => node.className === 'student-section');
  assert.match(sections[0].textContent, /로그인 사용자.*user/);
  assert.doesNotMatch(sections[0].textContent, /device|session|현재 기기|현재 세션/);
  assert.match(sections[1].textContent, /device/); assert.match(sections[2].textContent, /session/);
});

test('loaded diagnostics can be closed and reopened without another request', () => {
  let calls = 0;
  const {view} = setup({loadDiagnostics: () => {calls++;}});
  const diagnostics = {status: 'ok', data: {requestId: 'r1', component: 'engine', version: '1', checkedAt: 'now', engine: {mode: 'demo', code: 'OK'}}};
  const root = view.renderStatus({notifications: [], diagnostics});
  const details = all(root).find(node => node.id === 'student-diagnostics-details');
  const toggle = all(root).find(node => node.localName === 'button' && node.attributes['aria-label'] === '도움정보 접기');
  assert.equal(toggle.disabled, false);
  assert.equal(all(details).some(node => node.localName === 'button' && /불러오기|복사/.test(node.textContent)), false);
  assert.equal(details.hidden, false); toggle.events.click();
  assert.equal(details.hidden, true); assert.equal(toggle.textContent, '도움정보▾'); assert.equal(toggle.attributes['aria-expanded'], 'false');
  const rerender = view.renderStatus({notifications: [], diagnostics});
  const retainedDetails = all(rerender).find(node => node.id === 'student-diagnostics-details');
  const retainedToggle = all(rerender).find(node => node.localName === 'button' && node.attributes['aria-label'] === '도움정보 펼치기');
  assert.equal(retainedDetails.hidden, true);
  retainedToggle.events.click(); assert.equal(retainedDetails.hidden, false); assert.equal(retainedToggle.textContent, '도움정보▴'); assert.equal(calls, 0);
  const idle = view.renderStatus({notifications: [], diagnostics: {status: 'idle'}});
  const idleToggle = all(idle).find(node => node.attributes['aria-controls'] === 'student-diagnostics-details');
  assert.equal(idleToggle.disabled, true); assert.equal(idleToggle.children[0].textContent, '도움정보'); assert.equal(idleToggle.children[1].hidden, true);
});

test('malformed nested diagnostics cannot be copied and never crash the view', async () => {
  const valid = {requestId: 'r1', component: 'engine', version: '1', checkedAt: 'now', engine: {mode: 'demo', code: 'OK'}};
  for (const data of [null, [], {}, {...valid, engine: null}, {...valid, engine: []}, {...valid, engine: {mode: 'demo'}}, {...valid, engine: {mode: {}, code: 'OK'}}, {...valid, requestId: 42}]) {
    const {view, copied} = setup();
    const root = view.renderStatus({notifications: [], diagnostics: {status: 'ok', data}});
    assert.match(root.textContent, /응답 구조가 올바르지 않아 복사할 수 없습니다/);
    const copy = all(root).find(node => node.localName === 'button' && node.textContent === '도움정보 복사');
    assert.equal(copy.disabled, true); await copy.events.click(); assert.equal(copied(), undefined);
  }
});

test('diagnostics explains missing or disabled provided lookup even when details were collapsed', () => {
  for (const diagnosticButton of [null, {disabled: true}]) {
    const {view} = setup({diagnosticButton});
    const root = view.renderStatus({diagnostics: {status: 'ok', data: {requestId: 'r1', component: 'engine', version: '1', checkedAt: 'now', engine: {mode: 'demo', code: 'OK'}}}});
    const details = all(root).find(node => node.id === 'student-diagnostics-details');
    const toggle = all(root).find(node => node.attributes['aria-label'] === '도움정보 접기');
    toggle.events.click(); assert.equal(details.hidden, true);
    all(root).find(node => node.localName === 'button' && node.textContent === '도움정보 불러오기').events.click();
    assert.equal(details.hidden, false);
    assert.match(details.textContent, diagnosticButton ? /현재 도움정보 조회 버튼을 사용할 수 없습니다.*다시 시도/ : /조회 버튼을 찾을 수 없습니다.*새로고침/);
  }
});

test('records identify connected and demo data and retry using the real shared refresh button', () => {
  let calls = 0;
  const {view} = setup({refreshButton: {disabled: false, click() {calls++;}}});
  const root = view.renderEvents({status: 'error', mode: 'connected', error: {message: '연결 확인 실패'}});
  assert.match(root.textContent, /기록 자료 연결됨.*실제 업무 앱 접속 성공을 뜻하지 않습니다/);
  const retry = all(root).find(node => node.localName === 'button' && node.textContent === '기록 다시 불러오기');
  retry.events.click(); assert.equal(calls, 1); assert.equal(retry.disabled, true);
  assert.match(view.renderEvents({status: 'ok', mode: 'demo', data: []}).textContent, /예제 자료.*실제 본인 기록이 아닙니다/);
  for (const refreshButton of [null, {disabled: true}]) {
    const blocked = setup({refreshButton}).view.renderEvents({status: 'error'});
    all(blocked).find(node => node.localName === 'button' && node.textContent === '기록 다시 불러오기').events.click();
    assert.match(blocked.textContent, refreshButton ? /전체 조회가 진행 중.*완료된 뒤/ : /버튼을 찾을 수 없습니다.*새로고침/);
  }
});

test('vulnerability mode distinguishes example data from engine connection and OSV query scope', () => {
  const {view} = setup();
  const data = {status: 'complete', checkedAt: '2026-10-31T00:00:00Z', packages: []};
  const demo = view.renderVulnerabilities({status: 'ok', mode: 'demo', data});
  assert.match(demo.textContent, /예제 자료.*실제 설치 패키지.*자료 구분: 예제 응답/);
  const disconnected = view.renderVulnerabilities({status: 'ok', mode: 'disconnected', data});
  assert.match(disconnected.textContent, /엔진 연결 없음.*자료 구분: 조회 응답.*패키지별 출처와 확인 시각/);
  assert.match(view.renderVulnerabilities({status: 'idle', mode: 'unknown'}).textContent, /실행 상태: 확인 불가.*조회 전/);
});
