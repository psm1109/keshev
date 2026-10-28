// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
// 학생 개선: 제공 PC 조회 API를 요약·시각화한다. 수집·기록은 이 탭의 메모리에만 둔다.
function createPcDashboard(api, onChange) {
  const limit = 60;
  const history = [], records = [];
  let phase = 'idle', current = null, expiryTimer, mountedRoot, renderView;
  let activeDetailsTab = 'indicators';
  let autoRefresh = false, autoTimer = null, pageHidden = false;
  function stopAutoRefresh() {
    clearTimeout(autoTimer); autoTimer = null;
  }
  function scheduleAutoRefresh() {
    stopAutoRefresh();
    if (!autoRefresh || pageHidden || document.hidden || phase === 'loading') return;
    autoTimer = setTimeout(() => {
      autoTimer = null;
      if (autoRefresh && !pageHidden && !document.hidden) void read();
    }, 30000);
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
    const key = node => node.nodeType === 1 ? node.id || node.getAttribute('data-metric') || node.getAttribute('data-indicator') : null;
    children.forEach((child, index) => {
      const existing = target.childNodes[index];
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
  const titles = {cpu: 'CPU', memory: '메모리', disk: '디스크 여유', network: '네트워크 속도'};
  const finite = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  const percent = n => finite(n) && n <= 100;
  const time = value => new Date(value).toLocaleString('ko-KR', {timeZone: 'Asia/Seoul', hour12: false});
  const gb = value => `${(value / 1024 ** 3).toFixed(1)} GB`;
  const reasons = {unsupported: '운영체제 미지원', permission_denied: '읽기 권한 부족', timeout: '조회 시간 초과', cancelled: '조회 취소', query_failed: '조회 실패', invalid_response: '응답 값 확인 불가'};
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
    const metrics = {}, notes = [];
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
          detail = `${gb(m.totalBytes - m.freeBytes)} 사용 / 전체 ${gb(m.totalBytes)}`;
        }
      }
      // 제공 PC API는 구성 개수만 반환한다. 브라우저의 추정 대역폭을 별도 출처로 표시한다.
      let reason = reasons[m?.reason] || '응답 값 확인 불가';
      if (key === 'network') {
        reason = '이 브라우저에서 연결 속도 추정값을 제공하지 않습니다.';
        try {
          const speed = globalThis.navigator?.connection?.downlink;
          if (globalThis.navigator?.onLine === false) reason = '브라우저가 오프라인 상태를 보고했습니다. 연결 속도 확인 불가.';
          else if (finite(speed) && speed > 0) {value = speed; text = `${value.toFixed(2)} Mbps · 다운로드 추정`;}
        } catch { /* 지원하지 않거나 읽기를 차단하면 확인 불가로 남긴다. */ }
      }
      metrics[key] = {value, text, detail, reason};
      if (value === null) notes.push(`${titles[key]}: ${metrics[key].reason}`);
    }
    if (metrics.cpu.value >= 85) notes.push('CPU 사용률 85% 이상: 실행 중인 앱을 확인하세요.');
    if (metrics.memory.value >= 85) notes.push('메모리 사용률 85% 이상: 작업을 저장하고 사용 중인 앱을 확인하세요.');
    if (metrics.disk.value !== null && metrics.disk.value < 10) notes.push('디스크 여유 10% 미만: 파일을 확인하고 백업하세요. 자동 삭제하지 않습니다.');
    return {measuredAt: data.measuredAt, metrics, notes};
  }
  async function read() {
    if (pageHidden || phase === 'loading') return;
    stopAutoRefresh();
    phase = 'loading'; notify();
    try {
      const result = await api?.get('/api/pc/status');
      if (result?.ok !== true) throw Error(result?.error?.code === 'TIMEOUT' ? 'TIMEOUT' : 'REQUEST_FAILED');
      current = normalize(result.data);
      phase = 'ok';
      history.push({at: current.measuredAt, cpu: current.metrics.cpu.value, memory: current.metrics.memory.value, network: current.metrics.network.value});
      const available = Object.values(current.metrics).filter(m => m.value !== null).length;
      records.unshift({at: current.measuredAt, text: `${available === 4 ? '조회 성공' : '부분 결과'} · ${available}/4항목 확인`, notes: current.notes});
      clearTimeout(expiryTimer);
      expiryTimer = setTimeout(notify, Math.max(1, 60001 - (Date.now() - Date.parse(current.measuredAt))));
    } catch (error) {
      phase = 'error';
      const at = new Date().toISOString();
      history.push({at, cpu: null, memory: null, network: null});
      records.unshift({at, text: '조회 실패 · 현재 값 확인 불가', notes: [error?.message === 'TIMEOUT' ? '시간 초과: 서버가 실행 중인지 확인하고 직접 다시 조회하세요.' : '응답이나 연결을 확인하지 못했습니다. 서버 상태를 확인하고 직접 다시 조회하세요.']});
    }
    if (history.length > limit) history.shift();
    if (records.length > limit) records.pop();
    notify();
    scheduleAutoRefresh();
  }
  function chart(key) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    const add = (tag, attrs, text) => {
      const node = document.createElementNS(ns, tag);
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
      if (text) node.textContent = text;
      svg.append(node); return node;
    };
    const rows = history.slice(-12), network = key === 'network';
    // 사용률은 0~100% 고정, 속도는 관측 범위에 맞는 Mbps 눈금을 쓴다.
    const peak = Math.max(0, ...rows.map(row => finite(row[key]) ? row[key] : 0));
    const target = Math.max(1, peak * 1.1), magnitude = 10 ** Math.floor(Math.log10(target));
    const maximum = network ? Math.ceil(target / magnitude) * magnitude : 100;
    const valueLabel = value => network ? `${value.toFixed(2)} Mbps` : `${value.toFixed(1)}%`;
    svg.setAttribute('viewBox', '0 0 360 190'); svg.setAttribute('width', '100%'); svg.setAttribute('height', '190');
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', `${titles[key]} 변화. ${network ? '브라우저 다운로드 추정 속도, 단위 Mbps.' : '실측 사용률, 단위 %.'} 정확한 값은 측정값 기록에서 확인하세요.`);
    add('title', {}, `${titles[key]} 변화`);
    add('desc', {}, `세로축 0~${maximum}${network ? ' Mbps (관측값에 따라 자동 조정, 회선 최대 속도가 아님)' : '%'}, 가로축 실제 조회 시각. 확인하지 못한 구간은 선을 잇지 않습니다.`);
    for (const value of [0, maximum / 2, maximum]) {
      const y = 148 - value / maximum * 132;
      add('line', {x1: 62, y1: y, x2: 348, y2: y, stroke: 'var(--border)'});
      add('text', {x: 0, y: y + 4, fill: 'var(--muted)', 'font-size': 11}, `${value}${network ? ' Mbps' : '%'}`);
    }
    const start = Date.parse(rows[0].at), duration = Date.parse(rows.at(-1).at) - start;
    let points = [];
    const flush = () => {if (points.length > 1) add('polyline', {points: points.join(' '), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.5}); points = [];};
    for (const row of rows) {
      if (!finite(row[key])) {flush(); continue;}
      const x = duration > 0 ? 62 + (Date.parse(row.at) - start) / duration * 286 : 205;
      const y = 148 - row[key] / maximum * 132;
      points.push(`${x},${y}`);
      const point = add('circle', {cx: x, cy: y, r: 3.5, fill: 'var(--accent)'});
      const title = document.createElementNS(ns, 'title'); title.textContent = `${time(row.at)} · ${valueLabel(row[key])}`; point.append(title);
    }
    flush();
    const shortTime = at => new Date(at).toLocaleTimeString('ko-KR', {timeZone: 'Asia/Seoul', hour12: false});
    add('text', {x: 62, y: 178, fill: 'var(--muted)', 'font-size': 11}, shortTime(rows[0].at));
    add('text', {x: 348, y: 178, fill: 'var(--muted)', 'font-size': 11, 'text-anchor': 'end'}, shortTime(rows.at(-1).at));
    return svg;
  }
  function indicatorCards() {
    const cards = make('div', undefined, 'row');
    for (const key of ['cpu', 'memory', 'network']) {
      const card = make('article', undefined, 'card'); card.dataset.indicator = key;
      card.append(make('h4', key === 'network' ? '네트워크 속도 (추정)' : titles[key]));
      const latest = history.at(-1)?.[key], previous = history.at(-2)?.[key];
      const network = key === 'network', digits = network ? 2 : 1;
      card.append(make('p', !history.length ? '첫 조회를 기다리고 있습니다.' : finite(latest) ? `마지막 기록: ${latest.toFixed(digits)}${network ? ' Mbps' : '%'}` : '마지막 기록: 확인 불가', 'item-title'));
      if (finite(latest) && finite(previous)) {
        const change = latest - previous;
        card.append(make('p', `직전 조회 대비 ${change > 0 ? '+' : ''}${change.toFixed(digits)}${network ? ' Mbps' : '%p'}`, 'muted'));
      } else card.append(make('p', network ? '다운로드 속도 · 브라우저 추정' : '사용률 · 전체 100% 기준', 'muted'));
      if (history.slice(-12).some(row => finite(row[key]))) card.append(chart(key));
      else card.append(make('p', network ? '확인 가능한 속도 기록이 없습니다.' : '확인 가능한 측정 기록이 없습니다.', 'muted'));
      if (history.length === 1 && finite(latest)) card.append(make('p', '한 번 더 조회하면 변화가 선으로 이어집니다.', 'muted'));
      cards.append(card);
    }
    return cards;
  }
  function details(stale, loading) {
    const box = make('section', undefined, 'card');
    box.setAttribute('aria-label', 'PC 상세 관측');
    box.append(make('h4', '상세 관측'));
    const tabs = make('div', undefined, 'row');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'PC 상세 정보 선택');
    tabs.setAttribute('aria-orientation', 'horizontal');
    box.append(tabs);
    const entries = [];
    function select(key, focus = false) {
      activeDetailsTab = key;
      for (const {key: entryKey, button, panel} of entries) {
        const selected = entryKey === key;
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
        button.className = selected ? 'btn state-loading' : 'btn';
        panel.hidden = !selected;
        if (selected && focus) button.focus();
      }
    }
    for (const [key, label] of [['indicators', '상태 지표'], ['observations', '주의할 관측'], ['records', '조회 기록']]) {
      const button = make('button', label, 'btn'); button.type = 'button';
      button.id = `pc-details-tab-${key}`;
      button.dataset.pcDetailsTab = key;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', `pc-details-panel-${key}`);
      const panel = make('section', undefined, 'vulnerabilities-result');
      panel.id = `pc-details-panel-${key}`;
      panel.tabIndex = 0;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', button.id);
      button.addEventListener('click', () => select(key));
      button.addEventListener('keydown', event => {
        const index = entries.findIndex(entry => entry.key === key);
        const target = event.key === 'ArrowRight' ? (index + 1) % entries.length
          : event.key === 'ArrowLeft' ? (index + entries.length - 1) % entries.length
          : event.key === 'Home' ? 0 : event.key === 'End' ? entries.length - 1 : -1;
        if (target < 0) return;
        event.preventDefault(); select(entries[target].key, true);
      });
      entries.push({key, button, panel}); tabs.append(button); box.append(panel);
    }
    const [indicators, observations, log] = entries.map(entry => entry.panel);
    if (loading && !current) observations.append(make('p', '상태를 조회하고 있습니다.', 'muted'));
    else if (phase === 'error') observations.append(make('p', '현재 관측을 확인하지 못했습니다. 조회 기록에서 실패 내용을 확인하고 다시 조회하세요.'));
    else if (stale) observations.append(make('p', '마지막 조회값이 오래됐습니다. 현재 관측은 다시 조회하고, 과거 내용은 조회 기록에서 확인하세요.'));
    else if (current?.notes.length) {
      const list = make('ul');
      for (const note of current.notes) list.append(make('li', note));
      observations.append(list);
    } else observations.append(make('p', '이번 조회에서 사용률·디스크 여유 경고 조건에 해당하는 관측이 없습니다.'));
    observations.append(make('p', 'Windows 방화벽·Windows 기록은 제공 「내 PC 상태」에서 별도로 확인합니다. 이 대시보드의 네 항목으로 PC 전체 안전을 판단하지 않습니다.', 'muted'));
    indicators.append(make('p', '상태 조회마다 기록한 최근 12회의 변화입니다. 확인하지 못한 구간은 선을 잇지 않습니다. 새로고침하면 기록이 초기화됩니다.', 'muted'));
    const indicatorStatus = make('p', phase === 'error' || stale ? '그래프는 과거 기록입니다. 현재 상태는 다시 조회해 주세요.' : '첫 측정값을 불러오고 있습니다.', 'muted');
    indicatorStatus.hidden = !(phase === 'error' || stale || (loading && !history.length));
    indicators.append(indicatorStatus);
    indicators.append(indicatorCards());
    if (history.length) {
      const measurements = make('details'); measurements.append(make('summary', '측정값 기록 보기'));
      const table = make('table'); table.append(make('caption', '최근 측정 기록 (한국 시간) · 과거 관측이며 현재 값이 아닙니다.'));
      const head = make('thead'), header = make('tr');
      for (const label of ['조회 시각', 'CPU 사용률', '메모리 사용률', '네트워크 추정 속도']) {const th = make('th', label); th.scope = 'col'; header.append(th);}
      head.append(header); table.append(head);
      const body = make('tbody');
      for (const row of history.slice(-12)) {
        const tr = make('tr'); tr.append(make('td', time(row.at)));
        for (const key of ['cpu', 'memory']) tr.append(make('td', row[key] === null ? '확인 불가' : `${row[key].toFixed(1)}%`));
        tr.append(make('td', finite(row.network) ? `${row.network.toFixed(2)} Mbps` : '확인 불가'));
        body.append(tr);
      }
      table.append(body); measurements.append(table); indicators.append(measurements);
    }
    log.append(make('p', '이 화면에서 조회한 기록을 최신순으로 최대 60회 보관합니다. XDR 경보·침해 판정이 아닙니다. 새로고침하면 기록이 초기화됩니다.', 'muted'));
    if (!records.length) log.append(make('p', '아직 조회 기록이 없습니다.'));
    const list = make('ol', undefined, 'records');
    for (const row of records) {
      const item = make('li', undefined, 'event'); item.append(make('p', `${time(row.at)} (한국 시간) · ${row.text}`, 'item-title'));
      for (const note of row.notes) item.append(make('p', note));
      list.append(item);
    }
    log.append(list); select(activeDetailsTab);
    return box;
  }
  // SVG 표시 속성을 써서 제공 화면의 CSP와 색 테마를 그대로 따른다.
  function bar(label, value) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    for (const [key, attr] of Object.entries({viewBox: '0 0 320 12', width: '100%', height: 12,
      preserveAspectRatio: 'none', role: 'meter', 'aria-label': label,
      'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': value, 'aria-valuetext': `${value.toFixed(1)}% 사용`})) {
      svg.setAttribute(key, String(attr));
    }
    for (const [width, fill] of [[320, 'var(--accent-soft)'], [3.2 * value, 'var(--accent)']]) {
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
  return renderView = function render() {
    const root = make('section', undefined, 'card'); root.dataset.studentDashboard = '';
    root.setAttribute('aria-label', '케셰브 관제 대시보드 · 학생 개선');
    mountedRoot = root;
    root.append(make('h3', '케셰브 관제 대시보드'));
    root.append(make('p', '서버를 다른 기기에서 실행하면 사용자 PC의 실측값이 아닙니다. 네트워크 추정값은 실제 송수신 사용량·최대 회선 속도와 다를 수 있습니다.', 'muted'));
    const loading = phase === 'idle' || phase === 'loading';
    const controls = make('div', undefined, 'row');
    const refresh = make('button', loading ? current ? '갱신 중…' : '실측 조회 중…' : '상태 조회·기록', 'btn'); refresh.type = 'button';
    refresh.disabled = loading; refresh.addEventListener('click', read); controls.append(refresh);
    const autoLabel = make('label', undefined, 'btn');
    autoLabel.title = '화면이 보이는 동안 조회가 끝난 뒤 30초마다 다시 측정합니다.';
    const auto = make('input'); auto.type = 'checkbox'; auto.checked = autoRefresh;
    auto.dataset.pcAutoRefresh = '';
    auto.addEventListener('change', () => {
      autoRefresh = auto.checked; stopAutoRefresh();
      if (autoRefresh && !document.hidden && !pageHidden && phase !== 'loading') void read();
      else {notify(); scheduleAutoRefresh();}
    });
    autoLabel.append(auto, make('span', ' 30초마다 자동 조회')); controls.append(autoLabel); root.append(controls);
    const stale = current && Date.now() - Date.parse(current.measuredAt) > 60000;
    const autoStatus = autoRefresh ? document.hidden || pageHidden ? '화면 숨김 · 자동 조회 일시 중지' : '30초마다 자동 조회 중'
      : '마지막 조회 결과이며 실시간 감시는 아닙니다.';
    const status = make('p', current
      ? `${phase === 'error' ? '갱신 실패 · 마지막 측정값 유지. 조회 기록을 확인하세요. · ' : ''}마지막 측정: ${time(current.measuredAt)} (한국 시간) · ${stale ? '오래된 기록 · ' : ''}${autoStatus}`
      : phase === 'error' ? `조회 실패 · 현재 값 확인 불가. 조회 기록 탭을 확인하세요. ${autoRefresh ? autoStatus : '다시 조회하세요.'}`
      : '첫 측정값을 불러오고 있습니다.');
    status.setAttribute('role', 'status'); root.append(status);
    const cards = make('div', undefined, 'grid-2');
    // 제공 2열 배치를 중첩해 PC에서는 네 카드를 한 행에 표시한다.
    for (const pair of [['cpu', 'memory'], ['disk', 'network']]) {
      const group = make('div', undefined, 'grid-2');
      for (const key of pair) {
        const card = make('article', undefined, 'card'); card.dataset.metric = key;
        const metric = current?.metrics[key], usable = Boolean(current);
        card.append(make('h4', titles[key]));
        if (!usable || metric.value === null || key === 'network') {
          card.append(make('p', usable ? metric.text : loading ? '조회 중' : stale ? '오래된 값 · 재조회 필요' : '확인 불가'));
        }
        if (usable && metric.value !== null && key !== 'network') {
          const used = key === 'disk' ? 100 - metric.value : metric.value;
          card.append(make('p', `사용 ${used.toFixed(1)}% / 전체 100%`, 'muted'), bar(`${key === 'disk' ? '디스크' : titles[key]} 사용률`, used));
          if (metric.detail) card.append(make('p', metric.detail, 'muted'));
        }
        if (usable && metric.value === null) card.append(make('p', metric.reason, 'muted'));
        if (key === 'network') card.append(make('p', '출처: 브라우저 연결 정보 · 다운로드 대역폭 추정값. 업로드 속도는 제공되지 않습니다.', 'muted'));
        group.append(card);
      }
      cards.append(group);
    }
    root.append(cards);
    root.append(details(stale, loading));
    return root;
  };
}

export function createStudentView({ api, onChange = () => {} } = {}) {
  const renderPcDashboard = createPcDashboard(api, onChange);
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
      root.append(renderPcDashboard());
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
    renderVulnerabilities({ status, mode, data, error } = {}) {
      const root = document.createElement('section');
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
      if (status === 'idle') {
        appendText(root, 'p', '조회 전');
        return root;
      }
      if (status === 'loading') {
        appendText(root, 'p', '조회 중');
        return root;
      }
      if (status === 'error') {
        appendText(root, 'p', `조회 실패: ${valueText(error?.message, '오류 메시지를 확인할 수 없습니다.')}`);
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
      const appendText = (tag, text) => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        root.append(node);
        return node;
      };
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
      const secretPattern = /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|비밀번호|토큰)\s*[:=]\s*\S+)/i;
      const safeMessage = (value) => typeof value === 'string' && value.length > 0 && value.length <= 500
        && !/[\u0000-\u0008\u000b\u000c\u000e\u001f]/.test(value) && !secretPattern.test(value)
        ? value : '안전하게 표시할 수 있는 오류 메시지가 없습니다.';
      const modeLabels = {
        demo: '예제 자료(demo) · 실제 연결 결과가 아닙니다.',
        disconnected: '연결 없음(disconnected)',
        unknown: '연결 상태 확인 불가(unknown)',
      };
      if (modeLabels[mode]) appendText('p', modeLabels[mode]);

      if (status === 'idle') {
        appendText('p', 'AI 연결 점검 전');
        appendText('p', '다시 점검하려면 「현재 API 연결 점검」 버튼을 직접 누르세요. 자동으로 점검하지 않습니다.');
        return root;
      }
      if (status === 'loading') {
        appendText('p', 'AI 연결 점검 중');
        appendText('p', '점검 중 취소할 수 있으며, 다시 점검은 사용자가 버튼을 직접 눌러야 합니다. 자동 재점검은 하지 않습니다.');
        return root;
      }
      if (status === 'error') {
        const code = safeCode(error?.code);
        appendText('p', `AI 연결 점검 실패 (${code}): ${safeMessage(error?.message)}`);
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
        appendText('p', '다시 점검하려면 「현재 API 연결 점검」 버튼을 직접 누르세요. 자동으로 재점검하지 않습니다.');
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
      appendText('p', data.audienceAuthorization === 'test'
        ? '시험 연결 점검(test)'
        : '앱 권한 확인 후 점검(verified)');
      appendText('p', `응답 모델 수(modelCount): ${Number.isInteger(data.modelCount) && data.modelCount >= 0 ? data.modelCount : '확인 불가'}`);
      appendText('p', `점검 시각(checkedAt): ${typeof checkedAt === 'string' && checkedAt ? checkedAt : '확인 불가'}`);
      appendText('p', '이 결과는 연결과 모델 목록 응답만 점검했습니다. 사건 설명은 아직 실행하지 않았습니다.');
      appendText('p', '다시 점검하려면 「현재 API 연결 점검」 버튼을 직접 누르세요. 자동으로 재점검하지 않습니다.');
      return root;
    },
    renderExplanation({ event, explanation, checkedAt } = {}) {
      const root = document.createElement('section');
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
      const secretPattern = /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|비밀번호|토큰)\s*[:=]\s*\S+)/i;
      const safeMessage = (value) => typeof value === 'string' && value.length > 0 && value.length <= 500
        && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) && !secretPattern.test(value)
        ? value : '안전하게 표시할 수 있는 오류 메시지가 없습니다.';
      const showFailureCode = (code) => {
        const safe = safeCode(code);
        if (safe) appendText(root, 'p', `오류 코드: ${safe}`);
      };
      const showFailure = (message, code = null) => {
        appendText(root, 'p', message);
        showFailureCode(code);
        appendText(root, 'p', '이 설명은 표시하지 않습니다. 기록은 그대로입니다.');
      };
      const validId = (value) => typeof value === 'string' && value.length > 0;

      // 설명 실패는 event 선택 여부와 무관하게 먼저 표시한다.
      if (explanation?.status === 'error') {
        const code = safeCode(explanation.error?.code);
        appendText(root, 'h3', 'AI 설명 실패');
        appendText(root, 'p', `AI 설명 실패: ${safeMessage(explanation.error?.message)}`);
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
        appendText(root, 'p', '보안 기록에서 기록을 먼저 고르세요.');
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
      if (!validId(event.id)) {
        return failForInvalid('선택한 기록의 ID를 확인할 수 없어 설명을 연결할 수 없습니다.');
      }
      if (!data || typeof data !== 'object' || typeof data.summary !== 'string' || data.summary.length === 0) {
        return failForInvalid('AI 요약 자료를 확인할 수 없습니다.');
      }
      if (data.executed === true) {
        return failForInvalid('AI가 이미 실행했다고 표시한 설명은 사용할 수 없습니다.', 'ON_AI_INVALID_OUTPUT');
      }
      if (data.executed !== false || data.requiresHumanConfirmation !== true) {
        return failForInvalid('사람 확인과 미실행 상태를 확인할 수 없어 설명을 표시하지 않습니다.', 'ON_AI_INVALID_OUTPUT');
      }
      if (!Array.isArray(event.evidence) || !Array.isArray(data.evidenceIds) || data.evidenceIds.length === 0) {
        return failForInvalid('근거 자료가 부족해 설명을 연결할 수 없습니다.', 'ON_AI_INVALID_INPUT');
      }

      const evidenceById = new Map();
      for (const evidence of event.evidence) {
        if (!evidence || !validId(evidence.id) || typeof evidence.text !== 'string' || evidenceById.has(evidence.id)) {
          return failForInvalid('선택한 기록의 근거 자료 형식이 올바르지 않아 설명을 연결할 수 없습니다.');
        }
        evidenceById.set(evidence.id, evidence);
      }
      const citedIds = data.evidenceIds;
      if (citedIds.some((id) => !validId(id)) || new Set(citedIds).size !== citedIds.length
        || citedIds.length !== evidenceById.size || citedIds.some((id) => !evidenceById.has(id))) {
        return failForInvalid('인용한 근거 ID가 선택한 기록의 근거와 일치하지 않아 설명을 표시할 수 없습니다. 내용을 지어내지 않았습니다.');
      }

      if (!Array.isArray(event.rules)) {
        return failForInvalid('선택한 기록의 규칙 자료를 확인할 수 없어 설명을 표시할 수 없습니다.');
      }
      for (const rule of event.rules) {
        if (!rule || !validId(rule.id) || typeof rule.text !== 'string') {
          return failForInvalid('선택한 기록의 규칙 자료 형식이 올바르지 않아 설명을 표시할 수 없습니다.');
        }
      }
      if (!event.state || typeof event.state !== 'object'
        || !['access', 'session', 'device'].every((key) => typeof event.state[key] === 'string')) {
        return failForInvalid('선택한 기록의 현재 상태를 확인할 수 없어 설명을 표시하지 않습니다.');
      }
      if (!Array.isArray(event.supportedActions) || !Array.isArray(data.proposals)) {
        return failForInvalid('제안 자료 또는 연동 시스템의 지원 조치 목록을 확인할 수 없습니다.');
      }

      const proposals = data.proposals;
      const validActionIds = new Set(event.supportedActions);
      for (const proposal of proposals) {
        if (!proposal || typeof proposal !== 'object' || !validId(proposal.action)
          || !validActionIds.has(proposal.action) || typeof proposal.reason !== 'string'
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
      ].filter(([key]) => event.state[key] === 'unknown');
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
      const appendText = (parent, tag, text) => {
        const node = document.createElement(tag);
        node.textContent = String(text);
        parent.append(node);
        return node;
      };
      const secretPattern = /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|secret|token|비밀번호|토큰)\s*[:=]\s*\S+)/i;
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
      const effectConfirmed = receivedStatus === 'succeeded' && observation?.effectApplied === true;
      // 효과 관측이 없는 succeeded는 표시를 시작하기 전에 unknown으로 전환한다.
      const missingEffectEvidence = receivedStatus === 'succeeded' && !effectConfirmed;
      const displayStatus = missingEffectEvidence ? 'unknown' : receivedStatus;
      const expiredPrepared = receivedStatus === 'expired' && receiptStatus === 'prepared';
      const receiptId = safeValue(receipt?.receiptId);

      appendText(root, 'h3', '보안 조치 상태');

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
        succeeded: '효과 확인(succeeded)',
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
        appendText(root, 'p', labels[displayStatus] || `결과 불명(unknown) · 받은 상태값: ${receivedStatus}`);
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
          appendText(root, 'p', '연동 시스템의 효과 확인(succeeded)');
          const observedAt = safeValue(observation.observedAt);
          appendText(root, 'p', `관측 시각(observedAt): ${observedAt ?? '확인 불가'}`);
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
