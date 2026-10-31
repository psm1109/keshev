import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../student/extension.mjs', import.meta.url), 'utf8')
  .replace('export function createStudentView', 'function createStudentView');
function setup() {
  class Element {
    constructor(tag) {this.localName = tag; this.children = []; this.attributes = {}; this._text = '';}
    set textContent(value) {this._text = String(value); this.children = [];}
    get textContent() {return this._text + this.children.map(node => node.textContent).join('');}
    set innerHTML(value) {throw Error('HTML interpretation is forbidden in these views');}
    append(...nodes) {this.children.push(...nodes);}
    setAttribute(key, value) {this.attributes[key] = String(value);}
  }
  const context = vm.createContext({document: {createElement: tag => new Element(tag), addEventListener() {}},
    window: {addEventListener() {}}, queueMicrotask() {}});
  vm.runInContext(source, context);
  return context.createStudentView();
}
function explanationInput() {
  return {
    event: {id: 'incident-1', evidence: [{id: 'e1', text: '세션 만료 기록'}], rules: [{id: 'r1', text: '활성 세션 필요'}],
      state: {access: 'denied', session: 'expired', device: 'compliant'}, supportedActions: ['request_reauthentication']},
    explanation: {status: 'ok', data: {summary: '세션이 만료됐습니다.', evidenceIds: ['e1'],
      proposals: [{action: 'request_reauthentication', evidenceIds: ['e1'], reason: '다시 인증해야 합니다.'}],
      requiresHumanConfirmation: true, executed: false}},
  };
}

test('AI error messages suppress secret and token assignments including quoted keys', () => {
  const view = setup();
  for (const message of ['secret=hidden-value', 'token: hidden-value', 'access_token=hidden-value',
    '{"secret":"hidden-value"}', '{"token":"hidden-value"}', 'Bearer hidden-value', 'password=hidden-value']) {
    const root = view.renderExplanation({explanation: {status: 'error', error: {code: 'ON_AI_INVALID_OUTPUT', message}}});
    assert.doesNotMatch(root.textContent, /hidden-value/);
    assert.match(root.textContent, /안전하게 표시할 수 있는 오류 메시지가 없습니다/);
  }
});

test('AI success text rejects oversized or secret-bearing fields before publishing any explanation', () => {
  const view = setup();
  for (const [field, limit] of [['summary', 1500], ['evidence', 500], ['rule', 300], ['reason', 500]]) {
    for (const text of ['token=hidden-value', 'secret: hidden-value', 'x'.repeat(limit + 1), '  ', 'unsafe\u007ftext']) {
      const input = explanationInput();
      if (field === 'summary') input.explanation.data.summary = text;
      if (field === 'evidence') input.event.evidence[0].text = text;
      if (field === 'rule') input.event.rules[0].text = text;
      if (field === 'reason') input.explanation.data.proposals[0].reason = text;
      const root = view.renderExplanation(input);
      assert.equal(root.attributes['data-student-explanation-event'], undefined, field);
      assert.match(root.textContent, /AI 설명을 사용할 수 없습니다/);
      assert.doesNotMatch(root.textContent, /hidden-value|unsafe|x{100}/);
    }
  }
});

test('AI text accepts contract length boundaries and renders HTML-shaped strings as literal text', () => {
  const input = explanationInput();
  input.explanation.data.summary = 's'.repeat(1500);
  input.event.evidence[0].text = 'e'.repeat(500);
  input.event.rules[0].text = 'r'.repeat(300);
  input.explanation.data.proposals[0].reason = 'p'.repeat(500);
  assert.equal(setup().renderExplanation(input).attributes['data-student-explanation-event'], 'incident-1');
  input.explanation.data.summary = '<img src=x onerror=alert(1)>';
  const root = setup().renderExplanation(input);
  assert.ok(root.textContent.includes(input.explanation.data.summary));
  assert.equal(root.attributes['data-student-explanation-event'], 'incident-1');
});

test('unrecognized incident states become unknown instead of claiming no unknown states', () => {
  for (const key of ['access', 'session', 'device']) {
    const input = explanationInput(); input.event.state[key] = 'invented-safe-state';
    const root = setup().renderExplanation(input);
    assert.match(root.textContent, /확인 불가\(unknown\)/);
    assert.doesNotMatch(root.textContent, /invented-safe-state|확인 불가 상태없음/);
    assert.equal(input.event.state[key], 'invented-safe-state', 'input is not mutated');
  }
  const root = setup().renderExplanation(explanationInput());
  assert.match(root.textContent, /확인 불가 상태없음/);
});

function actionInput() {
  return {status: 'succeeded', event: {id: 'incident-1', evidence: [{id: 'e1'}]}, actionId: 'device:revoke',
    receipt: {eventId: 'incident-1', actionId: 'device:revoke', requestId: 'request-1', receiptId: 'receipt-1', status: 'succeeded'},
    observation: {effectApplied: true, observedAt: '2026-10-31T00:00:00Z'}};
}

test('action ID mismatches always show unknown even with a positive effect observation', () => {
  for (const key of ['eventId', 'actionId']) {
    const input = actionInput(); input.receipt[key] = 'another-id';
    const root = setup().renderAction(input);
    assert.match(root.textContent, /결과 불명\(unknown\).*일치하지 않습니다/);
    assert.doesNotMatch(root.textContent, /효과 확인\(succeeded\)/);
    assert.equal(root.attributes['data-student-action-request'], undefined);
  }
});

test('succeeded requires effect evidence, a valid observation timestamp and a bound receipt', () => {
  for (const change of [
    input => {input.observation = null;},
    input => {input.observation.effectApplied = false;},
    input => {delete input.observation.observedAt;},
    input => {input.observation.observedAt = 'invalid-time';},
    input => {delete input.receipt.eventId;},
    input => {delete input.receipt.actionId;},
    input => {delete input.receipt.requestId;},
    input => {input.receipt.status = 'prepared';},
  ]) {
    const input = actionInput(); change(input);
    const root = setup().renderAction(input);
    assert.match(root.textContent, /결과 불명\(unknown\).*관측/);
    assert.doesNotMatch(root.textContent, /효과 확인\(succeeded\)|effectApplied: true/);
  }
});

test('valid succeeded shows one success message and the observation time', () => {
  const root = setup().renderAction(actionInput());
  assert.equal((root.textContent.match(/효과 확인\(succeeded\)/g) || []).length, 1);
  assert.match(root.textContent, /관측 시각\(observedAt\): 2026-10-31T00:00:00Z.*effectApplied: true/);
});

test('pending is an acknowledgement and server messages are rendered only as text', () => {
  const input = actionInput(); input.status = 'pending';
  let root = setup().renderAction(input);
  assert.match(root.textContent, /접수·처리 중\(pending\).*ACK.*조치 효과가 아닙니다/);
  assert.doesNotMatch(root.textContent, /효과 확인\(succeeded\)/);
  input.status = 'failed'; input.message = '<img src=x onerror=alert(1)>';
  root = setup().renderAction(input); assert.ok(root.textContent.includes(input.message));
  input.message = 'token=hidden-value';
  assert.doesNotMatch(setup().renderAction(input).textContent, /hidden-value/);
  input.status = 'constructor';
  assert.match(setup().renderAction(input).textContent, /결과 불명\(unknown\)/);
});
