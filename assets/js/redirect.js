(() => {
  'use strict';
  const link = document.querySelector('[data-redirect-target]');
  if (!link) return;
  const target = new URL(link.getAttribute('href'), location.href);
  if (location.protocol !== 'file:') target.pathname = target.pathname.replace(/index\.html$/, '');
  target.search = location.search;
  target.hash = location.hash;
  location.replace(target.href);
})();
