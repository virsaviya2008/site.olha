// Аудит мобильной вёрстки: вставить в консоль браузера на нужной ширине экрана.
// Ищет: элементы, вылезающие за экран (не внутри намеренных прокручиваемых лент),
// текст, не помещающийся в кнопки, и кликабельные элементы меньше 44px.
(() => {
  const W = innerWidth;
  const clipsX = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o !== 'visible') return true;
    }
    return false;
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const b = el.getBoundingClientRect();
    return b.width > 0 && b.height > 0;
  };
  const name = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');

  const overflow = [];
  document.querySelectorAll('body *').forEach((el) => {
    if (!visible(el) || el.closest('dialog:not([open])')) return;
    const b = el.getBoundingClientRect();
    if ((b.right > W + 1 || b.left < -1) && !clipsX(el)) overflow.push(`${name(el)} [${Math.round(b.left)}…${Math.round(b.right)}]`);
  });

  const squeezed = [];
  document.querySelectorAll('.btn, .tabs__tab, .filter__btn, .slot, .mobile-bar__btn, .choice').forEach((el) => {
    if (!visible(el)) return;
    if (el.scrollWidth > el.clientWidth + 1) squeezed.push(`${name(el)} «${el.textContent.trim().slice(0, 30)}»`);
  });

  const small = [];
  document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, label.slot, label.choice').forEach((el) => {
    if (!visible(el) || el.closest('.skip-link') || el.closest('dialog:not([open])')) return;
    if (el.matches('input[type=radio], input[type=checkbox], .compare__range')) return; // скрытые нативные, кликается обёртка
    const b = el.getBoundingClientRect();
    const hit = parseFloat(getComputedStyle(el, '::after').height) || 0; // расширенная зона нажатия
    if (hit >= 44 && b.width >= 43.5) return;
    const inline =getComputedStyle(el).display === 'inline' && el.closest('p, dd, li, blockquote');
    if (!inline && (b.height < 43.5 || b.width < 43.5)) small.push(`${name(el)} ${Math.round(b.width)}×${Math.round(b.height)} «${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 25)}»`);
  });

  return {
    width: W,
    pageScroll: document.documentElement.scrollWidth,
    overflow: [...new Set(overflow)].slice(0, 15),
    squeezed: squeezed.slice(0, 15),
    smallTargets: [...new Set(small)].slice(0, 25),
  };
})();
