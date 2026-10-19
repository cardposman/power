(() => {
  'use strict';
  const input = document.querySelector('[data-region-search]');
  if (!input) return;
  const rows = [...document.querySelectorAll('[data-region-item]')];
  const groups = [...document.querySelectorAll('[data-region-group]')];
  const count = document.querySelector('[data-region-count]');
  const empty = document.querySelector('[data-region-empty]');
  const normalize = (value) => value.replace(/[\s·.,]/g, '').toLowerCase();
  let beforeSearch = null;
  input.addEventListener('input', () => {
    const query = normalize(input.value);
    const terms = input.value.trim().split(/\s+/).map(normalize).filter(Boolean);
    if (query && !beforeSearch) beforeSearch = new Map(groups.map((group) => [group, group.open]));
    let visible = 0;
    rows.forEach((row) => {
      row.hidden = !terms.every((term) => normalize(row.dataset.regionText).includes(term));
      if (!row.hidden) visible += 1;
    });
    groups.forEach((group) => {
      const matches = [...group.querySelectorAll('[data-region-item]')].filter((row) => !row.hidden).length;
      group.hidden = matches === 0;
      group.querySelector('[data-group-count]').textContent = String(matches);
      if (query) group.open = matches > 0;
      else if (beforeSearch) group.open = beforeSearch.get(group);
    });
    if (!query) beforeSearch = null;
    count.textContent = String(visible);
    empty.hidden = visible !== 0;
  });
})();
