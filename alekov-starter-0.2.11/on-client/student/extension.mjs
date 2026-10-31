// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
// 학생 개선: 제공 PC 조회 API를 요약·시각화한다. 최근 측정값은 이 화면의 메모리에만 둔다.
function createPcDashboard(api, onChange) {
  let dashboardStyleApplied = false;
  function applyDashboardStyle() {
    if (dashboardStyleApplied) return;
    const sheet = [...(document.styleSheets || [])].find(item => item.href?.endsWith('/student/appearance.css'));
    if (!sheet) return;
    const rules = [
      '[data-student-dashboard] .pc-metrics-grid { display: flex; flex-wrap: nowrap; gap: 10px; overflow-x: auto; padding-bottom: 8px; margin: 10px 0 14px; scroll-snap-type: x proximity; scrollbar-width: thin; }',
      '[data-student-dashboard] .pc-metrics-grid > .pc-metric-card { flex: 0 0 calc((100% - 50px) / 6); min-width: 180px; min-height: 0; padding: 12px 14px; margin: 0; scroll-snap-align: start; }',
      '[data-student-dashboard] .pc-metric-card { word-break: keep-all; overflow-wrap: break-word; }',
      '[data-student-dashboard] .pc-metric-card .pc-metric-value { white-space: nowrap; font-size: 12px; }',
      '[data-student-dashboard] .pc-metric-card .pc-metric-detail, [data-student-dashboard] .pc-metric-card .pc-extra-detail { line-height: 1.55; }',
      '[data-student-dashboard] .pc-metric-card .pc-metric-detail p { word-break: keep-all; }',
      '[data-student-dashboard] .pc-metric-card .pc-capacity-part, [data-student-dashboard] .pc-network-status { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }',
      '[data-student-dashboard] .pc-metric-card .pc-capacity-part > strong, [data-student-dashboard] .pc-network-status > strong { white-space: nowrap; color: var(--text); }',
      '[data-student-dashboard] .pc-network-reason { font-size: 12px; line-height: 1.5; }',
      '[data-student-dashboard] .pc-text-line { display: block; white-space: nowrap; }',
      '[data-student-dashboard] .pc-overload-notice:not([hidden]) { display: grid; grid-template-columns: 16px minmax(0, 1fr); align-items: start; gap: 0 4px; font-size: 12px; line-height: 1.6; }',
      '[data-student-dashboard] .pc-overload-copy { display: flex; flex-wrap: wrap; gap: 0 8px; }',
      '[data-student-dashboard] .pc-overload-copy > span { white-space: nowrap; }',
      '[data-student-dashboard] .pc-metric-card .pc-network-counts, [data-student-dashboard] .pc-metric-card .pc-event-counts { display: flex; flex-wrap: wrap; gap: 2px 8px; }',
      '[data-student-dashboard] .pc-metric-card .pc-network-counts > span, [data-student-dashboard] .pc-metric-card .pc-event-counts > span { white-space: nowrap; }',
      '[data-student-dashboard] .pc-metric-card > h4 { margin: 0 0 6px; }',
      '[data-student-dashboard] .pc-metric-card > p { margin: 6px 0; }',
      '[data-student-dashboard] .pc-metric-card .pc-metric-detail p { margin: 4px 0; }',
      '[data-student-dashboard] .pc-metric-card > :last-child { margin-bottom: 0; }',
      '[data-student-dashboard] .pc-firewall-values { display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px; }',
      '[data-student-dashboard] .pc-firewall-row { display: flex; justify-content: space-between; gap: 8px; min-width: 0; }',
      '[data-student-dashboard] .pc-firewall-row > span, [data-student-dashboard] .pc-firewall-row > strong { white-space: nowrap; }',
      '@media (max-width: 600px) { [data-student-dashboard] .pc-firewall-values { grid-template-columns: minmax(0, 1fr); } [data-student-dashboard] .pc-firewall-row { flex-direction: row; justify-content: space-between; gap: 12px; } }',
      '[data-student-dashboard] .pc-extra-value { margin: 4px 0; }',
      '[data-student-dashboard] .pc-indicators-grid { display: block; margin-bottom: 0; }',
      '[data-student-dashboard] .pc-indicators-grid > .card { padding: 10px 12px; }',
      '[data-student-dashboard] .pc-detail-split { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 10px; align-items: stretch; }',
      '[data-student-dashboard] .pc-detail-split > .pc-detail-panel { min-width: 0; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius); overflow-wrap: anywhere; }',
      '[data-student-dashboard] .pc-detail-split > .pc-detail-panel > h4 { margin: 0 0 10px; }',
      '[data-student-dashboard] .pc-records-panel { display: flex; flex-direction: column; min-height: 0; contain: size; }',
      '[data-student-dashboard] .pc-records-panel .pc-history-list { flex: 1 1 auto; min-height: 0; overflow-y: auto; scrollbar-width: thin; }',
      '[data-student-dashboard] .pc-history-list { list-style: none; margin: 0; padding: 0 4px 0 0; }',
      '[data-student-dashboard] .pc-history-list > li { border-bottom: 1px solid var(--border); padding: 3px 0; }',
      '[data-student-dashboard] .pc-history-list summary { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 10px; padding: 7px 4px; cursor: pointer; list-style: none; }',
      '[data-student-dashboard] .pc-history-list summary::-webkit-details-marker { display: none; }',
      '[data-student-dashboard] .pc-history-list summary::before { content: "▸"; color: var(--accent); }',
      '[data-student-dashboard] .pc-history-list details[open] summary::before { content: "▾"; }',
      '[data-student-dashboard] .pc-history-date { color: var(--muted); font-size: 12px; }',
      '[data-student-dashboard] .pc-history-time { font-variant-numeric: tabular-nums; font-weight: 600; }',
      '[data-student-dashboard] .pc-history-kind { margin-left: auto; color: var(--muted); font-size: 12px; }',
      '[data-student-dashboard] .pc-history-values { list-style: none; margin: 0 0 8px 22px; padding: 0; }',
      '[data-student-dashboard] .pc-history-values > li { display: grid; grid-template-columns: 88px minmax(0, 1fr); gap: 8px; padding: 3px 0; }',
      '[data-student-dashboard] .pc-history-values > li + li { border-top: 1px solid var(--border); }',
      '[data-student-dashboard] .pc-history-values span { min-width: 0; overflow-wrap: break-word; }',
      '[data-student-dashboard] .pc-history-pager { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 8px; width: 100%; margin-top: auto; padding-top: 12px; }',
      '[data-student-dashboard] .pc-history-pager > .muted { min-width: 0; text-align: center; }',
      '@media (max-width: 900px) { [data-student-dashboard] .pc-detail-split { grid-template-columns: minmax(0, 1fr); } [data-student-dashboard] .pc-records-panel { height: 335px; } }',
      '[data-student-dashboard] .pc-indicator-heading { align-items: center; justify-content: space-between; }',
      '[data-student-dashboard] .pc-chart-legend { display: flex; flex-wrap: wrap; gap: 4px 14px; }',
      '[data-student-dashboard] .pc-chart-cpu { color: var(--accent); }',
      '[data-student-dashboard] .pc-chart-memory { color: var(--student); }',
      '[data-student-dashboard] .pc-combined-plot { display: flex; gap: 8px; align-items: stretch; }',
      '[data-student-dashboard] .pc-combined-axis { display: flex; flex: 0 0 34px; flex-direction: column; justify-content: space-between; font-size: 11px; color: var(--muted); }',
      '[data-student-dashboard] .pc-combined-plot svg { display: block; flex: 1; min-width: 0; }',
      '[data-student-dashboard] .pc-combined-times { display: flex; justify-content: space-between; margin-left: 42px; font-size: 11px; color: var(--muted); }',
      '[data-student-dashboard] .pc-combined-times > :only-child { margin: auto; }',
      '[data-student-dashboard] .pc-dashboard-heading { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px 16px; }',
      '[data-student-dashboard] .pc-dashboard-heading h3, [data-student-dashboard] .pc-dashboard-heading .pc-sdp-status { margin: 0; }',
      '@media (max-width: 600px) { [data-student-dashboard] .pc-metrics-grid > .pc-metric-card { flex-basis: 85%; min-width: 0; } }'
    ];
    try {
      for (const rule of rules) sheet.insertRule(rule, sheet.cssRules.length);
      dashboardStyleApplied = true;
    } catch {
      // 제공 CSS를 수정할 수 없는 환경에서는 기존 카드 배치를 유지한다.
    }
  }
  const historyLimit = 12;
  const history = [];
  const records = [];
  let recordId = 0, recordPage = 0;
  const overloadThreshold = 85, overloadReadings = 3, overloadMaxGap = 60000;
  const overloadCounts = {cpu: 0, memory: 0};
  let overloadMeasuredAt = null;
  let phase = 'idle', current = null, expiryTimer, mountedRoot, renderView;
  let sdpSnapshot = null;
  let lastError = '';
  let autoRefresh = false, autoTimer = null, pageHidden = false;
  let lastReadStartedAt = null;
  function stopAutoRefresh() {
    clearTimeout(autoTimer); autoTimer = null;
  }
  function scheduleAutoRefresh() {
    stopAutoRefresh();
    if (!autoRefresh || pageHidden || document.hidden || phase === 'loading') return;
    const elapsed = lastReadStartedAt === null ? 0 : Math.max(0, Date.now() - lastReadStartedAt);
    const delay = Math.max(1, Math.ceil(elapsed / 10000)) * 10000 - elapsed;
    autoTimer = setTimeout(() => {
      autoTimer = null;
      if (autoRefresh && !pageHidden && !document.hidden) void read();
    }, delay);
  }
  // 기존 노드를 유지하고 값·속성만 갱신해 카드와 그래프가 재조회 중 사라지지 않게 한다.
  function updateElement(target, source) {
    if (target.nodeType === 3) {
      if (target.nodeValue !== source.nodeValue) target.nodeValue = source.nodeValue;
      return;
    }
    for (const name of target.getAttributeNames()) {
      if (target.localName === 'details' && name === 'open') continue;
      if (!source.hasAttribute(name)) target.removeAttribute(name);
    }
    for (const name of source.getAttributeNames()) {
      if (target.getAttribute(name) !== source.getAttribute(name)) target.setAttribute(name, source.getAttribute(name));
    }
    if (target.localName === 'input') target.checked = source.checked;
    const children = [...source.childNodes];
    const key = node => node.nodeType === 1 ? node.id || node.getAttribute('data-metric') || node.getAttribute('data-indicator') || node.getAttribute('data-record-id') : null;
    children.forEach((child, index) => {
      let existing = target.childNodes[index];
      const childKey = key(child);
      if (childKey && existing && key(existing) !== childKey) {
        const retained = [...target.childNodes].slice(index + 1).find(node => node.nodeName === child.nodeName && key(node) === childKey);
        target.insertBefore(retained || child, existing);
        existing = target.childNodes[index];
      }
      if (existing === child) return;
      if (!existing) target.append(child);
      else if (existing.nodeType !== child.nodeType || existing.nodeName !== child.nodeName || key(existing) !== key(child)) existing.replaceWith(child);
      else updateElement(existing, child);
    });
    while (target.childNodes.length > children.length) target.lastChild.remove();
  }
  // 내 조회로 다른 학생 영역의 필터·선택을 다시 만들지 않는다.
  function notify() {
    const previous = mountedRoot;
    if (!previous?.isConnected) {onChange(); return;}
    const next = renderView();
    updateElement(previous, next);
    mountedRoot = previous;
  }
  const titles = {cpu: 'CPU', memory: '메모리', disk: '디스크 여유'};
  const finite = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  const percent = n => finite(n) && n <= 100;
  const time = value => new Date(value).toLocaleString('ko-KR', {timeZone: 'Asia/Seoul', hour12: false});
  const gb = value => `${(value / 1024 ** 3).toFixed(1)} GiB`;
  const reasons = {unsupported: '운영체제 미지원', permission_denied: '읽기 권한 부족', timeout: '조회 시간 초과', cancelled: '조회 취소', query_failed: '조회 실패', invalid_response: '응답 값 확인 불가', invalid_sample: '측정 구간 확인 불가', no_active_interface: '활성 네트워크 어댑터 없음'};
  const nextAction = reason => reason === reasons.permission_denied ? '권한을 바꾸지 말고 담당자에게 확인하세요.'
    : reason === reasons.unsupported ? '지원되는 Windows PC에서 확인하세요.'
      : '다시 조회하고 계속되면 앱 서버 상태를 확인하세요.';
  const pcFailureText = code => {
    const known = {
      TIMEOUT: ['조회 시간 초과', '앱 서버 상태를 확인하고 다시 조회하세요.'],
      REQUEST_TIMEOUT: ['조회 시간 초과', '앱 서버 상태를 확인하고 다시 조회하세요.'],
      NETWORK_ERROR: ['앱 서버 연결 실패', '앱 서버를 실행한 뒤 다시 조회하세요.'],
      INVALID_RESPONSE: ['응답 형식 또는 측정 시각 확인 불가', '앱 서버 상태를 확인하고 다시 조회하세요.'],
      ORIGIN_REJECTED: ['조회 주소 확인 불가', '앱의 로컬 주소로 다시 접속하세요.'],
      HOST_REJECTED: ['조회 주소 확인 불가', '앱의 로컬 주소로 다시 접속하세요.'],
      CANCELLED: ['조회 취소', '다시 조회하세요.'],
      REQUEST_CANCELLED: ['조회 취소', '다시 조회하세요.']
    };
    const [reason, action] = Object.hasOwn(known, code) ? known[code]
      : ['서버 응답 또는 연결 확인 불가', '앱 서버 상태를 확인하고 다시 조회하세요.'];
    return `원인: ${reason} · 다음 행동: ${action}`;
  };
  const make = (tag, text, cls) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  };
  function normalize(data) {
    const measured = Date.parse(data?.measuredAt);
    if (data?.schema !== 'aleph.on.pc-status.v1' || data.source !== 'local-pc'
      || !/(?:Z|[+-]\d{2}:\d{2})$/.test(data.measuredAt) || !Number.isFinite(measured)
      || Date.now() - measured > 60000 || measured - Date.now() > 5000) throw Error('INVALID_RESPONSE');
    const metrics = {};
    for (const key of Object.keys(titles)) {
      const m = data.metrics?.[key];
      let value = null, text = '확인 불가', detail = null;
      if (m?.state === 'ok') {
        if (key === 'cpu' && percent(m.usagePercent)) {value = m.usagePercent; text = `${value.toFixed(1)}% 사용`;}
        if (key === 'memory' && finite(m.usedBytes) && finite(m.totalBytes) && m.totalBytes > 0 && m.usedBytes <= m.totalBytes) {
          value = m.usedBytes / m.totalBytes * 100; text = `${value.toFixed(1)}% 사용`;
          detail = `${gb(m.usedBytes)} 사용 / 전체 ${gb(m.totalBytes)}`;
        }
        if (key === 'disk' && finite(m.freeBytes) && finite(m.totalBytes) && m.totalBytes > 0 && m.freeBytes <= m.totalBytes) {
          value = m.freeBytes / m.totalBytes * 100; text = `${gb(m.freeBytes)} · ${value.toFixed(1)}% 여유`;
          detail = `${gb(m.totalBytes - m.freeBytes)} 사용 / 전체 ${gb(m.totalBytes)}\n${gb(m.freeBytes)} 여유`;
        }
      }
      let reason = reasons[m?.reason] || '응답 값 확인 불가';
      metrics[key] = {value, text, detail, reason};
    }
    const validCount = n => Number.isSafeInteger(n) && n >= 0;
    const n = data.metrics?.network, f = data.metrics?.firewall, e = data.metrics?.events;
    const unavailable = m => ({text: '확인 불가', detail: reasons[m?.reason] || '응답 값 확인 불가'});
    metrics.configuration = n?.state === 'ok' && validCount(n.interfaceCount) && validCount(n.ipv4Count)
      ? {text: `인터페이스 ${n.interfaceCount}개`, detail: `IPv4 구성 ${n.ipv4Count}개`} : unavailable(n);
    metrics.firewall = f?.state === 'ok' && Array.isArray(f.profiles) && f.profiles.length === 3 && ['Domain', 'Private', 'Public'].every(name => f.profiles.filter(p => p.name === name && typeof p.enabled === 'boolean').length === 1)
      ? {profiles: ['Domain', 'Private', 'Public'].map(name => `${name} ${f.profiles.find(p => p.name === name).enabled ? '켜짐' : '꺼짐'}`), detail: ''} : unavailable(f);
    metrics.events = e?.state === 'ok' && validCount(e.warningCount) && validCount(e.errorCount) && e.warningCount + e.errorCount <= 5000 && e.sampleLimit === 5000 && typeof e.truncated === 'boolean'
      ? {text: `경고 ${e.warningCount}건 · 오류 ${e.errorCount}건`, detail: `System·Application 합계 · 최근 24시간${e.truncated ? ' · 최근 5,000건 일부 집계' : ''}`}
      : unavailable(e);
    return {measuredAt: data.measuredAt, metrics};
  }
  // 서로 다른 실측 시각의 인접한 조회만 센다. 실패·누락·긴 공백은 연속으로 보지 않는다.
  function trackOverload(sample) {
    const measuredAt = Date.parse(sample.measuredAt);
    const consecutive = overloadMeasuredAt !== null && measuredAt > overloadMeasuredAt
      && measuredAt - overloadMeasuredAt <= overloadMaxGap;
    for (const key of Object.keys(overloadCounts)) {
      const value = sample.metrics[key].value;
      const count = finite(value) && value >= overloadThreshold ? (consecutive ? overloadCounts[key] : 0) + 1 : 0;
      overloadCounts[key] = count;
    }
    overloadMeasuredAt = measuredAt;
  }
  async function read() {
    if (pageHidden || phase === 'loading') return;
    stopAutoRefresh();
    lastReadStartedAt = Date.now();
    phase = 'loading'; notify();
    try {
      const result = await api?.get('/api/pc/status');
      if (result?.ok !== true) throw Error(typeof result?.error?.code === 'string' ? result.error.code : 'REQUEST_FAILED');
      current = normalize(result.data);
      trackOverload(current);
      phase = 'ok';
      lastError = '';
      history.push({at: current.measuredAt, cpu: current.metrics.cpu.value, memory: current.metrics.memory.value});
      const {cpu: recordCpu, memory: recordMemory, disk: recordDisk} = current.metrics;
      records.unshift({id: ++recordId, at: current.measuredAt, metrics: {cpu: recordCpu, memory: recordMemory, disk: recordDisk}});
      clearTimeout(expiryTimer);
      expiryTimer = setTimeout(notify, Math.max(1, 60001 - (Date.now() - Date.parse(current.measuredAt))));
    } catch (error) {
      phase = 'error';
      for (const key of Object.keys(overloadCounts)) overloadCounts[key] = 0;
      overloadMeasuredAt = null;
      const at = new Date().toISOString();
      history.push({at, cpu: null, memory: null});
      lastError = pcFailureText(error?.message);
      records.unshift({id: ++recordId, at, error: lastError});
    }
    if (records.length > 50) records.pop();
    if (history.length > historyLimit) history.shift();
    notify();
    scheduleAutoRefresh();
  }
  function chart() {
    const ns = 'http://www.w3.org/2000/svg';
    const frame = make('div', undefined, 'pc-combined-chart');
    const plot = make('div', undefined, 'pc-combined-plot');
    const axis = make('div', undefined, 'pc-combined-axis');
    for (const value of [100, 50, 0]) axis.append(make('span', `${value}%`));
    const svg = document.createElementNS(ns, 'svg');
    const add = (tag, attrs, text) => {
      const node = document.createElementNS(ns, tag);
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
      if (text) node.textContent = text;
      svg.append(node); return node;
    };
    const rows = history.slice(-12);
    const series = [{key: 'cpu', label: 'CPU', color: 'var(--accent)'},
      {key: 'memory', label: '메모리', color: 'var(--student)'}];
    const valueLabel = value => `${value.toFixed(1)}%`;
    svg.setAttribute('viewBox', '0 0 1000 180'); svg.setAttribute('width', '100%'); svg.setAttribute('height', '180');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'CPU와 메모리 사용률 변화. 각 점은 조회 시각과 측정값을 나타냅니다.');
    add('title', {}, 'CPU·메모리 사용률 변화');
    add('desc', {}, '세로축 0~100%, 가로축 실제 조회 시각. 확인하지 못한 구간은 선을 잇지 않습니다.');
    for (const y of [8, 90, 172]) add('line', {x1: 0, y1: y, x2: 1000, y2: y, stroke: 'var(--border)'});
    const start = rows.length ? Date.parse(rows[0].at) : 0;
    const duration = rows.length ? Date.parse(rows.at(-1).at) - start : 0;
    for (const item of series) {
      let points = [];
      const flush = () => {if (points.length > 1) add('polyline', {points: points.join(' '), fill: 'none', stroke: item.color, 'stroke-width': 2.5}); points = [];};
      for (const row of rows) {
        if (!finite(row[item.key])) {flush(); continue;}
        const x = duration > 0 ? 4 + (Date.parse(row.at) - start) / duration * 992 : 500;
        const y = 172 - row[item.key] / 100 * 164;
        points.push(`${x},${y}`);
        const point = add('circle', {cx: x, cy: y, r: 3, fill: item.color});
        const title = document.createElementNS(ns, 'title'); title.textContent = `${time(row.at)} · ${item.label} ${valueLabel(row[item.key])}`; point.append(title);
      }
      flush();
    }
    plot.append(axis, svg); frame.append(plot);
    const shortTime = at => new Date(at).toLocaleTimeString('ko-KR', {timeZone: 'Asia/Seoul', hour12: false});
    const times = make('div', undefined, 'pc-combined-times');
    if (rows.length) times.append(make('span', shortTime(rows[0].at)));
    if (rows.length > 1) times.append(make('span', shortTime(rows.at(-1).at)));
    frame.append(times);
    return frame;
  }
  function indicatorCards() {
    const cards = make('div', undefined, 'grid-2 pc-indicators-grid');
    const card = make('article', undefined, 'card'); card.dataset.indicator = 'cpu-memory';
    const heading = make('div', undefined, 'row pc-indicator-heading');
    heading.append(make('h4', 'CPU·메모리 변화'));
    const legend = make('div', undefined, 'pc-chart-legend');
    for (const key of ['cpu', 'memory']) {
      const latest = history.at(-1)?.[key], previous = history.at(-2)?.[key];
      const label = make('span', undefined, 'muted');
      label.append(make('span', '● ', `pc-chart-${key}`), make('span', titles[key]));
      if (finite(latest) && finite(previous)) {
        const change = latest - previous;
        label.append(make('span', ` ${change > 0 ? '+' : ''}${change.toFixed(1)}%p`));
      }
      legend.append(label);
    }
    heading.append(legend);
    card.append(heading, chart()); cards.append(card);
    return cards;
  }
  function indicatorsSection() {
    const indicators = make('div');
    indicators.id = 'pc-indicators';
    const split = make('div', undefined, 'pc-detail-split');
    const graphPanel = make('section', undefined, 'pc-detail-panel'); graphPanel.id = 'pc-panel-indicators';
    graphPanel.setAttribute('role', 'region'); graphPanel.setAttribute('aria-labelledby', 'pc-indicators-heading'); graphPanel.tabIndex = 0;
    const graphHeading = make('h4', '상태 지표'); graphHeading.id = 'pc-indicators-heading'; graphPanel.append(graphHeading);
    graphPanel.append(make('p', '최근 12회 변화 · 조회 실패 구간은 연결하지 않음 · 새로고침하면 초기화', 'muted'));
    graphPanel.append(indicatorCards()); split.append(graphPanel);
    const log = make('section', undefined, 'pc-detail-panel pc-records-panel'); log.id = 'pc-panel-records';
    log.setAttribute('role', 'region'); log.setAttribute('aria-labelledby', 'pc-records-heading'); log.tabIndex = 0;
    const logHeading = make('h4', '기록'); logHeading.id = 'pc-records-heading'; log.append(logHeading);
    const pages = Math.max(1, Math.ceil(records.length / 5)); recordPage = Math.min(recordPage, pages - 1);
    const list = make('ol', undefined, 'pc-history-list'); list.setAttribute('start', String(recordPage * 5 + 1));
    for (const row of records.slice(recordPage * 5, recordPage * 5 + 5)) {
      const item = make('li'); item.dataset.recordId = String(row.id);
      const detail = make('details'), summary = make('summary');
      const at = new Date(row.at);
      summary.append(make('span', at.toLocaleDateString('ko-KR', {timeZone: 'Asia/Seoul'}), 'pc-history-date'),
        make('span', at.toLocaleTimeString('ko-KR', {timeZone: 'Asia/Seoul', hour12: false}), 'pc-history-time'),
        make('span', row.error ? '조회 실패' : 'PC 상태', 'pc-history-kind'));
      detail.append(summary);
      if (row.error) detail.append(make('p', row.error, 'muted'));
      else {
        const m = row.metrics, value = metric => metric.value === null ? `확인 불가 · ${metric.reason}` : `${metric.value.toFixed(1)}%`;
        const rows = [
          `CPU: ${value(m.cpu)}`, `메모리: ${value(m.memory)}${m.memory.detail ? ` · ${m.memory.detail}` : ''}`,
          `디스크 사용: ${m.disk.value === null ? `확인 불가 · ${m.disk.reason}` : `${(100 - m.disk.value).toFixed(1)}% · ${m.disk.detail.replace('\n', ' · ')}`}`,
        ];
        const values = make('ul', undefined, 'pc-history-values');
        for (const line of rows) {
          const separator = line.indexOf(': '), item = make('li');
          item.append(make('strong', line.slice(0, separator + 1)), make('span', line.slice(separator + 2)));
          values.append(item);
        }
        detail.append(values);
      }
      item.append(detail); list.append(item);
    }
    log.append(list);
    if (!records.length) log.append(make('p', '아직 기록이 없습니다.', 'muted'));
    const pager = make('div', undefined, 'row pc-history-pager'); pager.setAttribute('role', 'group'); pager.setAttribute('aria-label', '기록 페이지');
    const previous = make('button', '이전', 'btn'); previous.type = 'button'; previous.id = 'pc-history-previous'; previous.disabled = recordPage === 0;
    previous.addEventListener('click', () => {recordPage = Math.max(0, recordPage - 1); notify(); const list = mountedRoot?.querySelector?.('.pc-history-list'); if (list) list.scrollTop = 0;});
    const next = make('button', '다음', 'btn'); next.type = 'button'; next.id = 'pc-history-next'; next.disabled = recordPage >= pages - 1;
    next.addEventListener('click', () => {recordPage = Math.min(Math.max(0, Math.ceil(records.length / 5) - 1), recordPage + 1); notify(); const list = mountedRoot?.querySelector?.('.pc-history-list'); if (list) list.scrollTop = 0;});
    const page = make('span', `총 ${records.length}개 · ${recordPage + 1}/${pages}페이지`, 'muted'); page.id = 'pc-history-page';
    pager.append(previous, page, next); log.append(pager); split.append(log); indicators.append(split);
    return indicators;
  }
  // SVG 표시 속성을 써서 제공 화면의 CSP와 색 테마를 그대로 따른다.
  function bar(label, value) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    const available = finite(value);
    for (const [key, attr] of Object.entries({viewBox: '0 0 320 12', width: '100%', height: 12,
      preserveAspectRatio: 'none', role: available ? 'meter' : 'img', 'aria-label': available ? label : `${label} · 측정값 없음`,
      ...(available ? {'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': value, 'aria-valuetext': `${value.toFixed(1)}% 사용`} : {})})) {
      svg.setAttribute(key, String(attr));
    }
    for (const [width, fill] of [[320, 'var(--accent-soft)'], [available ? 3.2 * value : 0, 'var(--accent)']]) {
      const rect = document.createElementNS(ns, 'rect');
      for (const [key, attr] of Object.entries({width, height: 12, rx: 6, fill})) rect.setAttribute(key, String(attr));
      if (fill === 'var(--accent)') rect.setAttribute('class', 'pc-usage-fill');
      svg.append(rect);
    }
    return svg;
  }
  // 화면 초기화 후 최초 한 번 조회하며, 이후 반복은 체크박스로 켰을 때만 한다.
  queueMicrotask(() => { if (phase === 'idle') void read(); });
  document.addEventListener('visibilitychange', () => {
    stopAutoRefresh();
    if (!document.hidden && !pageHidden && (autoRefresh || phase === 'idle')) void read();
    else notify();
  });
  window.addEventListener('pagehide', () => {
    pageHidden = true; stopAutoRefresh(); clearTimeout(expiryTimer);
  });
  window.addEventListener('pageshow', () => {
    pageHidden = false;
    if (autoRefresh && !document.hidden) void read();
    else notify();
  });
  function evidenceSection(stale) {
    const section = make('section', undefined, 'card pc-evidence-section'); section.id = 'pc-evidence-section';
    section.tabIndex = -1;
    const evidenceHeading = make('h3', '이상 징후 근거 ');
    evidenceHeading.append(make('span', '학생 구현', 'tag tag-student')); section.append(evidenceHeading);
    const status = make('p', !current ? phase === 'error' ? '조회 실패 · 확인 불가' : '조회 전 · 확인 불가'
      : `${phase === 'error' ? '갱신 실패 · 이전 조회' : stale ? '오래된 조회' : 'PC 실측'} · ${time(current.measuredAt)} (한국 시간)`, 'muted');
    status.textContent += ' · 침해 판정 아님';
    section.append(status);
    if (!current) return section;
    const m = current.metrics, rows = [];
    for (const key of ['cpu', 'memory']) {
      if (finite(m[key].value) && m[key].value >= 85) rows.push({text: `${titles[key]} 사용률 ${m[key].value.toFixed(1)}%`, limit: key === 'cpu' ? '짧은 구간의 사용률이며 원인은 확인하지 않았습니다.' : '전체 용량 대비 사용률이며 원인은 확인하지 않았습니다.'});
    }
    if (finite(m.disk.value) && m.disk.value < 10) rows.push({text: `디스크 여유 ${m.disk.value.toFixed(1)}%`, limit: '앱이 있는 디스크만 확인했습니다.'});
    const disabled = m.firewall.profiles?.filter(value => value.endsWith('꺼짐')) || [];
    if (disabled.length) rows.push({text: `방화벽: ${disabled.join(' · ')}`, limit: 'Windows 방화벽 프로필 설정만 확인했습니다.'});
    const missing = ['cpu', 'memory', 'disk'].filter(key => m[key].value === null).map(key => `${titles[key]}: ${m[key].reason}`);
    if (!m.firewall.profiles) missing.push(`방화벽: ${m.firewall.detail}`);
    if (missing.length) rows.push({text: `확인 불가 · ${missing.join(' · ')}`, limit: '조회하지 못한 항목은 판단할 수 없습니다.'});
    if (!rows.length) section.append(make('p', '표시할 관찰이 없습니다.', 'muted'));
    else {
      const list = make('ul', undefined, 'pc-evidence-list');
      for (const row of rows) {
        const item = make('li'); item.append(make('strong', row.text), make('span', `출처: PC 실측 · ${time(current.measuredAt)} · ${row.limit}`, 'muted'));
        list.append(item);
      }
      section.append(list);
    }
    return section;
  }
  function sdpStatus() {
    const sessions = sdpSnapshot?.sessions;
    if (sdpSnapshot?.mode === 'connected' && sessions?.status === 'ok' && sessions.mode === 'connected'
      && Array.isArray(sessions.data) && sessions.data.some(session => session?.status === 'active')) return 'SDP 연결됨';
    if (sdpSnapshot?.mode === 'disconnected' && sessions?.status === 'error' && sessions.mode === 'disconnected'
      && sessions.error?.code === 'ENGINE_NOT_CONNECTED') return 'SDP 미연결';
    if (sessions?.mode === 'demo' || sdpSnapshot?.mode === 'demo') return 'SDP 연결 상태 확인 불가 · 예시 자료';
    if (sessions?.status === 'loading' || sessions?.status === 'idle') return 'SDP 연결 상태 확인 불가 · 세션 조회 중';
    if (sessions?.status === 'error') {
      const code = sessions.error?.code;
      const reason = code === 'TIMEOUT' || code === 'REQUEST_TIMEOUT' ? '세션 조회 시간 초과'
        : code === 'PERMISSION_DENIED' || code === 'ACCESS_DENIED' || code === 'AUTHORIZATION_REQUIRED' ? '세션 읽기 권한 부족'
          : code === 'ENGINE_RESULT_UNVERIFIED' || code === 'CONTRACT_MISMATCH' ? '세션 응답 검증 실패'
            : code === 'ENGINE_NOT_CONNECTED' ? '연결 여부를 확인하지 못함' : '세션 조회 실패';
      return `SDP 연결 상태 확인 불가 · ${reason}`;
    }
    return 'SDP 연결 상태 확인 불가 · 검증된 세션 응답 없음';
  }
  return renderView = function render(sdp) {
    if (sdp !== undefined) sdpSnapshot = sdp;
    applyDashboardStyle();
    const root = make('div'); root.dataset.studentDashboard = '';
    root.setAttribute('aria-label', '내 PC 상태 대시보드 · 학생 개선');
    mountedRoot = root;
    const dashboard = make('section', undefined, 'card'); dashboard.id = 'pc-main-dashboard'; root.append(dashboard);
    dashboard.tabIndex = -1;
    const heading = make('div', undefined, 'pc-dashboard-heading');
    const sdpText = sdpStatus();
    const sdpBadge = make('span', sdpText, 'mode-badge pc-sdp-status');
    sdpBadge.dataset.mode = sdpText === 'SDP 연결됨' ? 'connected' : sdpText === 'SDP 미연결' ? 'disconnected' : 'unknown';
    sdpBadge.setAttribute('role', 'status');
    const dashboardHeading = make('h3', '내 PC 상태 대시보드 ');
    dashboardHeading.append(make('span', '학생 구현', 'tag tag-student'));
    heading.append(dashboardHeading, sdpBadge);
    dashboard.append(heading);
    dashboard.append(make('p', '이 값은 앱 서버를 실행한 PC에서 측정합니다. 네트워크·방화벽·Windows 기록은 조회만 하며 설정을 변경하지 않습니다.', 'muted'));
    dashboard.append(make('p', current ? '자료 구분: PC 실측 · 예시 값이 아닙니다.' : '자료 구분: PC 실측 조회 대기 · 예시 수치로 대신 표시하지 않습니다.', 'muted'));
    const loading = phase === 'idle' || phase === 'loading';
    const controls = make('div', undefined, 'row');
    const refresh = make('button', loading ? current ? '다시 조회 중…' : '첫 조회 중…' : '다시 조회', 'btn pc-refresh'); refresh.type = 'button';
    refresh.disabled = loading;
    refresh.setAttribute('aria-disabled', String(loading));
    refresh.setAttribute('aria-busy', String(loading));
    refresh.addEventListener('click', read); controls.append(refresh);
    const autoLabel = make('label', undefined, 'btn');
    autoLabel.title = '화면이 보이는 동안 조회 시작을 기준으로 10초마다 다시 측정합니다.';
    const auto = make('input'); auto.type = 'checkbox'; auto.checked = autoRefresh;
    auto.dataset.pcAutoRefresh = '';
    auto.addEventListener('change', () => {
      autoRefresh = auto.checked; stopAutoRefresh();
      if (autoRefresh && !document.hidden && !pageHidden && phase !== 'loading') void read();
      else {notify(); scheduleAutoRefresh();}
    });
    autoLabel.append(auto, make('span', ' 10초마다 자동 조회')); controls.append(autoLabel); dashboard.append(controls);
    const stale = current && Date.now() - Date.parse(current.measuredAt) > 60000;
    const autoStatus = autoRefresh ? document.hidden || pageHidden ? '화면 숨김 · 자동 조회 일시 중지' : '10초마다 자동 조회 중'
      : '마지막 조회 결과이며 실시간 감시는 아닙니다.';
    const status = make('p', current
      ? `${phase === 'loading' ? '내 PC 상태 다시 조회 중 · 이전 측정값 표시 · ' : phase === 'error' ? `내 PC 상태 다시 조회 실패 · 이전 측정값 표시. ${lastError} · ` : ''}PC 실측 · 마지막 측정 종료 시각: ${time(current.measuredAt)} (한국 시간) · ${stale ? '오래된 기록 · ' : ''}${autoStatus}`
      : phase === 'error' ? `PC 상태 조회 실패 · 조회하지 못한 항목: CPU·메모리·디스크·네트워크 구성·Windows 방화벽·Windows 기록 · ${lastError}${autoRefresh ? ` · ${autoStatus}` : ''}`
      : '내 PC 상태 첫 조회 중…', 'pc-measurement-status');
    status.title = status.textContent;
    status.id = 'pc-measurement-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite'); status.setAttribute('aria-atomic', 'true');
    refresh.setAttribute('aria-describedby', status.id);
    dashboard.append(status);
    const cards = make('div', undefined, 'grid-2 pc-metrics-grid');
    cards.tabIndex = 0; cards.setAttribute('role', 'region'); cards.setAttribute('aria-label', 'PC 상태 카드 · 가로 스크롤');
    cards.title = '좌우로 스크롤하거나, 이 영역에 초점을 두고 좌우 방향키로 이동하세요.';
    cards.addEventListener('keydown', event => {
      if (event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const region = event.currentTarget;
      const step = (region.querySelector('.pc-metric-card')?.getBoundingClientRect().width || region.clientWidth) + 10;
      const left = event.key === 'Home' ? 0 : event.key === 'End' ? region.scrollWidth
        : region.scrollLeft + (event.key === 'ArrowRight' ? step : -step);
      region.scrollTo({left, behavior: 'auto'});
    });
    for (const key of ['cpu', 'memory', 'disk']) {
        const card = make('article', undefined, 'card pc-metric-card'); card.dataset.metric = key;
        const metric = current?.metrics[key], usable = Boolean(current);
        card.append(make('h4', titles[key]));
        const used = usable && metric.value !== null ? key === 'disk' ? 100 - metric.value : metric.value : null;
        const readout = make('p', finite(used) ? `사용 ${used.toFixed(1)}% / 전체 100%` : usable ? metric.text : loading ? '조회 중' : '확인 불가', 'muted pc-metric-value');
        const detailText = usable ? metric.value === null ? `${metric.reason} · ${nextAction(metric.reason)}` : metric.detail || '' : '';
        const detail = make(key === 'disk' || key === 'memory' ? 'div' : 'p', key === 'cpu' ? detailText : undefined, 'muted pc-metric-detail');
        if (key === 'disk' || key === 'memory') for (const line of detailText.split('\n')) {
          const row = make('p');
          const parts = line.split(' / ');
          if (parts.every(part => /^(?:전체 )?.+ (?:사용|여유)$|^전체 .+$/.test(part))) {
            for (const part of parts) {
              const match = part.match(/^(.+) (사용|여유)$/);
              const label = part.startsWith('전체 ') ? '전체' : match?.[2];
              const amount = part.startsWith('전체 ') ? part.slice(3) : match?.[1];
              const item = make('span', undefined, 'pc-capacity-part');
              item.append(make('span', label), make('strong', amount)); row.append(item);
            }
          } else row.textContent = line;
          detail.append(row);
        }
        detail.title = detail.textContent;
        card.append(readout, bar(`${key === 'disk' ? '디스크' : titles[key]} 사용률`, used), detail);
        if (key === 'disk') {
          const warning = make('p', '디스크 여유 10% 미만: 파일을 확인하고 백업하세요.', 'muted pc-metric-notice');
          warning.hidden = !usable || metric.value === null || metric.value >= 10 || stale || phase === 'error';
          card.append(warning);
        }
        if (Object.hasOwn(overloadCounts, key)) {
          const count = overloadCounts[key];
          const outdated = stale || phase === 'error';
          const state = outdated || !usable || metric.value === null ? 'unavailable'
            : count >= overloadReadings ? 'sustained' : count ? 'elevated' : 'normal';
          card.dataset.overload = state;
          const notice = make('p', undefined, 'pc-overload-notice');
          notice.setAttribute('aria-live', 'polite'); notice.setAttribute('aria-atomic', 'true');
          const showNotice = !outdated && usable && finite(metric.value) && metric.value >= overloadThreshold && count > 0;
          notice.hidden = !showNotice;
          const icon = make('span', '⚠'); icon.setAttribute('aria-hidden', 'true');
          const copy = make('span', undefined, 'pc-overload-copy');
          if (showNotice) {
            copy.append(make('span', count >= overloadReadings ? '높은 사용량 지속' : '높은 사용량 감지'),
              make('span', count >= overloadReadings ? `${overloadThreshold}% 이상 · 연속 ${count}회` : `기준: ${overloadThreshold}% 이상`));
          }
          notice.append(icon, copy); card.append(notice);
        }
        cards.append(card);
    }
    const network = make('article', undefined, 'card pc-metric-card'); network.dataset.metric = 'network';
    const config = current?.metrics.configuration;
    const configDetail = typeof config?.detail === 'string' && config.detail.trim() ? config.detail : '네트워크 구성 상세 정보를 제공하지 않았습니다.';
    network.append(make('h4', '네트워크 구성'));
    if (config && config.text !== '확인 불가') {
      const counts = make('p', undefined, 'muted pc-network-counts');
      for (const part of config.text.split(' · ')) counts.append(make('span', part));
      network.append(counts);
      network.append(make('p', configDetail, 'muted'));
    } else network.append(make('p', config ? `확인 불가 · ${configDetail} · ${nextAction(configDetail)}` : loading ? '조회 중' : '확인 불가', 'muted'));
    cards.append(network);
    for (const [key, title] of [['firewall', 'Windows 방화벽'], ['events', 'Windows 기록']]) {
      const card = make('article', undefined, 'card pc-metric-card pc-extra-card'); card.dataset.metric = key;
      const metric = current?.metrics[key];
      card.append(make('h4', title));
      const value = make('div', undefined, key === 'firewall' ? 'pc-extra-value pc-firewall-values' : 'pc-extra-value');
      if (key === 'firewall' && metric?.profiles) {
        for (const profile of metric.profiles) {
          const row = make('div', undefined, 'pc-firewall-row');
          const separator = profile.lastIndexOf(' ');
          row.append(make('span', `${profile.slice(0, separator)} `), make('strong', profile.slice(separator + 1)));
          value.append(row);
        }
      } else if (key === 'events' && metric?.text && metric.text !== '확인 불가') {
        value.classList.add('pc-event-counts');
        for (const part of metric.text.split(' · ')) value.append(make('span', part));
      } else value.textContent = metric ? metric.text : loading ? '조회 중' : '확인 불가';
      const detail = make('p', metric?.text === '확인 불가' ? `${metric.detail} · ${nextAction(metric.detail)}` : metric?.detail || '', 'muted pc-extra-detail');
      if (key === 'events' && metric?.text !== '확인 불가' && metric?.detail) {
        detail.textContent = '';
        for (const part of metric.detail.split(' · ')) detail.append(make('span', part, 'pc-text-line'));
      }
      card.append(value, detail);
      if (key === 'events') {
        const disclaimer = make('p', undefined, 'muted pc-extra-disclaimer');
        disclaimer.append(make('span', '이 건수는 침해나 공격 탐지', 'pc-text-line'), make('span', '결과가 아닙니다.', 'pc-text-line'));
        card.append(disclaimer);
      }
      cards.append(card);
    }
    dashboard.append(cards);
    dashboard.append(indicatorsSection());
    root.append(evidenceSection(stale));
    return root;
  };
}

export function createStudentView({ api, onChange = () => {} } = {}) {
  const validTimestamp = value => {
    if (typeof value !== 'string') return false;
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/);
    if (!m) return false;
    const [, year, month, day, hour, minute, second, zone] = m;
    const leap = +year % 4 === 0 && (+year % 100 !== 0 || +year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return +month >= 1 && +month <= 12 && +day >= 1 && +day <= days[+month - 1]
      && +hour < 24 && +minute < 60 && +second < 60
      && (zone === 'Z' || +zone.slice(1, 3) < 24 && +zone.slice(4) < 60) && Number.isFinite(Date.parse(value));
  };
  const aiErrorText = code => ({
    WB_CLCO_AUTH_REQUIRED: 'AI 이용에 필요한 인증을 확인할 수 없습니다.',
    WB_CLCO_ACCESS_BLOCKED: 'AI 앱 접근 권한을 확인할 수 없습니다.',
    ON_AI_PROVISIONING_PENDING: 'AI 계정 또는 앱 권한 준비가 완료되지 않았습니다.',
    WB_CLCO_RATE_LIMITED: 'AI 요청 한도에 도달했습니다. 잠시 후 다시 시도하세요.',
    WB_CLCO_TIMEOUT: 'AI 응답 대기 시간이 초과되었습니다.',
    TIMEOUT: 'AI 응답 대기 시간이 초과되었습니다.',
    ON_AI_INVALID_OUTPUT: 'AI 응답이 표시 조건을 충족하지 않습니다.',
  }[code] || 'AI 요청을 완료하지 못했습니다. 오류 코드와 연결·권한 상태를 확인하세요.');
  const renderPcDashboard = createPcDashboard(api, onChange);
  // 학생 정보 영역에만 적용한다. PC 대시보드와 제공 공통 화면은 대상에서 제외한다.
  const infoSheet = [...(document.styleSheets || [])].find(item => item.href?.endsWith('/student/appearance.css'));
  if (infoSheet) {
    const rules = [
      'html { scroll-padding-top: calc(var(--student-topbar-height, 76px) + 16px); }',
      '.layout > main#main { max-width: none; width: 100%; }',
      'body > .topbar { position: sticky; top: 0; z-index: 30; background: var(--surface); }',
      'body > .topbar { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px 24px; padding: 12px 24px; }',
      '.topbar > .brand { justify-self: start; }',
      '.topbar .brand-name small { display: block; margin: 2px 0 0; font-size: 11px; }',
      '.topbar > .topbar-status { justify-self: end; display: grid; grid-template-columns: auto auto; align-items: center; gap: 4px 10px; }',
      '.topbar .topbar-status .checked-at { grid-column: 1 / -1; grid-row: 2; text-align: right; font-size: 11px; }',
      '.topbar .topbar-status > .btn { min-height: 36px; padding: 7px 12px; }',
      '.layout > .sidebar { position: sticky; top: var(--student-topbar-height, 76px); align-self: start; height: calc(100dvh - var(--student-topbar-height, 76px)); overflow-y: auto; }',
      '@media (max-width: 700px) { .layout > .sidebar { height: auto; max-height: 35dvh; z-index: 20; } }',
      '#student-provided-boundary { margin: 32px 0 18px; padding: 20px 4px 0; border-top: 3px solid var(--border); }',
      '#student-provided-boundary h2 { margin: 0 0 6px; font-size: 1.1rem; }',
      '#student-provided-boundary p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.7; }',
      '#view-protection > #student-provided-boundary, #view-protection > #student-provided-boundary ~ .provided, #view-protection > #student-provided-boundary ~ #pc-status, #view-protection > #student-provided-boundary ~ .grid-2:not(:has(.student)) { display: none; }',
      '#view-apps > .provided, #view-apps > .grid-2:not(:has(.student)), #view-records > .provided, #view-records > .grid-2:not(:has(.student)) { display: none; }',
      '.view > .grid-2:has(> .card.student) { grid-template-columns: minmax(0, 1fr); }',
      '.student-identity-view > .student-info-actions { grid-column: 1 / -1; }',
      '.student-info-view .student-info-actions + p:empty { display: none; }',
      '.card.student { border-width: 1px; border-style: solid; border-color: color-mix(in srgb, var(--student) 25%, var(--border)); }',
      '.student-support .student-support-grid > .student-section, [data-student-dashboard] #pc-main-dashboard, .card.pc-evidence-section { border: 1px solid color-mix(in srgb, var(--student) 25%, var(--border)); }',
      '.student-diagnostics-heading h4 > .tag-student { margin-left: 8px; vertical-align: middle; }',
      '.card.student[aria-labelledby="student-status-title"] { padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; }',
      '.card.student[aria-labelledby="student-status-title"] > h2 { display: none; }',
      '.student-info-view { min-width: 0; line-height: 1.65; word-break: keep-all; overflow-wrap: anywhere; }',
      '.student-info-view > h3 { margin: 0 0 12px; }',
      '.student-info-view h4 { margin: 20px 0 8px; }',
      '.student-info-view p, .student-support p { margin: 8px 0; }',
      '.student-info-view .student-info-lead { padding: 10px 12px; margin: 0 0 14px; background: var(--accent-soft); border-left: 3px solid var(--accent); border-radius: 6px; }',
      '.student-info-view .student-section { padding: 14px; border: 1px solid var(--border); border-radius: var(--radius); min-width: 0; }',
      '.student-info-view .student-section h3 { margin: 0 0 8px; }',
      '.student-info-view .student-section dl { margin: 8px 0; }',
      '.student-info-view .student-section dd { margin: 2px 0 10px; font-weight: 600; }',
      '.student-identity-view { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }',
      '.student-identity-view > p { grid-column: 1 / -1; margin: 0; padding: 10px 12px; border-left: 3px solid var(--accent); background: var(--accent-soft); border-radius: 6px; }',
      '.student-info-view ul { padding-left: 22px; }',
      '.student-info-view li + li { margin-top: 6px; }',
      '.student-info-view table { display: block; max-width: 100%; overflow-x: auto; border-collapse: collapse; }',
      '.student-info-view th, .student-info-view td { padding: 10px 12px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--border); }',
      '.student-info-view th { background: var(--accent-soft); white-space: nowrap; }',
      '.student-info-view > .row, .student-support .student-diagnostics-actions { gap: 8px; margin-top: 14px; flex-wrap: wrap; }',
      '.student-support { line-height: 1.65; word-break: keep-all; overflow-wrap: anywhere; }',
      '.student-support-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; margin-top: 14px; }',
      '.student-support .student-section { padding: 18px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); min-width: 0; }',
      '.student-support .student-section > h4 { margin: 0 0 10px; font-size: 1rem; }',
      '.student-support .student-section > .muted { font-size: 12px; margin-bottom: 12px; }',
      '.student-support summary { padding: 8px; cursor: pointer; }',
      '.student-support .student-notifications { list-style: none; padding: 0; margin: 10px 0 0; }',
      '.student-support .student-notifications > li + li { margin-top: 8px; }',
      '.student-support .student-notifications details { border: 1px solid var(--border); border-radius: 6px; }',
      '.student-support .student-notifications summary { padding: 10px 12px; }',
      '.student-support .student-notifications details[open] summary { border-bottom: 1px solid var(--border); background: var(--accent-soft); }',
      '.student-support .student-notifications details > ul { margin: 10px 12px; padding-left: 20px; font-size: 12px; line-height: 1.7; }',
      '.student-support .student-diagnostics-layout { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: stretch; margin: 12px 0; }',
      '.student-support .student-diagnostics-console { min-width: 0; margin: 0; padding: 16px; border: 1px solid #334155; border-radius: 8px; background: #0f172a; color: #d1fae5; font: 12px/1.7 Consolas, monospace; white-space: pre; overflow: auto; tab-size: 2; }',
      '.student-support .student-diagnostics-info { min-width: 0; padding: 12px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); }',
      '.student-support .student-diagnostics-info p { margin: 0; padding: 7px 0; font-size: 13px; overflow-wrap: anywhere; }',
      '.student-support .student-diagnostics-info p + p { border-top: 1px solid var(--border); }',
      '.student-support .student-diagnostics-heading { margin: 0 0 12px; }',
      '.student-support .student-diagnostics-heading h4 { margin: 0; font-size: 1rem; }',
      '.student-support .student-diagnostics-toggle:disabled { padding: 0; border: 0; background: transparent; color: var(--text); opacity: 1; font-size: 1rem; font-weight: 600; cursor: default; }',
      '.student-support .student-diagnostics-state { margin: 0 0 8px; font-weight: 600; }',
      '.student-support .student-diagnostics-description { max-width: 78ch; color: var(--muted); font-size: 13px; line-height: 1.8; }',
      '@media (max-width: 700px) { .student-support .student-diagnostics-layout { grid-template-columns: minmax(0, 1fr); } }',
      '.student-info-view :focus-visible, .student-support :focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }',
      '@media (max-width: 900px) { .student-identity-view { grid-template-columns: minmax(0, 1fr); } }',
      // Giga의 기기 패널 표현을 참고한다. 색상 변수와 배치·크기는 유지한다.
      'body .btn { border-radius: 7px; box-shadow: inset 0 1px 0 color-mix(in srgb, var(--surface) 85%, white), 0 2px 0 var(--border), 0 4px 8px color-mix(in srgb, var(--text) 7%, transparent); }',
      'body .btn:hover:not(:disabled) { border-color: var(--accent); box-shadow: inset 0 1px 0 var(--surface), 0 2px 0 var(--border), 0 4px 10px color-mix(in srgb, var(--text) 12%, transparent); }',
      'body .btn:active:not(:disabled) { box-shadow: inset 0 2px 4px color-mix(in srgb, var(--text) 12%, transparent); }',
      'body .btn:disabled { box-shadow: none; }',
      '.card { border-radius: 10px; box-shadow: inset 0 1px 0 color-mix(in srgb, var(--surface) 85%, white), 0 2px 5px color-mix(in srgb, var(--text) 4%, transparent); }',
      '[data-student-dashboard] .pc-metric-card, [data-student-dashboard] .pc-detail-panel, .student-support .student-section, .student-info-view .student-section { border-radius: 10px; box-shadow: inset 0 1px 0 color-mix(in srgb, var(--surface) 85%, white), 0 1px 3px color-mix(in srgb, var(--text) 4%, transparent); }',
      '#nav [role="tab"] { border-radius: 7px; }',
      '#nav [role="tab"][aria-selected="true"] { box-shadow: inset 0 0 0 1px var(--border), 0 2px 3px color-mix(in srgb, var(--text) 5%, transparent); }',
      'body > .topbar { box-shadow: 0 3px 10px color-mix(in srgb, var(--text) 6%, transparent); }',
      'main > .view > h1 { font-family: ui-monospace, Consolas, "Malgun Gothic", "Apple SD Gothic Neo", monospace; font-weight: 600; letter-spacing: -0.02em; }',
      '[data-student-dashboard] .pc-metric-value, [data-student-dashboard] .pc-capacity-part > strong, .student-diagnostics-info { font-variant-numeric: tabular-nums; }',
      '.student-support .student-diagnostics-console { border-radius: 8px; box-shadow: inset 0 2px 8px rgb(0 0 0 / 18%); }',
      'html[data-student-theme="dark"] { color-scheme: dark; --bg: #0b0c0c; --surface: #111313; --text: #ededed; --muted: #a1a6a6; --border: #292c2c; --accent: #9dbcec; --accent-soft: #1b2027; --student: #baa2ed; --student-soft: #211c2c; --allow: #78d5ae; --allow-soft: #12271e; --deny: #f2a19b; --deny-soft: #2c191b; --challenge: #dfc181; --challenge-soft: #292316; --unknown: #b4baba; --unknown-soft: #1d2020; }',
      'html[data-student-theme="dark"] body { color: var(--text); background: var(--bg); }',
      'html[data-student-theme="dark"] body > .topbar, html[data-student-theme="dark"] .layout > .sidebar { background: #0d0f0f; }',
      'html[data-student-theme="dark"] .student-support .student-diagnostics-console { background: #090b0b; border-color: var(--border); }',
      '.topbar .topbar-status > #student-theme-toggle { grid-column: 3; grid-row: 1; display: grid; place-items: center; width: 36px; height: 36px; min-height: 36px; padding: 0; border-radius: 50%; font-size: 22px; line-height: 1; }',
      'body .btn, #nav [role="tab"], .topbar .brand-name { font-family: Arial, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; font-style: normal; letter-spacing: -0.01em; -webkit-font-smoothing: antialiased; }',
      'body .btn { font-weight: 600; }',
      '#nav [role="tab"] { font-weight: 400; }',
      '#nav [role="tab"][aria-selected="true"] { font-weight: 600; }',
    ];
    try { for (const rule of rules) infoSheet.insertRule(rule, infoSheet.cssRules.length); } catch { /* 스타일 적용 실패 시에도 조회와 안내는 제공한다. */ }
    const topbar = document.querySelector?.('body > .topbar');
    if (topbar && typeof ResizeObserver === 'function') {
      const index = infoSheet.insertRule(':root { --student-topbar-height: 76px; }', infoSheet.cssRules.length);
      const heightRule = infoSheet.cssRules[index];
      const updateHeight = () => heightRule.style.setProperty('--student-topbar-height', `${Math.ceil(topbar.getBoundingClientRect().height)}px`);
      updateHeight();
      const observer = new ResizeObserver(updateHeight); observer.observe(topbar);
      window.addEventListener('pagehide', () => observer.disconnect(), {once: true});
    }
  }
  let diagnosticsExpanded = true;
  function appendSharedAction(root, label, targetId, unavailable, resolveTarget, {busy = false, busyLabel = '조회 중…'} = {}) {
    const actions = document.createElement('div'); actions.className = 'row student-info-actions';
    const button = document.createElement('button'); button.type = 'button'; button.className = 'btn'; button.textContent = label;
    const feedback = document.createElement('p'); feedback.className = 'muted'; feedback.setAttribute('role', 'status');
    const resolve = () => resolveTarget ? resolveTarget() : document.getElementById?.(targetId);
    button.disabled = busy || Boolean(resolve()?.disabled);
    if (busy) button.textContent = busyLabel;
    if (!resolve() || button.disabled) feedback.textContent = unavailable;
    if (busy) feedback.textContent = '요청을 처리하고 있습니다. 완료될 때까지 기다려 주세요.';
    button.addEventListener?.('click', () => {
      const target = resolve();
      if (button.disabled) return;
      if (!target || target.disabled) { feedback.textContent = unavailable; return; }
      button.disabled = true;
      button.textContent = busyLabel;
      feedback.textContent = '요청을 처리하고 있습니다. 완료될 때까지 기다려 주세요.';
      target.click();
      button.disabled = 'disabled' in target;
      if (!button.disabled) { button.textContent = label; feedback.textContent = ''; }
    });
    actions.append(button); root.append(actions, feedback);
  }
  // 실제 PC 대시보드를 먼저 배치하고 제공 로그인 카드는 아래 구역에 모은다.
  function arrangeStudentEntry() {
    const view = document.getElementById?.('view-protection');
    if (!view) return;
    const studentHeadings = {
      'student-status-title': 'PC 상태·알림',
      'student-identity-title': '로그인·기기·세션',
      'student-decision-title': '업무 앱 접근 판정',
      'student-events-title': '보안 기록',
      'student-ai-connection-title': 'AI 연결 점검',
      'student-vulnerabilities-title': '패키지 취약점 조회',
      'student-explanation-title': 'AI 사건 설명',
      'student-action-title': '보안 조치 결과',
    };
    for (const [id, title] of Object.entries(studentHeadings)) {
      const heading = document.getElementById(id);
      if (!heading || heading.dataset.studentLabel === title) continue;
      const badge = heading.querySelector('.tag-student');
      if (!badge) continue;
      heading.textContent = `${title} `;
      badge.textContent = '학생 구현';
      heading.append(badge);
      heading.dataset.studentLabel = title;
    }
    const topbar = document.querySelector?.('body > .topbar');
    if (topbar && !document.getElementById('student-theme-toggle')) {
      const toggle = document.createElement('button'); toggle.type = 'button'; toggle.id = 'student-theme-toggle'; toggle.className = 'btn';
      let dark = true;
      try { dark = localStorage.getItem('keshev-student-theme') !== 'light'; } catch { /* 저장소 사용 불가 시 기본 다크 모드로 시작한다. */ }
      const applyTheme = () => {
        document.documentElement.setAttribute('data-student-theme', dark ? 'dark' : 'light');
        toggle.textContent = dark ? '☀' : '☾';
        toggle.setAttribute('aria-label', dark ? '밝은 모드로 전환' : '다크 모드로 전환');
        toggle.title = dark ? '밝은 화면으로 전환' : '어두운 화면으로 전환';
      };
      applyTheme();
      toggle.addEventListener('click', () => {
        dark = !dark; applyTheme();
        try { localStorage.setItem('keshev-student-theme', dark ? 'dark' : 'light'); } catch { /* 저장 실패는 전환을 막지 않는다. */ }
      });
      (topbar.querySelector('.topbar-status') || topbar).append(toggle);
    }
    const heading = [...view.children].find(node => node.tagName === 'H1');

    const studentDashboard = document.getElementById('student-status')?.parentElement;
    if (studentDashboard?.parentElement === view && studentDashboard.classList.contains('student')
      && heading && heading.nextElementSibling !== studentDashboard) view.insertBefore(studentDashboard, heading.nextElementSibling);
    const loginCard = document.getElementById('identity-title')?.parentElement;
    const providedDiagnostics = document.getElementById('diag-title')?.parentElement;
    if (loginCard?.classList.contains('provided') && providedDiagnostics?.parentElement === view
      && loginCard.nextElementSibling !== providedDiagnostics) view.insertBefore(loginCard, providedDiagnostics);
    const aiConnectCard = document.getElementById('ai-connect-card');
    const studentAiCard = document.getElementById('student-ai-connection')?.parentElement;
    if (aiConnectCard && studentAiCard?.parentElement === view
      && aiConnectCard.nextElementSibling !== studentAiCard) view.insertBefore(aiConnectCard, studentAiCard);
    const providedPc = document.getElementById('pc-status');
    const devicesCard = document.getElementById('devices-title')?.parentElement;
    const providedStart = providedPc?.parentElement === view ? providedPc
      : devicesCard?.parentElement?.parentElement === view ? devicesCard.parentElement : null;
    if (providedStart) {
      let boundary = document.getElementById('student-provided-boundary');
      if (!boundary) {
        boundary = document.createElement('header'); boundary.id = 'student-provided-boundary';
        const title = document.createElement('h2'); title.textContent = '제공 기본 화면';
        const description = document.createElement('p');
        description.textContent = '아래는 기본으로 제공된 조회·점검 화면입니다. 위쪽 학생 구현 및 AI 연결 절차 영역과 구분해 확인하세요.';
        boundary.append(title, description);
      }
      if (boundary.nextElementSibling !== providedStart) view.insertBefore(boundary, providedStart);
    }
  }
  arrangeStudentEntry();
  if (typeof MutationObserver === 'function') {
    const observer = new MutationObserver(arrangeStudentEntry);
    observer.observe(document.documentElement, {attributes: true, attributeFilter: ['data-appearance-preset']});
    window.addEventListener('pagehide', () => observer.disconnect(), {once: true});
  }
  return {
    renderIdentity({ me, devices, sessions }) {
      const root = document.createElement('div');
      root.className = 'student-view student-info-view student-identity-view';

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

      const errorKey = resource => resource.status === 'error' && typeof resource.error?.code === 'string' && resource.error.code
        && typeof resource.error?.message === 'string' && resource.error.message
        ? JSON.stringify([resource.error.code, resource.error.message]) : null;
      const errorGroups = new Map();
      for (const resource of [me, devices, sessions]) {
        const key = errorKey(resource);
        if (key) errorGroups.set(key, (errorGroups.get(key) || 0) + 1);
      }
      for (const [key, count] of errorGroups) {
        if (count > 1) appendText(root, 'p', JSON.parse(key)[1]);
      }
      if ([me, devices, sessions].some(resource => resource.mode === 'disconnected')) {
        appendText(root, 'p', '확인 범위: 로그인 사용자·등록 기기·현재 세션. 연결이 없어 받은 결과는 확인 불가로 표시합니다. 앱 서버와 연결 어댑터 상태를 확인한 뒤 상단 「다시 불러오기」로 재조회하세요.');
      }

      const appendMode = (section, name, resource) => {
        if (resource.status === 'error' && resource.mode !== 'demo') return;
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
          const label = unverified ? '확인 불가' : resource.mode === 'disconnected' ? '연결 없음' : '연결 실패';
          const repeated = (errorGroups.get(errorKey(resource)) || 0) > 1;
          appendText(section, 'p', `${name}: ${label}${repeated ? '' : `: ${message}`}`);
          return false;
        }
        if (resource.status !== 'ok') {
          appendText(section, 'p', `${name}: 확인 불가`);
          return false;
        }
        return true;
      };

      const identitySection = document.createElement('section');
      identitySection.className = 'student-section';
      appendText(identitySection, 'h3', '로그인 사용자');
      appendText(identitySection, 'p', '서버가 확인한 사용자 이름과 고유 ID를 표시합니다.');
      appendMode(identitySection, '로그인 정보', me);
      if (appendResourceState(identitySection, '로그인 정보', me)) {
        const { user } = me.data;
        const identity = document.createElement('dl');
        appendText(identity, 'dt', '사용자');
        appendText(identity, 'dd', `${user.label || user.id} · ID: ${user.id}`);
        identitySection.append(identity);
      }
      root.append(identitySection);

      const devicesSection = document.createElement('section');
      devicesSection.className = 'student-section';
      appendText(devicesSection, 'h3', '기기');
      appendText(devicesSection, 'p', '등록 기기의 이름·ID와 보안 기준 충족 여부를 확인합니다. 연결 없음은 기준 미충족 판정이 아닙니다.');
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
      sessionsSection.className = 'student-section';
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

      appendSharedAction(root, '로그인·기기·세션 다시 조회', 'refresh', '상단 조회가 진행 중이면 완료 후 다시 시도하세요. 조회 버튼이 없으면 앱 화면을 새로고침하세요.', null, {busy: [me, devices, sessions].some(item => item.status === 'loading')});

      return root;
    },
    renderDecision({ status, mode, data, error, appId }) {
      const root = document.createElement('section');
      root.className = 'student-view student-info-view';
      const appendText = (tag, text) => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        root.append(node);
        return node;
      };
      const displayValue = (value, fallback) =>
        typeof value === 'string' && value.length > 0 ? value : fallback;

      appendText('h3', '업무 앱 접근 판정');
      const appButtons = () => [...(document.getElementById?.('apps')?.querySelectorAll?.('.app-button') || [])];
      const availableApps = appButtons();
      const choices = document.createElement('div'); choices.className = 'row student-info-actions';
      choices.setAttribute('role', 'group'); choices.setAttribute('aria-label', '업무 앱 선택과 접속 요청');
      for (const source of availableApps) {
        const id = source.getAttribute('data-app-id');
        if (!id) continue;
        const button = document.createElement('button'); button.type = 'button'; button.className = 'btn';
        button.textContent = status === 'loading' && appId === id ? '접속 판정 조회 중…' : source.textContent;
        button.disabled = status === 'loading' || source.disabled;
        button.addEventListener('click', () => {
          const target = appButtons().find(item => item.getAttribute('data-app-id') === id);
          if (button.disabled || !target || target.disabled) return;
          for (const choice of choices.children) choice.disabled = true;
          button.textContent = '접속 판정 조회 중…'; target.click();
        });
        choices.append(button);
      }
      root.append(choices);
      if (!availableApps.length) appendText('p', '선택할 수 있는 업무 앱을 받지 못했습니다. 연결 상태를 확인한 뒤 「업무 앱 목록 다시 조회」로 다시 불러오세요.');
      appendSharedAction(root, '업무 앱 목록 다시 조회', 'refresh', '전체 조회가 진행 중이면 완료 후 다시 시도하세요.');
      appendText('p', '선택한 업무 앱의 정책 판정·이유·판정 시각을 확인합니다. 실제 접속 여부는 업무 앱에서 별도로 확인하세요.').className = 'student-info-lead';
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
      root.className = 'student-view student-info-view';
      root.id = 'student-records-content'; root.tabIndex = -1;
      const appendText = (parent, tag, text) => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        parent.append(node);
        return node;
      };
      const valueText = (value, fallback = '확인 불가') =>
        value === undefined || value === null || value === '' ? fallback : String(value);
      const modeLabels = {
        connected: '기록 자료 연결됨(connected) · 실제 업무 앱 접속 성공을 뜻하지 않습니다.',
        demo: '예제 자료(demo) · 실제 본인 기록이 아닙니다.',
        disconnected: '연결 없음(disconnected)',
        unknown: '연결 상태 확인 불가(unknown)',
      };

      appendText(root, 'h3', '접속 기록·XDR 경보');
      if (status === 'ok' || status === 'loading') appendSharedAction(root, '기록 다시 불러오기', 'refresh', '상단 전체 조회가 완료된 뒤 다시 시도하세요.', null, {busy: status === 'loading'});
      appendText(root, 'p', '접속 판정과 보안 경보를 탐색하고, 선택한 기록의 근거를 확인합니다. PC 대시보드의 Windows 이벤트 기록과는 다른 자료입니다.').className = 'student-info-lead';
      appendText(root, 'p', modeLabels[mode] || modeLabels.unknown);
      const appendRetry = () => {
        appendText(root, 'p', '「기록 다시 불러오기」로 다시 조회하세요. 계속 실패하면 앱 서버와 연결 어댑터 상태를 확인하세요.');
        const feedback = appendText(root, 'p', '이 버튼은 상단 「다시 불러오기」와 같은 전체 조회를 실행합니다.');
        feedback.setAttribute('role', 'status');
        const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'btn'; retry.textContent = '기록 다시 불러오기';
        retry.addEventListener('click', () => {
          if (retry.disabled) return;
          const target = document.getElementById('refresh');
          if (!target) feedback.textContent = '다시 조회 버튼을 찾을 수 없습니다. 앱 화면을 새로고침한 뒤 다시 시도하세요.';
          else if (target.disabled) feedback.textContent = '전체 조회가 진행 중입니다. 완료된 뒤 다시 시도하세요.';
          else { retry.disabled = true; target.click(); }
        });
        root.append(retry);
      };

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
        appendRetry();
        return root;
      }
      if (status !== 'ok') {
        appendText(root, 'p', '기록 확인 불가');
        appendRetry();
        return root;
      }
      if (!Array.isArray(data)) {
        appendText(root, 'p', '확인 불가: 기록 형식을 확인할 수 없습니다.');
        appendRetry();
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
      filters.className = 'student-event-filters';
      list.className = 'student-event-list';
      detailHost.className = 'student-event-detail';
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
    renderStatus({ notifications, diagnostics, sessions, mode } = {}) {
      const root = document.createElement('section');
      root.append(renderPcDashboard({sessions, mode}));
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
      const secretPattern = /(?:Bearer\s+\S+|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|secret|token|비밀번호|토큰)["']?\s*[:=]\s*\S+)/i;
      const safeValue = (value, fallback = '확인 불가') => {
        if (typeof value !== 'string' || value.length > 500 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) || secretPattern.test(value)) return fallback;
        return value || fallback;
      };
      const resourceMode = (section, resource) => {
        if (resource?.mode && modeLabels[resource.mode]) {
          appendText(section, 'p', `연결 상태: ${modeLabels[resource.mode]}`);
        }
      };

      const support = document.createElement('section'); support.className = 'student-support';
      const supportSections = document.createElement('div'); supportSections.className = 'student-support-grid';


      const notificationsSection = document.createElement('section');
      notificationsSection.className = 'student-section';
      const notificationHeading = appendText(notificationsSection, 'h4', '알림 ');
      appendText(notificationHeading, 'span', '학생 구현').className = 'tag tag-student';
      appendText(notificationsSection, 'p', '같은 원인의 알림은 하나로 묶습니다. 항목을 펼치면 영향을 받은 자료와 오류 코드를 확인할 수 있습니다.').className = 'muted';
      if (Array.isArray(notifications) && notifications.length > 0) {
        const groups = new Map();
        for (const notification of notifications) {
          const code = notification?.code, message = notification?.message;
          const canGroup = typeof code === 'string' && code.length > 0 && typeof message === 'string' && message.length > 0;
          const key = canGroup ? JSON.stringify([code, message]) : Symbol();
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(notification);
        }
        const list = document.createElement('ul'); list.className = 'student-notifications';
        for (const group of groups.values()) {
          const item = document.createElement('li'), detail = document.createElement('details');
          const message = safeValue(group[0]?.message, '메시지 확인 불가');
          appendText(detail, 'summary', group.length > 1 ? `${message} · ${group.length}개 항목` : message);
          const resources = document.createElement('ul');
          for (const notification of group) appendText(resources, 'li', `자료: ${safeValue(notification?.resource)} · 코드: ${safeValue(notification?.code)}`);
          detail.append(resources); item.append(detail); list.append(item);
        }
        notificationsSection.append(list);
      } else {
        appendText(notificationsSection, 'p', '주의할 알림이 없습니다.');
      }
      supportSections.append(notificationsSection);

      const diagnosticsSection = document.createElement('section');
      diagnosticsSection.className = 'student-section student-diagnostics';
      const heading = document.createElement('div'); heading.className = 'student-diagnostics-heading';
      const headingTitle = document.createElement('h4');
      const details = document.createElement('div'); details.id = 'student-diagnostics-details';
      const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'btn student-diagnostics-toggle';
      const label = document.createElement('span'); label.textContent = '도움정보';
      const arrow = document.createElement('span'); arrow.className = 'student-diagnostics-arrow'; arrow.setAttribute('aria-hidden', 'true');
      toggle.append(label, arrow);
      toggle.disabled = diagnostics?.status !== 'ok';
      arrow.hidden = toggle.disabled;
      toggle.setAttribute('aria-controls', details.id);
      const updateToggle = () => {
        details.hidden = diagnostics?.status === 'ok' && !diagnosticsExpanded;
        arrow.textContent = diagnosticsExpanded ? '▴' : '▾';
        toggle.setAttribute('aria-label', diagnosticsExpanded ? '도움정보 접기' : '도움정보 펼치기');
        toggle.setAttribute('aria-expanded', String(diagnosticsExpanded));
      };
      updateToggle();
      toggle.addEventListener('click', () => {diagnosticsExpanded = !diagnosticsExpanded; updateToggle();});
      headingTitle.append(toggle);
      appendText(headingTitle, 'span', '학생 구현').className = 'tag tag-student';
      heading.append(headingTitle); diagnosticsSection.append(heading);
      if (diagnostics?.status !== 'ok') resourceMode(details, diagnostics);
      let safeDiagnostics = null;
      if (diagnostics?.status === 'loading') {
        appendText(details, 'p', '도움정보를 불러오는 중');
      } else if (diagnostics?.status === 'error') {
        const message = safeValue(diagnostics.error?.message, '서버가 오류 내용을 제공하지 않았습니다.');
        const timeout = diagnostics.error?.code === 'TIMEOUT' || /시간이 초과|시간 초과|timed out|timeout/i.test(message);
        appendText(details, 'p', `${timeout ? '도움정보 조회 시간 초과' : '도움정보를 불러오지 못했습니다'}: ${message}`);
        appendText(details, 'p', '다시 시도하려면 「도움정보 불러오기」를 누르세요.');
      } else if (diagnostics?.status === 'ok') {
        const source = diagnostics.data;
        const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
        const validText = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 500;
        const validDiagnostics = isRecord(source) && ['requestId', 'component', 'version', 'checkedAt'].every(key => validText(source[key]))
          && isRecord(source.engine) && ['mode', 'code'].every(key => validText(source.engine[key]));
        if (!validDiagnostics) {
          appendText(details, 'p', '확인 불가: 도움정보 응답 구조가 올바르지 않아 복사할 수 없습니다.');
          appendText(details, 'p', '「도움정보 불러오기」로 다시 조회하고 계속되면 담당자에게 응답 형식을 확인해 달라고 요청하세요.');
        } else {
          const engine = source.engine;
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
          const layout = document.createElement('div'); layout.className = 'student-diagnostics-layout';
          const output = document.createElement('pre'); output.className = 'student-diagnostics-console';
          output.setAttribute('aria-label', '복사할 도움정보'); output.tabIndex = 0;
          output.textContent = JSON.stringify(safeDiagnostics, null, 2);
          const info = document.createElement('div'); info.className = 'student-diagnostics-info';
          resourceMode(info, diagnostics);
          appendText(info, 'p', `요청 ID (requestId): ${safeDiagnostics.requestId}`);
          appendText(info, 'p', `구성 요소 (component): ${safeDiagnostics.component}`);
          appendText(info, 'p', `버전 (version): ${safeDiagnostics.version}`);
          appendText(info, 'p', `확인 시각 (checkedAt): ${safeDiagnostics.checkedAt}`);
          appendText(info, 'p', `엔진 모드 (engine.mode): ${safeDiagnostics.engine.mode}`);
          appendText(info, 'p', `엔진 코드 (engine.code): ${safeDiagnostics.engine.code}`);
          layout.append(output, info); details.append(layout);
        }
      } else {
        appendText(details, 'p', '도움정보 확인 대기').className = 'student-diagnostics-state';
        appendText(details, 'p', '「도움정보 불러오기」를 누르면 요청 ID·앱 버전·연결 모드·확인 시각을 확인할 수 있습니다. 조회가 완료되고 응답 형식이 확인되어야 복사할 수 있습니다.').className = 'student-diagnostics-description';
      }
      const loadButton = document.createElement('button');
      loadButton.type = 'button'; loadButton.className = 'btn';
      loadButton.textContent = diagnostics?.status === 'loading' ? '불러오는 중…' : '도움정보 불러오기';
      loadButton.disabled = diagnostics?.status === 'loading';
      const copyButton = document.createElement('button');
      copyButton.type = 'button';
      copyButton.className = 'btn';
      copyButton.textContent = '도움정보 복사';
      copyButton.disabled = !safeDiagnostics;
      const copyStatus = appendText(details, 'p', '도움 요청에 사용할 안전한 진단 항목만 복사합니다.');
      copyStatus.className = 'student-diagnostics-description';
      copyStatus.setAttribute('role', 'status');
      loadButton.addEventListener('click', () => {
        const providedButton = document.getElementById('diag-load');
        diagnosticsExpanded = true; updateToggle();
        if (diagnostics?.status === 'loading') copyStatus.textContent = '도움정보 조회가 진행 중입니다. 완료될 때까지 기다리세요.';
        else if (providedButton && !providedButton.disabled) providedButton.click();
        else if (!providedButton) copyStatus.textContent = '도움정보 조회 버튼을 찾을 수 없습니다. 앱 화면을 새로고침한 뒤 다시 시도하세요.';
        else copyStatus.textContent = '현재 도움정보 조회 버튼을 사용할 수 없습니다. 진행 중인 조회가 끝난 뒤 다시 시도하고 계속되면 앱 서버 상태를 확인하세요.';
      });
      copyButton.addEventListener('click', async () => {
        if (!safeDiagnostics) return;
        try {
          await navigator.clipboard.writeText(JSON.stringify(safeDiagnostics, null, 2));
          copyStatus.textContent = '도움정보를 클립보드에 복사했습니다.';
        } catch {
          copyStatus.textContent = '클립보드 복사를 사용할 수 없습니다. 화면에 표시된 안전한 항목만 직접 복사하세요.';
        }
      });
      const actions = document.createElement('div'); actions.className = 'row student-diagnostics-actions';
      actions.append(loadButton, copyButton);
      diagnosticsSection.append(details, actions);
      supportSections.append(diagnosticsSection); support.append(supportSections); root.append(support);

      return root;
    },
    renderVulnerabilities({ status, mode, data, error } = {}) {
      const root = document.createElement('section');
      root.className = 'student-view student-info-view';
      const appendText = (parent, tag, text) => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        parent.append(node);
        return node;
      };
      const valueText = (value, fallback = '확인 불가') =>
        value === undefined || value === null || value === '' ? fallback : String(value);
      const statusLabels = {
        complete: '모두 조회(complete)',
        partial: '일부 조회 실패(partial)',
        not_checked: '아직 조회 안 함(not_checked)',
        not_configured: '조회 준비 미완료(not_configured)',
        unverifiable: 'lock 파일 확인 불가(unverifiable)',
      };
      const packageStatus = (pkg) => {
        if (pkg.status === 'known_vulnerabilities') return '알려진 항목 있음(known_vulnerabilities)';
        if (pkg.status === 'none_found') return '알려진 항목 없음(none_found)';
        if (pkg.status === 'unverifiable' && Array.isArray(pkg.vulnerabilities) && pkg.vulnerabilities.length > 0) {
          return '일부 확인·전체 조회 확인 불가(unverifiable)';
        }
        return '조회 확인 불가(unverifiable)';
      };

      appendText(root, 'h3', '설치 패키지·알려진 취약점 조회');
      appendSharedAction(root, status === 'idle' ? '설치 패키지 조회' : '설치 패키지 다시 조회', 'vulnerabilities-load', '제공 패키지 조회 기능을 현재 사용할 수 없습니다. 진행 중인 조회가 끝난 뒤 다시 시도하세요.', null, {busy: status === 'loading'});
      if (status === 'loading') appendSharedAction(root, '패키지 조회 취소', 'vulnerabilities-cancel', '취소할 패키지 조회가 없습니다.');
      appendText(root, 'p', '설치된 정확한 패키지 버전을 공개 취약점 자료(OSV)와 대조합니다. 조회 상태·출처·확인 시각을 함께 읽어야 결과 범위를 알 수 있습니다.').className = 'student-info-lead';
      const modeLabels = {
        demo: '예제 자료(demo) · 실제 설치 패키지의 취약점 조회 결과로 판단하지 마세요.',
        connected: '실행 상태: 연결됨(connected) · 외부 취약점 조회 완료 여부와는 별도입니다.',
        disconnected: '실행 상태: 엔진 연결 없음(disconnected) · 로컬 패키지·OSV 조회 여부는 아래 결과에서 확인하세요.',
        unknown: '실행 상태: 확인 불가(unknown) · 조회 출처와 완료 여부를 별도로 확인하세요.',
      };
      appendText(root, 'p', modeLabels[mode] || modeLabels.unknown);
      if (status === 'idle') {
        appendText(root, 'p', '조회 전');
        appendText(root, 'p', '제공 화면의 「설치 패키지 조회」를 눌러 시작하세요. 조회 전에는 취약점의 유무를 판단할 수 없습니다.');
        return root;
      }
      if (status === 'loading') {
        appendText(root, 'p', '조회 중');
        return root;
      }
      if (status === 'error') {
        appendText(root, 'p', `조회 실패: ${valueText(error?.message, '오류 메시지를 확인할 수 없습니다.')}`);
        appendText(root, 'p', '앱 서버와 네트워크 상태를 확인한 뒤 「설치 패키지 조회」로 다시 시도하세요. 계속 실패하면 오류 내용과 조회 시각을 담당자에게 전달하세요.');
        return root;
      }
      if (status !== 'ok') {
        appendText(root, 'p', '조회 결과 확인 불가: 상태값을 확인할 수 없습니다.');
        return root;
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        appendText(root, 'p', '조회 결과 확인 불가: 응답 형식을 확인할 수 없습니다.');
        return root;
      }

      const scanStatus = typeof data.status === 'string' ? data.status : 'unverifiable';
      appendText(root, 'p', mode === 'demo' ? '자료 구분: 예제 응답'
        : '자료 구분: 조회 응답 · 실제 OSV 조회 여부는 조회 상태, 패키지별 출처와 확인 시각을 함께 확인하세요.');
      appendText(root, 'p', statusLabels[scanStatus] || `조회 상태 확인 불가(${scanStatus})`);
      appendText(root, 'p', '결과 범위: package-lock.json과 설치된 node_modules의 메타데이터를 대조한 패키지 버전의 OSV 조회입니다.');

      if (data.lockfileVersion !== undefined && data.lockfileVersion !== null) {
        appendText(root, 'p', `잠금 파일(package-lock.json) 버전: ${valueText(data.lockfileVersion)}`);
      }
      if (data.lockfileHash !== undefined && data.lockfileHash !== null && data.lockfileHash !== '') {
        appendText(root, 'p', `잠금 파일 해시(lockfileHash): ${valueText(data.lockfileHash)}`);
      }
      if (data.checkedAt !== undefined && data.checkedAt !== null && data.checkedAt !== '') {
        appendText(root, 'p', `전체 조회 시각(checkedAt): ${valueText(data.checkedAt)}`);
      }

      if (scanStatus === 'not_checked') {
        appendText(root, 'p', '승인된 공개 조회 대상 패키지가 없어 조회하지 않았습니다. 이는 취약점 없음이라는 뜻이 아닙니다.');
      } else if (scanStatus === 'not_configured') {
        appendText(root, 'p', '프로젝트 조회 설정 또는 허용된 공개 패키지 목록이 준비되지 않아 조회하지 않았습니다. 이는 취약점 없음이라는 뜻이 아닙니다.');
      } else if (scanStatus === 'unverifiable') {
        appendText(root, 'p', 'package-lock.json 또는 설치 목록을 확인할 수 없어 결과를 검증하지 못했습니다. 이는 취약점 없음이라는 뜻이 아닙니다.');
      } else if (scanStatus === 'partial') {
        appendText(root, 'p', '일부 패키지 조회에 실패했습니다. 이미 확인된 취약점 항목은 아래에 유지하며, 전체 조회 결과로 해석하지 마세요.');
      }

      if (!Array.isArray(data.packages)) {
        appendText(root, 'p', '패키지 조회 결과 목록을 확인할 수 없습니다.');
        return root;
      }
      if (data.packages.length === 0) {
        if (scanStatus === 'complete') appendText(root, 'p', '표시할 패키지 조회 결과가 없습니다.');
        return root;
      }

      const table = document.createElement('table');
      const head = document.createElement('thead');
      const headerRow = document.createElement('tr');
      for (const label of ['패키지', '설치된 정확한 버전', '조회 상태', '출처', '패키지 확인 시각', '취약점 ID·수정 시각']) {
        appendText(headerRow, 'th', label);
      }
      head.append(headerRow);
      table.append(head);
      const body = document.createElement('tbody');

      for (const pkg of data.packages) {
        if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) continue;
        const row = document.createElement('tr');
        row.setAttribute('data-student-package-name', valueText(pkg.name, ''));
        row.setAttribute('data-student-package-version', valueText(pkg.version, ''));
        appendText(row, 'td', valueText(pkg.name));
        appendText(row, 'td', valueText(pkg.version));
        appendText(row, 'td', packageStatus(pkg));
        appendText(row, 'td', valueText(pkg.source));
        appendText(row, 'td', valueText(pkg.checkedAt));

        const findingsCell = document.createElement('td');
        if (Array.isArray(pkg.vulnerabilities) && pkg.vulnerabilities.length > 0) {
          const findings = document.createElement('ul');
          for (const finding of pkg.vulnerabilities) {
            if (!finding || typeof finding !== 'object' || Array.isArray(finding)) continue;
            appendText(findings, 'li', `ID: ${valueText(finding.id)} · 수정 시각(modified): ${valueText(finding.modified)}`);
          }
          findingsCell.append(findings);
        } else if (pkg.status === 'none_found') {
          appendText(findingsCell, 'span', '조회 범위에서 알려진 취약점 항목이 없습니다. 패키지나 앱 전체의 안전을 보장하지 않습니다.');
        } else if (pkg.status === 'unverifiable') {
          appendText(findingsCell, 'span', '조회 확인 불가: 취약점 없음으로 판단할 수 없습니다.');
        } else {
          appendText(findingsCell, 'span', '취약점 항목을 확인할 수 없습니다.');
        }
        row.append(findingsCell);
        body.append(row);
      }
      table.append(body);
      root.append(table);
      appendText(root, 'p', 'OSV 조회 결과에 알려진 항목이 없더라도 해당 패키지나 앱 전체가 안전하다는 보장은 아닙니다.');
      return root;
    },
    renderAiConnection({ status, mode, data, error, checkedAt, explanationAccepted } = {}) {
      const root = document.createElement('section');
      root.className = 'student-view student-info-view';
      const checkButton = document.createElement('button');
      checkButton.type = 'button';
      checkButton.className = 'btn';
      checkButton.textContent = status === 'loading' ? 'AI 연결 점검 중…' : '현재 AI 연결 점검';
      const providedCheck = document.getElementById('ai-check');
      checkButton.disabled = status === 'loading' || !providedCheck || providedCheck.disabled;
      checkButton.addEventListener('click', () => {
        const target = document.getElementById('ai-check');
        if (checkButton.disabled || !target || target.disabled) return;
        checkButton.disabled = true;
        target.click();
      });
      const actions = document.createElement('div');
      actions.className = 'row';
      actions.append(checkButton);
      root.append(actions);
      const appendText = (tag, text) => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        root.insertBefore(node, actions);
        return node;
      };
      appendText('h3', 'AI 연결 점검');
      appendText('p', '현재 계정과 앱 권한으로 AI 통신 및 모델 목록 응답을 점검합니다. 사건 설명과 보안 조치는 각각 별도로 실행하고 결과를 확인합니다.').className = 'student-info-lead';
      if (status !== 'loading' && checkButton.disabled) appendText('p', '현재 점검 버튼을 사용할 수 없습니다. 제공 화면의 AI 연결·점검 진행 상태를 확인하고, 진행 중인 작업이 끝난 뒤 다시 시도하세요.');
      const safeCodes = new Set([
        'ON_AI_PROVISIONING_PENDING', 'WB_CLCO_AUTH_REQUIRED', 'WB_CLCO_ACCESS_BLOCKED',
        'WB_CLCO_COHORT_BUDGET_EXHAUSTED', 'WB_CLCO_RATE_LIMITED', 'WB_CLCO_LIMIT_REACHED',
        'WB_CLCO_SESSION_CLOSED', 'WB_CLCO_TIMEOUT', 'REQUEST_TIMEOUT', 'ENGINE_TIMEOUT', 'TIMEOUT',
        'WB_CLCO_NETWORK_ERROR', 'NETWORK_ERROR', 'WB_CLCO_CANCELLED', 'CANCELLED', 'REQUEST_CANCELLED',
        'MODEL_NOT_CONFIGURED', 'ON_AI_MODEL_LIST_EMPTY', 'ON_AI_AUTHORIZATION_CHANGED',
        'ON_AI_TRANSPORT_PENDING', 'WB_CLCO_SERVER_UNAVAILABLE', 'AI_REQUEST_UNVERIFIED',
        'SUBJECT_SCOPE_UNVERIFIED', 'WB_CLCO_REQUEST_FAILED', 'WB_CLCO_INVALID_RESPONSE',
      ]);
      const safeCode = (value) => typeof value === 'string' && safeCodes.has(value) ? value : 'AI_REQUEST_UNVERIFIED';
      const secretPattern = /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|secret|token|비밀번호|토큰)["']?\s*[:=]\s*\S+)/i;
      const modeLabels = {
        demo: '예제 자료(demo) · 실제 연결 결과가 아닙니다.',
        disconnected: 'SDP 엔진: 연결 없음(disconnected) · AI 연결 점검 결과와는 별개입니다.',
        unknown: 'SDP 엔진 상태: 확인 불가(unknown) · AI 연결 점검 결과는 아래에서 확인하세요.',
      };
      if (modeLabels[mode]) appendText('p', modeLabels[mode]);

      if (status === 'idle') {
        appendText('p', 'AI 연결 점검 전');
        appendText('p', '다시 점검하려면 「현재 AI 연결 점검」 버튼을 직접 누르세요. 자동으로 점검하지 않습니다.');
        return root;
      }
      if (status === 'loading') {
        appendText('p', 'AI 연결 점검 중');
        appendText('p', '점검 중 취소할 수 있으며, 다시 점검은 사용자가 버튼을 직접 눌러야 합니다. 자동 재점검은 하지 않습니다.');
        return root;
      }
      if (status === 'error') {
        const code = safeCode(error?.code);
        appendText('p', `AI 연결 점검 실패 (${code}): ${aiErrorText(safeCode(error?.code))}`);
        const guidance = {
          ON_AI_PROVISIONING_PENDING: '운영 담당자에게 계정 연결과 앱 권한 발급 상태를 확인해 달라고 요청하세요. 이는 학생 코드만으로 해결할 수 있는 문제가 아닙니다.',
          ON_AI_AUTHORIZATION_CHANGED: '담당자에게 계정 연결과 앱 권한 상태를 확인해 달라고 요청하세요.',
          SUBJECT_SCOPE_UNVERIFIED: '현재 계정 연결과 앱 권한을 담당자에게 확인해 달라고 요청하세요.',
          WB_CLCO_AUTH_REQUIRED: '계정 연결을 다시 확인하고, 담당자에게 앱 인증 상태를 확인해 달라고 요청하세요. 열쇠를 복사하거나 붙여 넣지 마세요.',
          WB_CLCO_ACCESS_BLOCKED: '계정 연결을 다시 확인하고, 담당자에게 앱 접근 권한을 확인해 달라고 요청하세요.',
          WB_CLCO_COHORT_BUDGET_EXHAUSTED: '반 사용량 한도에 도달했습니다. 담당자에게 확인하세요.',
          WB_CLCO_LIMIT_REACHED: '이용 한도에 도달했습니다. 담당자에게 확인하세요.',
          WB_CLCO_RATE_LIMITED: '요청이 제한되었습니다. 잠시 뒤 사용자가 직접 다시 점검하세요.',
          WB_CLCO_SESSION_CLOSED: '허용된 AI 이용 시간을 확인하세요.',
          WB_CLCO_TIMEOUT: '요청 시간이 초과됐습니다. 잠시 뒤 사용자가 직접 다시 점검하세요.',
          REQUEST_TIMEOUT: '요청 시간이 초과됐습니다. 잠시 뒤 사용자가 직접 다시 점검하세요.',
          ENGINE_TIMEOUT: '서버 점검 시간이 초과됐습니다. 잠시 뒤 사용자가 직접 다시 점검하세요.',
          TIMEOUT: '요청 시간이 초과됐습니다. 잠시 뒤 사용자가 직접 다시 점검하세요.',
          WB_CLCO_NETWORK_ERROR: '네트워크 연결을 확인한 뒤 잠시 뒤 사용자가 직접 다시 점검하세요.',
          NETWORK_ERROR: '네트워크 연결을 확인한 뒤 잠시 뒤 사용자가 직접 다시 점검하세요.',
          WB_CLCO_SERVER_UNAVAILABLE: 'AI 서버 연결을 확인한 뒤 잠시 뒤 사용자가 직접 다시 점검하세요.',
          WB_CLCO_CANCELLED: 'AI 연결 점검이 취소됐습니다. 이전 점검 결과는 현재 결과가 아닙니다.',
          CANCELLED: 'AI 연결 점검이 취소됐습니다. 이전 점검 결과는 현재 결과가 아닙니다.',
          REQUEST_CANCELLED: 'AI 연결 점검이 취소됐습니다. 이전 점검 결과는 현재 결과가 아닙니다.',
          MODEL_NOT_CONFIGURED: '담당자에게 사용할 모델의 허용 설정을 확인해 달라고 요청하세요.',
          ON_AI_MODEL_LIST_EMPTY: '사용할 수 있는 모델이 없습니다. 담당자에게 모델 허용 설정을 확인해 달라고 요청하세요.',
          ON_AI_TRANSPORT_PENDING: '수업용 AI 연결 경로가 준비되지 않았습니다. 담당자에게 게이트 연결 준비 상태를 확인해 달라고 요청하세요.',
          WB_CLCO_INVALID_RESPONSE: '서버 응답을 확인할 수 없습니다. 담당자에게 연결 상태 확인을 요청하세요.',
          WB_CLCO_REQUEST_FAILED: '요청을 처리하지 못했습니다. 안전한 오류 코드와 메시지를 확인하고 필요하면 담당자에게 문의하세요.',
          AI_REQUEST_UNVERIFIED: '연결 결과를 확인할 수 없습니다. 계정 연결과 앱 권한을 담당자에게 확인해 달라고 요청하세요.',
        }[code] || '오류 원인을 확인할 수 없습니다. 안전한 오류 코드와 메시지를 담당자에게 전달해 확인을 요청하세요.';
        appendText('p', guidance);
        appendText('p', '다시 점검하려면 「현재 AI 연결 점검」 버튼을 직접 누르세요. 자동으로 재점검하지 않습니다.');
        appendText('p', '요청 실패는 사건 설명의 성공이나 접근 거부 판정이 아닙니다.');
        return root;
      }
      if (status !== 'ok') {
        appendText('p', 'AI 연결 점검 상태를 확인할 수 없습니다. 성공한 점검 결과로 간주하지 마세요.');
        return root;
      }

      if (data?.transportChecked !== true || !['test', 'verified'].includes(data?.audienceAuthorization)) {
        appendText('p', 'AI 연결 점검 결과를 확인할 수 없습니다. 모델 응답이나 사건 설명 성공으로 간주하지 마세요.');
        return root;
      }
      appendText('p', 'AI 통신·모델 목록 점검 응답을 확인했습니다.');
      appendText('p', data.audienceAuthorization === 'test'
        ? '시험 연결 점검(test)'
        : '앱 권한 확인 후 점검(verified)');
      appendText('p', `응답 모델 수(modelCount): ${Number.isInteger(data.modelCount) && data.modelCount >= 0 ? data.modelCount : '확인 불가'}`);
      appendText('p', `점검 시각(checkedAt): ${validTimestamp(checkedAt) ? checkedAt : '확인 불가'}`);
      appendText('p', '이 결과는 연결과 모델 목록 응답만 점검했습니다. 사건 설명은 아직 실행하지 않았습니다.');
      appendText('p', '다시 점검하려면 「현재 AI 연결 점검」 버튼을 직접 누르세요. 자동으로 재점검하지 않습니다.');
      return root;
    },
    renderExplanation({ event, explanation, checkedAt } = {}) {
      const root = document.createElement('section');
      root.className = 'student-view student-info-view';
      root.id = 'student-ai-review-content'; root.tabIndex = -1;
      if (event?.id) appendSharedAction(root, '선택 기록의 AI 설명 요청', null, '해당 기록의 AI 설명 요청 버튼을 사용할 수 없습니다. 기록을 다시 불러와 선택하세요.', () =>
        [...(document.querySelectorAll?.('[data-testid]') || [])].find(node => node.getAttribute('data-testid') === `ai-explain-${event.id}`), {busy: explanation?.status === 'loading', busyLabel: 'AI 설명 요청 중…'});
      else appendSharedAction(root, '보안 기록 선택으로 이동', 'student-records-content', '보안 기록을 먼저 불러오세요.', () => {
        const section = document.getElementById?.('student-records-content');
        return section ? {click: () => {section.focus(); section.scrollIntoView?.({block: 'start'});}} : null;
      });
      const appendText = (parent, tag, text) => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        parent.append(node);
        return node;
      };
      const safeCodes = new Set([
        'ON_AI_PROVISIONING_PENDING', 'MODEL_NOT_CONFIGURED', 'ON_AI_INVALID_INPUT', 'ON_AI_INVALID_OUTPUT',
        'ON_AI_TRANSPORT_PENDING', 'WB_CLCO_AUTH_REQUIRED', 'WB_CLCO_ACCESS_BLOCKED', 'WB_CLCO_SESSION_CLOSED',
        'WB_CLCO_COHORT_BUDGET_EXHAUSTED', 'WB_CLCO_RATE_LIMITED', 'WB_CLCO_LIMIT_REACHED',
        'WB_CLCO_SERVER_UNAVAILABLE', 'WB_CLCO_TIMEOUT', 'WB_CLCO_NETWORK_ERROR', 'WB_CLCO_CANCELLED',
        'WB_CLCO_INVALID_RESPONSE', 'WB_CLCO_REQUEST_FAILED', 'ON_AI_AUTHORIZATION_CHANGED',
        'ON_AI_MODEL_LIST_EMPTY', 'SUBJECT_SCOPE_UNVERIFIED', 'REQUEST_TIMEOUT', 'ENGINE_TIMEOUT', 'TIMEOUT',
        'CANCELLED', 'REQUEST_CANCELLED', 'AI_REQUEST_UNVERIFIED',
      ]);
      const safeCode = (value) => typeof value === 'string' && safeCodes.has(value) ? value : null;
      const secretPattern = /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|secret|token|비밀번호|토큰)["']?\s*[:=]\s*\S+)/i;
      const showFailureCode = (code) => {
        const safe = safeCode(code);
        if (safe) appendText(root, 'p', `오류 코드: ${safe}`);
      };
      const showFailure = (message, code = null) => {
        appendText(root, 'p', message);
        showFailureCode(code);
        appendText(root, 'p', '이 설명은 표시하지 않습니다. 기록은 그대로입니다.');
      };
      const validText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max
        && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) && !secretPattern.test(value);
      const validId = (value) => validText(value, 80) && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(value);

      // 설명 실패는 event 선택 여부와 무관하게 먼저 표시한다.
      if (explanation?.status === 'error') {
        const code = safeCode(explanation.error?.code);
        appendText(root, 'h3', 'AI 설명 실패');
        appendText(root, 'p', `AI 설명 실패: ${aiErrorText(safeCode(explanation.error?.code))}`);
        if (code) appendText(root, 'p', `오류 코드: ${code}`);
        if (code === 'ON_AI_INVALID_INPUT') {
          appendText(root, 'p', '설명에 필요한 근거·규칙 또는 사건 자료가 부족하거나 확인되지 않았습니다.');
        }
        if (code === 'ON_AI_INVALID_OUTPUT') {
          appendText(root, 'p', 'AI 응답이 근거·규칙·조치 계약을 충족하지 않아 사용할 수 없습니다. AI가 이미 실행했다고 답한 설명은 사용할 수 없습니다.');
        }
        appendText(root, 'p', '기록은 그대로입니다. AI 설명 실패가 접속 판정이나 보안 기록을 변경하지 않습니다.');
        return root;
      }

      if (!event) {
        appendText(root, 'h3', 'AI 사건 설명');
        appendText(root, 'p', '보안 기록에서 기록을 먼저 고르세요.');
        appendText(root, 'p', '선택한 기록의 근거와 규칙을 바탕으로 설명·확인 불가 사항·제안을 표시합니다. 연결이 없거나 기록을 받지 못한 경우에는 설명용 사건을 대신 만들지 않습니다.');
        return root;
      }
      if (explanation?.status === 'loading') {
        appendText(root, 'p', '선택한 기록의 AI 설명을 요청하는 중입니다.');
        return root;
      }
      if (explanation?.status === 'idle') {
        appendText(root, 'p', '선택한 기록의 AI 설명 요청 전입니다.');
        return root;
      }
      if (explanation?.status !== 'ok') {
        appendText(root, 'p', 'AI 설명 결과를 확인할 수 없습니다.');
        appendText(root, 'p', '기록은 그대로입니다.');
        return root;
      }

      const data = explanation.data;
      const failForInvalid = (reason, code = explanation.error?.code) => {
        appendText(root, 'h3', 'AI 설명을 사용할 수 없습니다');
        showFailure(reason, code);
        return root;
      };
      if (checkedAt != null && !validTimestamp(checkedAt)) {
        return failForInvalid('AI 설명 확인 시각의 형식이나 실제 날짜가 올바르지 않습니다.', 'ON_AI_INVALID_OUTPUT');
      }
      if (!validId(event.id)) {
        return failForInvalid('선택한 기록의 ID를 확인할 수 없어 설명을 연결할 수 없습니다.');
      }
      if (!data || typeof data !== 'object' || Array.isArray(data) || !validText(data.summary, 1500)) {
        return failForInvalid('AI 요약의 길이·내용을 안전하게 확인할 수 없어 표시하지 않습니다.', 'ON_AI_INVALID_OUTPUT');
      }
      if (data.executed === true) {
        return failForInvalid('AI가 이미 실행했다고 표시한 설명은 사용할 수 없습니다.', 'ON_AI_INVALID_OUTPUT');
      }
      if (data.executed !== false || data.requiresHumanConfirmation !== true) {
        return failForInvalid('사람 확인과 미실행 상태를 확인할 수 없어 설명을 표시하지 않습니다.', 'ON_AI_INVALID_OUTPUT');
      }
      if (!Array.isArray(event.evidence) || event.evidence.length === 0 || event.evidence.length > 20
        || !Array.isArray(data.evidenceIds) || data.evidenceIds.length === 0 || data.evidenceIds.length > 20) {
        return failForInvalid('근거 자료가 부족해 설명을 연결할 수 없습니다.', 'ON_AI_INVALID_INPUT');
      }

      const evidenceById = new Map();
      for (const evidence of event.evidence) {
        if (!evidence || !validId(evidence.id) || !validText(evidence.text, 500) || evidenceById.has(evidence.id)) {
          return failForInvalid('선택한 기록의 근거 자료 형식이 올바르지 않아 설명을 연결할 수 없습니다.');
        }
        evidenceById.set(evidence.id, evidence);
      }
      const citedIds = data.evidenceIds;
      if (citedIds.some((id) => !validId(id)) || new Set(citedIds).size !== citedIds.length
        || citedIds.length !== evidenceById.size || citedIds.some((id) => !evidenceById.has(id))) {
        return failForInvalid('인용한 근거 ID가 선택한 기록의 근거와 일치하지 않아 설명을 표시할 수 없습니다. 내용을 지어내지 않았습니다.');
      }

      if (!Array.isArray(event.rules) || event.rules.length > 20) {
        return failForInvalid('선택한 기록의 규칙 자료를 확인할 수 없어 설명을 표시할 수 없습니다.');
      }
      for (const rule of event.rules) {
        if (!rule || !validId(rule.id) || !validText(rule.text, 300)) {
          return failForInvalid('선택한 기록의 규칙 자료 형식이 올바르지 않아 설명을 표시할 수 없습니다.');
        }
      }
      if (!event.state || typeof event.state !== 'object'
        || !['access', 'session', 'device'].every((key) => typeof event.state[key] === 'string')) {
        return failForInvalid('선택한 기록의 현재 상태를 확인할 수 없어 설명을 표시하지 않습니다.');
      }
      const stateValues = {
        access: ['allowed', 'denied', 'unknown'],
        session: ['active', 'revoked', 'expired', 'unknown'],
        device: ['compliant', 'noncompliant', 'unknown'],
      };
      const verifiedState = Object.fromEntries(Object.entries(stateValues).map(([key, values]) =>
        [key, values.includes(event.state[key]) ? event.state[key] : 'unknown']));
      if (!Array.isArray(event.supportedActions) || !event.supportedActions.every(validId)
        || !Array.isArray(data.proposals) || data.proposals.length > 3) {
        return failForInvalid('제안 자료 또는 연동 시스템의 지원 조치 목록을 확인할 수 없습니다.');
      }

      const proposals = data.proposals;
      const validActionIds = new Set(event.supportedActions);
      for (const proposal of proposals) {
        if (!proposal || typeof proposal !== 'object' || !validId(proposal.action)
          || !validActionIds.has(proposal.action) || !validText(proposal.reason, 500)
          || !Array.isArray(proposal.evidenceIds) || proposal.evidenceIds.length === 0
          || proposal.evidenceIds.some((id) => !validId(id) || !evidenceById.has(id))
          || new Set(proposal.evidenceIds).size !== proposal.evidenceIds.length) {
          return failForInvalid('제안의 조치 또는 근거가 현재 기록과 일치하지 않아 설명을 표시할 수 없습니다.', 'ON_AI_INVALID_OUTPUT');
        }
      }

      // 성공 데이터의 모든 근거 연결을 검증한 뒤에만 성공 표식을 부여한다.
      root.setAttribute('data-student-explanation-event', event.id);
      appendText(root, 'h3', 'AI 설명(참고용)');
      appendText(root, 'p', `사건 ID: ${event.id}`);
      appendText(root, 'p', data.summary);

      appendText(root, 'h4', '인용한 근거');
      const evidenceList = document.createElement('ul');
      for (const id of citedIds) {
        const evidence = evidenceById.get(id);
        appendText(evidenceList, 'li', `${id} — ${evidence.text}`);
      }
      root.append(evidenceList);

      appendText(root, 'h4', '규칙');
      if (event.rules.length === 0) {
        appendText(root, 'p', '규칙이 없습니다.');
      } else {
        const rulesList = document.createElement('ul');
        for (const rule of event.rules) appendText(rulesList, 'li', `${rule.id} — ${rule.text}`);
        root.append(rulesList);
      }

      appendText(root, 'h4', '확인 불가 상태');
      const unknownStates = [
        ['access', '접속'], ['session', '세션'], ['device', '기기'],
      ].filter(([key]) => verifiedState[key] === 'unknown');
      if (unknownStates.length === 0) {
        appendText(root, 'p', '없음');
      } else {
        const stateList = document.createElement('ul');
        for (const [, label] of unknownStates) appendText(stateList, 'li', `${label}: 확인 불가(unknown)`);
        root.append(stateList);
      }

      appendText(root, 'h4', '제안');
      if (proposals.length === 0) {
        if (event.supportedActions.length === 0) {
          appendText(root, 'p', '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).');
        } else {
          appendText(root, 'p', 'AI가 제안한 조치가 없습니다.');
        }
      } else {
        const proposalList = document.createElement('ul');
        for (const proposal of proposals) {
          const item = document.createElement('li');
          appendText(item, 'p', `조치: ${proposal.action}`);
          appendText(item, 'p', `이유: ${proposal.reason}`);
          appendText(item, 'p', `근거 ID: ${proposal.evidenceIds.join(', ')}`);
          appendText(item, 'p', '사람 확인이 필요하며 실행되지 않았습니다. 이 화면은 조치를 실행하지 않습니다.');
          proposalList.append(item);
        }
        root.append(proposalList);
      }
      appendText(root, 'p', 'AI 설명은 참고 정보이며, 설명이나 제안만으로 보안 조치가 실행되지는 않습니다.');
      return root;
    },
    renderAction({ status, event, actionId, target, receipt, observation, message, confirmationExpiresAt, error } = {}) {
      const root = document.createElement('section');
      root.className = 'student-view student-info-view';
      const appendText = (parent, tag, text) => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        parent.append(node);
        return node;
      };
      const secretPattern = /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|secret|token|비밀번호|토큰)["']?\s*[:=]\s*\S+)/i;
      const safeValue = (value) => {
        if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
        if (typeof value !== 'string' || value.length === 0 || value.length > 500
          || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) || secretPattern.test(value)) return null;
        return value;
      };
      const safeCode = (value) => {
        const text = safeValue(value);
        return text && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(text) ? text : null;
      };
      const field = (label, value) => {
        const text = safeValue(value);
        if (text !== null) appendText(root, 'p', `${label}: ${text}`);
      };
      const receivedStatus = safeValue(status) || 'unknown';
      const receiptStatus = safeValue(receipt?.status);
      const eventId = safeValue(event?.id);
      const requestId = safeValue(receipt?.requestId);
      const receiptEventId = safeValue(receipt?.eventId);
      const receiptActionId = safeValue(receipt?.actionId);
      const actionValue = safeValue(actionId);
      // 사건·조치 결속 검사와 진행 상태 검사는 서로 독립적이다.
      // executing 중 영수증이 prepared로 남거나, expired 입력에서 prepared 영수증이 유지돼도
      // 그 상태 차이만으로 현재 진행 상태를 불일치 처리하지 않는다.
      const intentMismatch = (eventId !== null && receiptEventId !== null && eventId !== receiptEventId)
        || (actionValue !== null && receiptActionId !== null && actionValue !== receiptActionId);
      const observedAt = safeValue(observation?.observedAt);
      const validObservationTime = validTimestamp(observedAt);
      const boundReceipt = eventId !== null && requestId !== null && actionValue !== null && safeValue(receipt?.receiptId) !== null
        && eventId === receiptEventId && actionValue === receiptActionId && receiptStatus === 'succeeded';
      const effectConfirmed = receivedStatus === 'succeeded' && boundReceipt && !intentMismatch
        && observation?.effectApplied === true && validObservationTime;
      // 효과 관측이 없는 succeeded는 표시를 시작하기 전에 unknown으로 전환한다.
      const missingEffectEvidence = receivedStatus === 'succeeded' && !effectConfirmed;
      const displayStatus = missingEffectEvidence ? 'unknown' : receivedStatus;
      const expiredPrepared = receivedStatus === 'expired' && receiptStatus === 'prepared';
      const receiptId = safeValue(receipt?.receiptId);

      appendText(root, 'h3', '보안 조치 상태');
      appendSharedAction(root, '조치 결과 다시 조회', 'action-result-load', '조치가 준비·전달된 뒤 원천 결과 조회를 사용할 수 있습니다. 현재 대상과 조치 상태를 먼저 확인하세요.', null, {busy: status === 'loading' || status === 'executing'});
      appendText(root, 'p', '조치의 준비·전달·결과 확인 단계를 표시합니다. 성공은 대상과 사건 ID가 일치하고 실제 효과 근거가 확인된 경우에만 표시합니다.').className = 'student-info-lead';

      if (eventId !== null) field('현재 사건 ID', eventId);
      if (Array.isArray(event?.evidence)) {
        const evidenceIds = event.evidence.map((item) => safeValue(item?.id)).filter((id) => id !== null);
        if (evidenceIds.length > 0) field('현재 사건 근거 ID', evidenceIds.join(', '));
      }
      if (actionValue !== null) field('조치 ID', actionValue);
      if (target && typeof target === 'object') {
        field('실제 대상 ID', target.id);
        field('대상 세대(generation)', target.generation);
      }
      if (receiptEventId !== null) field('영수증 사건 ID', receiptEventId);
      if (receiptActionId !== null) field('영수증 조치 ID', receiptActionId);
      if (requestId !== null) field('요청 ID(requestId)', requestId);
      if (receiptId !== null) field('영수증 ID(receiptId)', receiptId);
      field('영수증 버전(version)', receipt?.version);
      if (confirmationExpiresAt != null) field('사람 확인 기한', confirmationExpiresAt);

      const labels = {
        idle: '아직 미실행(idle)',
        loading: '조치 준비 또는 결과 조회 중(loading)',
        executing: '전달 중·결과 미확인(executing)',
        prepared: '준비됨·미실행(prepared)',
        pending: '접수·처리 중(pending)',
        succeeded: '연동 시스템의 효과 확인(succeeded)',
        denied: '연동 시스템 거절(denied)',
        failed: '연동 시스템 실패(failed)',
        unknown: '결과 불명(unknown)',
        error: '요청 처리 안 됨(error)',
        expired: '기한 지남(expired)',
      };

      if (intentMismatch) {
        appendText(root, 'p', '결과 불명(unknown): 영수증의 사건·조치 ID가 현재 선택과 일치하지 않습니다. 성공이나 효과 없음으로 판단하지 말고 제공 화면에서 결과만 재조회하세요.');
      } else if (missingEffectEvidence) {
        // 원래 상태값 succeeded도 효과 확인처럼 오해될 수 있으므로 이 경로에서는 출력하지 않는다.
        appendText(root, 'p', '결과 불명(unknown): 효과 적용 관측 근거를 확인할 수 없습니다. 제공 화면에서 결과만 재조회하세요.');
      } else {
        appendText(root, 'p', Object.hasOwn(labels, displayStatus) ? labels[displayStatus] : `결과 불명(unknown) · 받은 상태값: ${receivedStatus}`);
        if (displayStatus === 'idle') {
          appendText(root, 'p', '아직 조치가 실행되지 않았습니다. 조치가 지원되지 않는 기록에서는 제공 화면에 조치 준비 버튼이 나오지 않는 것이 정상입니다.');
        } else if (displayStatus === 'loading') {
          appendText(root, 'p', '조치 준비 또는 결과 조회 중입니다. 결과는 아직 확인되지 않았으며 성공이나 효과 없음으로 판단하지 마세요.');
        } else if (displayStatus === 'prepared') {
          appendText(root, 'p', '조치 준비만 완료됐으며 아직 서버에 전달되거나 실행되지 않았습니다. 실제 대상과 확인 기한을 확인한 뒤 제공 화면의 사람 확인 절차를 사용하세요.');
        } else if (displayStatus === 'executing') {
          appendText(root, 'p', '요청을 서버에 전달 중입니다. 처리 결과는 아직 확인되지 않았습니다. 완료·성공 또는 효과 없음으로 판단하지 마세요.');
        } else if (displayStatus === 'pending') {
          appendText(root, 'p', '서버가 요청을 접수해 처리 중입니다. 접수 응답(ACK)은 조치 효과가 아닙니다. 처리 결과는 아직 확인되지 않았으므로 성공이나 효과 없음으로 판단하지 마세요.');
        } else if (displayStatus === 'succeeded' && effectConfirmed) {
          appendText(root, 'p', `관측 시각(observedAt): ${observedAt}`);
          appendText(root, 'p', 'effectApplied: true');
          if (receiptId === null) appendText(root, 'p', '영수증 ID(receiptId): 확인 불가');
        } else if (displayStatus === 'denied' || displayStatus === 'failed') {
          const detail = safeValue(message) ?? safeValue(error?.message);
          if (detail !== null) appendText(root, 'p', `처리 메시지: ${detail}`);
          else appendText(root, 'p', '처리 메시지를 확인할 수 없습니다.');
          if (displayStatus === 'denied') appendText(root, 'p', '연동 시스템의 거절 결과이며 효과 확인이 아닙니다.');
          else appendText(root, 'p', '연동 시스템의 실패 결과이며 효과 확인이 아닙니다.');
        } else if (displayStatus === 'unknown' || !Object.hasOwn(labels, displayStatus)) {
          appendText(root, 'p', '효과가 없다고도 성공했다고도 판단할 수 없습니다. 제공 화면에서 「연동 시스템 결과만 재조회」를 직접 눌러 결과를 확인하세요.');
        } else if (displayStatus === 'error') {
          const code = safeCode(error?.code);
          const detail = safeValue(error?.message) ?? safeValue(message);
          appendText(root, 'p', '요청은 처리되지 않았습니다. 이는 조치 거절이나 효과 없음 판정이 아닙니다.');
          if (code !== null) field('오류 코드', code);
          if (detail !== null) field('오류 메시지', detail);
        } else if (displayStatus === 'expired') {
          if (expiredPrepared) {
            appendText(root, 'p', '기한 지남(expired): 영수증은 준비됨(prepared) 상태로 남아 있지만, 이 조치는 아직 실행되지 않았습니다. 제공 화면에서 다시 준비하세요.');
          } else {
            appendText(root, 'p', '확인 기한이 지났습니다. 이 요청은 집행된 것으로 보지 않습니다. 필요하면 제공 화면에서 조치를 다시 준비하세요.');
          }
        }
      }

      if (!intentMismatch && eventId !== null && requestId !== null) {
        root.setAttribute('data-student-action-event', eventId);
        root.setAttribute('data-student-action-request', requestId);
      }
      appendText(root, 'p', '사람 확인·요청 전달·원천 효과 관측은 서로 다른 단계입니다. 이 학생 표시 영역은 조치 요청을 보내지 않습니다.');
      appendText(root, 'p', '「조치 화면 취소」는 화면의 진행 표시를 닫는 기능이며 이미 서버에 전달된 조치 효과를 되돌리지 않습니다.');
      return root;
    },
  };
}
