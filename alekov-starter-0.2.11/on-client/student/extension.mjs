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
      if (appendResourceState(sessionsSection, '세션', sessions)) {
        if (sessions.data.length === 0) {
          appendText(sessionsSection, 'p', '표시할 세션이 없습니다.');
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
    renderDecision() { return '학생 구현 대기: 서버의 판정과 이유를 연결하세요.'; },
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
