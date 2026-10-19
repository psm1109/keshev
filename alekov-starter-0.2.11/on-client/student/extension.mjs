// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
  return {
    renderIdentity({ me, devices, sessions }) {
      const root = document.createElement('div');

      const appendText = (parent, tag, text) => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        parent.append(node);
        return node;
      };

      const deviceStatusLabel = (status) => ({
        compliant: '보안 기준 충족',
        noncompliant: '보안 기준 미충족',
        unknown: '확인 불가',
      }[status] || '확인 불가');

      const sessionStatusLabel = (status) => ({
        active: '활성',
        expired: '만료',
        revoked: '철회됨',
        unknown: '확인 불가',
      }[status] || '확인 불가');

      const appendMode = (section, name, resource) => {
        const modeText = {
          demo: '예제 자료',
          disconnected: '연결 없음',
          unknown: '확인 불가',
        }[resource.mode];
        if (modeText) appendText(section, 'p', `${name}: ${modeText}`);
      };

      const appendResourceState = (section, name, resource) => {
        if (resource.status === 'loading') {
          appendText(section, 'p', `${name}: 불러오는 중`);
          return false;
        }
        if (resource.status === 'error') {
          const message = typeof resource.error?.message === 'string' && resource.error.message
            ? resource.error.message
            : '서버가 오류 내용을 제공하지 않았습니다.';
          const unverified = ['CONTRACT_MISMATCH', 'ENGINE_RESULT_UNVERIFIED'].includes(resource.error?.code);
          appendText(section, 'p', `${name}: ${unverified ? '확인 불가' : '연결 실패'}: ${message}`);
          return false;
        }
        if (resource.status !== 'ok') {
          appendText(section, 'p', `${name}: 확인 불가`);
          return false;
        }
        return true;
      };

      const identitySection = document.createElement('section');
      appendText(identitySection, 'h3', '로그인 사용자·현재 기기·세션');
      appendMode(identitySection, '로그인 정보', me);
      if (appendResourceState(identitySection, '로그인 정보', me)) {
        const { user, device, session } = me.data;
        const identity = document.createElement('dl');
        appendText(identity, 'dt', '사용자');
        appendText(identity, 'dd', `${user.label || user.id} · ID: ${user.id}`);
        appendText(identity, 'dt', '현재 기기');
        appendText(identity, 'dd', `${device.label || device.id} · ID: ${device.id} · ${deviceStatusLabel(device.status)} (${device.status})`);
        appendText(identity, 'dt', '현재 세션');
        appendText(identity, 'dd', `${session.id} · ${sessionStatusLabel(session.status)} (${session.status})`);
        identitySection.append(identity);
      }
      root.append(identitySection);

      const devicesSection = document.createElement('section');
      appendText(devicesSection, 'h3', '기기');
      appendMode(devicesSection, '기기', devices);
      if (appendResourceState(devicesSection, '기기', devices)) {
        if (devices.data.length === 0) {
          appendText(devicesSection, 'p', '표시할 기기가 없습니다.');
        } else {
          const list = document.createElement('ul');
          for (const device of devices.data) {
            appendText(list, 'li', `${device.label || device.id} · ID: ${device.id} · ${deviceStatusLabel(device.status)} (${device.status})`);
          }
          devicesSection.append(list);
        }
      }
      root.append(devicesSection);

      const sessionsSection = document.createElement('section');
      appendText(sessionsSection, 'h3', '세션');
      appendMode(sessionsSection, '세션', sessions);
      appendText(sessionsSection, 'p', '세션 조회는 현재 검증된 연결 한 개이며 과거 세션 목록이 아닙니다.');
      if (appendResourceState(sessionsSection, '세션', sessions)) {
        if (sessions.data.length === 0) {
          appendText(sessionsSection, 'p', '현재 연결이 없습니다.');
        } else {
          const list = document.createElement('ul');
          for (const session of sessions.data) {
            appendText(list, 'li', `${session.id} · ${sessionStatusLabel(session.status)} (${session.status})`);
          }
          sessionsSection.append(list);
        }
      }
      root.append(sessionsSection);

      return root;
    },
    renderDecision({ status, mode, data, error, appId }) {
      const root = document.createElement('section');
      const appendText = (tag, text) => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        root.append(node);
        return node;
      };
      const displayValue = (value, fallback) =>
        typeof value === 'string' && value.length > 0 ? value : fallback;

      appendText('h3', '업무 앱 접근 판정');
      const modeLabels = {
        demo: '예제 자료(demo) · 실제 연결 결과가 아닙니다.',
        disconnected: '연결 없음(disconnected)',
        unknown: '연결 상태 확인 불가(unknown)',
      };
      if (modeLabels[mode]) appendText('p', modeLabels[mode]);

      if (status === 'idle') {
        appendText('p', '업무 앱을 골라 접속을 요청하세요.');
        if (typeof appId === 'string' && appId) appendText('p', `선택한 업무 앱 ID: ${appId}`);
        return root;
      }

      if (status === 'loading') {
        appendText('p', '판정 확인 중');
        if (typeof appId === 'string' && appId) appendText('p', `요청한 업무 앱 ID: ${appId}`);
        return root;
      }

      if (status === 'error') {
        const message = displayValue(error?.message, '서버가 오류 내용을 제공하지 않았습니다.');
        appendText('p', `요청 실패: ${message}`);
        appendText('p', '이것은 접근 거부 판정이 아닙니다.');
        if (typeof appId === 'string' && appId) appendText('p', `요청한 업무 앱 ID: ${appId}`);
        return root;
      }

      if (status !== 'ok') {
        appendText('p', '판정 확인 불가(unknown). 접근 허용 판정이 아닙니다.');
        return root;
      }

      const resultAppId = displayValue(data?.appId, displayValue(appId, '확인 불가'));
      const decision = data?.decision;
      const decisionLabels = {
        allow: '접근 허용(allow)',
        deny: '접근 거부(deny)',
        challenge: '추가 인증 또는 확인 필요(challenge)',
        unknown: '판정 확인 불가(unknown)',
      };
      const label = Object.hasOwn(decisionLabels, decision) ? decisionLabels[decision] : null;
      appendText('p', `업무 앱 ID: ${resultAppId}`);

      if (label) {
        appendText('p', label);
        if (decision === 'allow') {
          appendText('p', '정책상 접근 허용 판정이며, 실제 앱 접속 성공을 보장하지 않습니다.');
        } else if (decision === 'challenge') {
          appendText('p', '추가 확인이 필요합니다. 이 앱은 추가 인증 또는 확인 절차를 대신 수행하지 않습니다.');
        } else if (decision === 'unknown') {
          appendText('p', '판정을 확인할 수 없습니다. 접근 허용 판정이 아닙니다.');
        }
      } else {
        const originalDecision = displayValue(decision, 'unknown');
        appendText('p', `판정 확인 불가(unknown) · 원래 판정 코드: ${originalDecision}`);
        appendText('p', '접근 허용 판정이 아닙니다.');
      }

      appendText('p', `판정 이유: ${displayValue(data?.reason, '확인 불가')}`);
      appendText('p', `판정 시각: ${displayValue(data?.checkedAt, '확인 불가')}`);
      return root;
    },
    renderEvents({ status, mode, data, error } = {}) {
      const root = document.createElement('section');
      const appendText = (parent, tag, text) => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        parent.append(node);
        return node;
      };
      const valueText = (value, fallback = '확인 불가') =>
        value === undefined || value === null || value === '' ? fallback : String(value);
      const modeLabels = {
        demo: '예제 자료(demo) · 실제 본인 기록이 아닙니다.',
        disconnected: '연결 없음(disconnected)',
        unknown: '연결 상태 확인 불가(unknown)',
      };

      appendText(root, 'h3', '접속 기록·XDR 경보');
      if (modeLabels[mode]) appendText(root, 'p', modeLabels[mode]);

      if (status === 'loading') {
        appendText(root, 'p', '기록을 불러오는 중');
        return root;
      }
      if (status === 'error') {
        const message = valueText(error?.message, '서버가 오류 내용을 제공하지 않았습니다.');
        if (['CONTRACT_MISMATCH', 'ENGINE_RESULT_UNVERIFIED'].includes(error?.code)) {
          appendText(root, 'p', `확인 불가: ${message}`);
        } else {
          appendText(root, 'p', `기록을 불러오지 못했습니다: ${message}`);
        }
        return root;
      }
      if (status !== 'ok') {
        appendText(root, 'p', '기록 확인 불가');
        return root;
      }
      if (!Array.isArray(data)) {
        appendText(root, 'p', '확인 불가: 기록 형식을 확인할 수 없습니다.');
        return root;
      }

      // 정렬은 복사본에만 적용해 전달받은 배열을 변경하지 않는다.
      const events = [...data].sort((left, right) => {
        const leftTime = Date.parse(left?.at);
        const rightTime = Date.parse(right?.at);
        if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) return rightTime - leftTime;
        return String(right?.at ?? '').localeCompare(String(left?.at ?? ''));
      });
      if (events.length === 0) {
        appendText(root, 'p', '표시할 기록이 없습니다');
        return root;
      }

      const filterValues = { kind: 'all', appId: 'all', access: 'all' };
      let selectedEventId = null;
      const filters = document.createElement('div');
      const list = document.createElement('ul');
      const detailHost = document.createElement('div');
      root.append(filters, list, detailHost);

      const distinctValues = (pick) => [...new Set(events
        .map(pick)
        .filter((value) => typeof value === 'string' && value.length > 0))];
      const kindLabel = (value) => ({
        access: '접속 기록 (access)',
        xdr: 'XDR 경보 (xdr)',
      }[value] || value);
      const accessLabel = (value) => ({
        allowed: '허용됨 (allowed)',
        denied: '거부됨 (denied)',
        unknown: '확인 불가 (unknown)',
      }[value] || value);
      const addFilter = (accessibleName, key, values, labelForValue = (value) => value) => {
        const label = document.createElement('label');
        appendText(label, 'span', accessibleName);
        const select = document.createElement('select');
        select.setAttribute('aria-label', accessibleName);
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = '전체';
        select.append(allOption);
        for (const value of values) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = labelForValue(value);
          select.append(option);
        }
        select.value = filterValues[key];
        select.addEventListener('change', () => {
          filterValues[key] = select.value;
          renderList();
        });
        label.append(select);
        filters.append(label);
      };

      addFilter('기록 종류', 'kind', distinctValues((event) => event.kind), kindLabel);
      addFilter('업무 앱', 'appId', distinctValues((event) => event.appId));
      addFilter('접속 상태', 'access', distinctValues((event) => event.state?.access), accessLabel);

      const translatedState = (kind, value) => {
        const raw = valueText(value, 'unknown');
        const labels = {
          access: { allowed: '허용됨', denied: '거부됨', unknown: '확인 불가' },
          session: { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' },
          device: { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' },
        };
        const label = labels[kind]?.[raw];
        return label ? `${label}(${raw})` : `확인 불가(${raw})`;
      };
      const kindText = (kind) => ({
        access: '접속 기록(access)',
        xdr: 'XDR 경보(xdr)',
      }[kind] || valueText(kind));
      const appText = (appId) => valueText(appId, '앱을 확인할 수 없습니다');

      const renderDetail = (event) => {
        detailHost.replaceChildren();
        if (!event) return;

        const detail = document.createElement('section');
        detail.setAttribute('data-student-event-detail', valueText(event.id));
        appendText(detail, 'h4', `${valueText(event.id)} 상세`);
        appendText(detail, 'p', `사건 ID: ${valueText(event.id)}`);
        appendText(detail, 'p', `업무 앱: ${appText(event.appId)}`);

        appendText(detail, 'h5', '근거 (evidence)');
        if (Array.isArray(event.evidence) && event.evidence.length > 0) {
          const evidenceList = document.createElement('ul');
          for (const evidence of event.evidence) {
            appendText(evidenceList, 'li', `${valueText(evidence?.id)}: ${valueText(evidence?.text, '')}`);
          }
          detail.append(evidenceList);
        } else {
          appendText(detail, 'p', '근거가 없습니다.');
        }

        appendText(detail, 'h5', '규칙 (rules)');
        if (Array.isArray(event.rules) && event.rules.length > 0) {
          const rulesList = document.createElement('ul');
          for (const rule of event.rules) {
            appendText(rulesList, 'li', `${valueText(rule?.id)}: ${valueText(rule?.text, '')}`);
          }
          detail.append(rulesList);
        } else {
          appendText(detail, 'p', '규칙이 없습니다.');
        }

        appendText(detail, 'h5', '상태');
        appendText(detail, 'p', `접속 상태: ${translatedState('access', event.state?.access)}`);
        appendText(detail, 'p', `세션 상태: ${translatedState('session', event.state?.session)}`);
        appendText(detail, 'p', `기기 상태: ${translatedState('device', event.state?.device)}`);

        const unsupportedActions = Array.isArray(event.supportedActions)
          ? event.supportedActions.filter((action) => typeof action === 'string' && action.length > 0)
          : [];
        if (unsupportedActions.length > 0) {
          appendText(detail, 'h5', '미지원 조치');
          appendText(detail, 'p', '조치 실행 연결은 준비 중입니다. 이 화면은 조치 요청을 보내지 않습니다.');
          const actionList = document.createElement('ul');
          for (const action of unsupportedActions) {
            const item = document.createElement('li');
            const button = document.createElement('button');
            button.type = 'button';
            button.disabled = true;
            button.textContent = `${action} 미지원`;
            item.append(button);
            actionList.append(item);
          }
          detail.append(actionList);
        }
        detailHost.append(detail);
      };

      function renderList() {
        const visible = events.filter((event) =>
          (filterValues.kind === 'all' || event.kind === filterValues.kind)
          && (filterValues.appId === 'all' || event.appId === filterValues.appId)
          && (filterValues.access === 'all' || event.state?.access === filterValues.access));
        if (selectedEventId !== null && !visible.some((event) => event.id === selectedEventId)) {
          selectedEventId = null;
        }

        list.replaceChildren();
        if (visible.length === 0) {
          appendText(list, 'li', '필터와 일치하는 기록이 없습니다.');
          renderDetail(null);
          return;
        }

        for (const event of visible) {
          const item = document.createElement('li');
          const row = document.createElement('article');
          row.setAttribute('data-student-event-id', valueText(event.id));
          appendText(row, 'p', `사건 ID: ${valueText(event.id)}`);
          appendText(row, 'p', `시각: ${valueText(event.at)}`);
          appendText(row, 'p', `종류: ${kindText(event.kind)}`);
          appendText(row, 'p', `업무 앱: ${appText(event.appId)}`);
          appendText(row, 'p', `요약: ${valueText(event.summary, '')}`);
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = `${valueText(event.id)} 상세`;
          button.setAttribute('aria-label', `${valueText(event.id)} 상세`);
          button.addEventListener('click', () => {
            selectedEventId = event.id;
            renderDetail(event);
          });
          row.append(button);
          item.append(row);
          list.append(item);
        }
        renderDetail(visible.find((event) => event.id === selectedEventId) || null);
      }

      renderList();
      return root;
    },
    renderStatus({ devices, sessions, notifications, diagnostics, mode } = {}) {
      const root = document.createElement('section');
      const appendText = (parent, tag, text) => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        parent.append(node);
        return node;
      };
      const modeLabels = {
        connected: '연결됨 (connected)',
        demo: '예제 자료 (demo)',
        disconnected: '연결 없음 (disconnected)',
        unknown: '확인 불가 (unknown)',
      };
      const secretPattern = /(?:Bearer\s+\S+|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|token|비밀번호|토큰)\s*[:=]\s*\S+)/i;
      const safeValue = (value, fallback = '확인 불가') => {
        if (typeof value !== 'string' || value.length > 500 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) || secretPattern.test(value)) return fallback;
        return value || fallback;
      };
      const resourceMode = (section, name, resource) => {
        if (resource?.mode && modeLabels[resource.mode]) {
          appendText(section, 'p', `${name} 연결 상태: ${modeLabels[resource.mode]}`);
        }
      };
      const resourceError = (section, name, resource) => {
        const code = typeof resource?.error?.code === 'string' ? resource.error.code : '';
        const message = safeValue(resource?.error?.message, '서버가 오류 내용을 제공하지 않았습니다.');
        const timeout = code === 'TIMEOUT' || /시간이 초과|시간 초과|timed out|timeout/i.test(message);
        const unverified = ['CONTRACT_MISMATCH', 'ENGINE_RESULT_UNVERIFIED'].includes(code);
        appendText(section, 'p', `${name}: ${unverified ? '확인 불가' : timeout ? '조회 시간 초과' : '불러오지 못했습니다'}: ${message}`);
        appendText(section, 'p', '다시 시도는 위쪽 「다시 불러오기」 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.');
      };

      appendText(root, 'h3', '기기·세션·알림·도움정보');
      if (modeLabels[mode]) appendText(root, 'p', `연결 상태: ${modeLabels[mode]}`);

      const devicesSection = document.createElement('section');
      appendText(devicesSection, 'h4', '기기');
      resourceMode(devicesSection, '기기', devices);
      if (devices?.status === 'loading') {
        appendText(devicesSection, 'p', '기기: 불러오는 중');
      } else if (devices?.status === 'error') {
        resourceError(devicesSection, '기기', devices);
      } else if (devices?.status === 'ok' && Array.isArray(devices.data)) {
        if (devices.data.length === 0) {
          appendText(devicesSection, 'p', '등록된 기기가 없습니다.');
        } else {
          const list = document.createElement('ul');
          const labels = { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
          for (const device of devices.data) {
            const label = safeValue(device?.label, '이름 확인 불가');
            const id = safeValue(device?.id);
            const status = safeValue(device?.status);
            appendText(list, 'li', `${label} · ID: ${id} · ${labels[status] || '확인 불가'} (${status})`);
          }
          devicesSection.append(list);
        }
      } else {
        appendText(devicesSection, 'p', '기기 상태를 확인할 수 없습니다.');
      }
      root.append(devicesSection);

      const sessionsSection = document.createElement('section');
      appendText(sessionsSection, 'h4', '세션');
      resourceMode(sessionsSection, '세션', sessions);
      appendText(sessionsSection, 'p', '세션 조회는 현재 검증된 연결 한 개이며 과거 세션 목록이 아닙니다.');
      if (sessions?.status === 'loading') {
        appendText(sessionsSection, 'p', '세션: 불러오는 중');
      } else if (sessions?.status === 'error') {
        resourceError(sessionsSection, '세션', sessions);
      } else if (sessions?.status === 'ok' && Array.isArray(sessions.data)) {
        if (sessions.data.length === 0) {
          appendText(sessionsSection, 'p', '현재 연결이 없습니다.');
        } else {
          const list = document.createElement('ul');
          const labels = { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' };
          for (const session of sessions.data) {
            const id = safeValue(session?.id);
            const status = safeValue(session?.status);
            appendText(list, 'li', `${id} · ${labels[status] || '확인 불가'} (${status})`);
          }
          sessionsSection.append(list);
        }
      } else {
        appendText(sessionsSection, 'p', '세션 상태를 확인할 수 없습니다.');
      }
      root.append(sessionsSection);

      const notificationsSection = document.createElement('section');
      appendText(notificationsSection, 'h4', '알림');
      if (Array.isArray(notifications) && notifications.length > 0) {
        const list = document.createElement('ul');
        for (const notification of notifications) {
          const item = document.createElement('li');
          appendText(item, 'p', `자료(resource): ${safeValue(notification?.resource)}`);
          appendText(item, 'p', `코드(code): ${safeValue(notification?.code)}`);
          appendText(item, 'p', `메시지(message): ${safeValue(notification?.message, '메시지 확인 불가')}`);
          list.append(item);
        }
        notificationsSection.append(list);
      } else {
        appendText(notificationsSection, 'p', '주의할 알림이 없습니다.');
      }
      root.append(notificationsSection);

      const diagnosticsSection = document.createElement('section');
      appendText(diagnosticsSection, 'h4', '도움정보');
      resourceMode(diagnosticsSection, '도움정보', diagnostics);
      let safeDiagnostics = null;
      if (diagnostics?.status === 'loading') {
        appendText(diagnosticsSection, 'p', '도움정보를 불러오는 중');
      } else if (diagnostics?.status === 'error') {
        const message = safeValue(diagnostics.error?.message, '서버가 오류 내용을 제공하지 않았습니다.');
        const timeout = diagnostics.error?.code === 'TIMEOUT' || /시간이 초과|시간 초과|timed out|timeout/i.test(message);
        appendText(diagnosticsSection, 'p', `${timeout ? '도움정보 조회 시간 초과' : '도움정보를 불러오지 못했습니다'}: ${message}`);
        appendText(diagnosticsSection, 'p', '다시 시도는 위쪽 「다시 불러오기」 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.');
      } else if (diagnostics?.status === 'ok') {
        const source = diagnostics.data && typeof diagnostics.data === 'object' ? diagnostics.data : {};
        const engine = source.engine && typeof source.engine === 'object' ? source.engine : {};
        safeDiagnostics = {
          requestId: safeValue(source.requestId),
          component: safeValue(source.component),
          version: safeValue(source.version),
          checkedAt: safeValue(source.checkedAt),
          engine: {
            mode: safeValue(engine.mode),
            code: safeValue(engine.code),
          },
        };
        appendText(diagnosticsSection, 'p', `요청 ID (requestId): ${safeDiagnostics.requestId}`);
        appendText(diagnosticsSection, 'p', `구성 요소 (component): ${safeDiagnostics.component}`);
        appendText(diagnosticsSection, 'p', `버전 (version): ${safeDiagnostics.version}`);
        appendText(diagnosticsSection, 'p', `확인 시각 (checkedAt): ${safeDiagnostics.checkedAt}`);
        appendText(diagnosticsSection, 'p', `엔진 모드 (engine.mode): ${safeDiagnostics.engine.mode}`);
        appendText(diagnosticsSection, 'p', `엔진 코드 (engine.code): ${safeDiagnostics.engine.code}`);
        appendText(diagnosticsSection, 'p', '표시·복사하는 도움정보는 위의 비밀 없는 진단 항목으로 제한됩니다.');
      } else {
        appendText(diagnosticsSection, 'p', '도움정보 확인 대기');
      }
      const copyButton = document.createElement('button');
      copyButton.type = 'button';
      copyButton.textContent = '도움정보 복사';
      copyButton.disabled = !safeDiagnostics;
      const copyStatus = appendText(diagnosticsSection, 'p', '도움 요청에 사용할 안전한 진단 항목만 복사합니다.');
      copyButton.addEventListener('click', async () => {
        if (!safeDiagnostics) return;
        try {
          await navigator.clipboard.writeText(JSON.stringify(safeDiagnostics, null, 2));
          copyStatus.textContent = '도움정보를 클립보드에 복사했습니다.';
        } catch {
          copyStatus.textContent = '클립보드 복사를 사용할 수 없습니다. 화면에 표시된 안전한 항목만 직접 복사하세요.';
        }
      });
      diagnosticsSection.append(copyButton);
      root.append(diagnosticsSection);

      return root;
    },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
