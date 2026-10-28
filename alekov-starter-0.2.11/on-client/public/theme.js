// 스타일시트보다 먼저 저장한 화면 모드를 복원한다. 저장이 불가능해도 전환은 동작한다.
(() => {
  const storageKey = 'alekov.ui-theme.v1';
  const root = document.documentElement;
  const normalize = value => value === 'light' ? 'light' : 'dark';
  function updateButton() {
    const button = document.getElementById('theme-toggle');
    if (!button) return;
    const dark = root.dataset.theme === 'dark';
    button.textContent = dark ? '기본 모드로' : '다크 모드로';
    button.setAttribute('aria-label', dark ? '현재 다크 모드. 기본 모드로 전환' : '현재 기본 모드. 다크 모드로 전환');
    button.title = dark ? '기본 모드로 전환' : '다크 모드로 전환';
  }
  function apply(value) {
    root.dataset.theme = normalize(value);
    updateButton();
  }
  let saved = null;
  try { saved = localStorage.getItem(storageKey); } catch { /* 저장 차단 시 기본 다크 모드 */ }
  apply(saved);
  function bindButton() {
    const button = document.getElementById('theme-toggle');
    if (!button) return;
    updateButton();
    button.addEventListener('click', () => {
      apply(root.dataset.theme === 'dark' ? 'light' : 'dark');
      try { localStorage.setItem(storageKey, root.dataset.theme); } catch { /* 현재 화면의 선택은 유지 */ }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindButton, {once: true});
  else bindButton();
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) apply(event.newValue);
  });
})();
