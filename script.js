/* =========================================================
   Салон «Ольха» — скрипты (vanilla JS, без зависимостей)
   ========================================================= */
(() => {
  'use strict';

  /* ---------- Настройки ---------- */
  const CONFIG = {
    metrikaId: null,            // номер счётчика Яндекс Метрики, например 12345678
    endpoint: null,             // URL обработчика заявок (POST JSON). null — демо-режим без отправки
    useCrmWidget: false,        // true — вместо своей формы показывается виджет YCLIENTS / DIKIDI / Altegio из #crm-widget
    salonName: 'Салон красоты «Ольха»',
    address: 'Москва, ул. Новослободская, 14, 2 этаж',
    phone: '+7 495 123-45-67',
    utcOffset: 3,               // Москва, UTC+3
    open: 10 * 60,              // 10:00 в минутах
    close: 21 * 60,             // 21:00
    slotStep: 30,               // шаг сетки времени, мин
    daysAhead: 14,
  };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Аналитика ---------- */
  function reachGoal(goal, params) {
    if (!goal) return;
    if (CONFIG.metrikaId && typeof window.ym === 'function') {
      window.ym(CONFIG.metrikaId, 'reachGoal', goal, params);
    }
    if (location.hostname === 'localhost' || location.protocol === 'file:') {
      console.info('[goal]', goal, params || '');
    }
  }
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-goal]');
    if (el) reachGoal(el.dataset.goal);
  });

  /* ---------- Шапка ---------- */
  const header = $('#header');
  const parallaxEls = reduceMotion ? [] : $$('[data-parallax]');
  let ticking = false;
  function onScrollFrame() {
    ticking = false;
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    header.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : 0);
    // Параллакс: сдвиг пропорционален расстоянию элемента от центра экрана
    const vh = window.innerHeight;
    parallaxEls.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const offset = (r.top + r.height / 2 - vh / 2) * Number(el.dataset.parallax);
      el.style.translate = `0 ${offset.toFixed(1)}px`;
    });
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScrollFrame); } };
  onScrollFrame();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  /* ---------- Мобильное меню ---------- */
  const burger = $('.burger');
  const nav = $('#nav');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    // меню начинается сразу под шапкой (над шапкой может быть полоса «Демо-проект»)
    if (open) nav.style.top = Math.max(0, header.getBoundingClientRect().bottom) + 'px';
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    if (open) $('.nav__link', nav).focus();
  }
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); burger.focus(); }
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (m) => { if (m.matches) setMenu(false); });

  /* ---------- Активный пункт меню ---------- */
  const navLinks = $$('.nav__link');
  const sectionToLink = { services: '#services', masters: '#masters', reviews: '#reviews', contacts: '#contacts' };
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const href = sectionToLink[entry.target.id];
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === href));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section[id]').forEach((s) => spy.observe(s));

  /* ---------- Заголовки: разбивка на слова ---------- */
  // Неразрывные пробелы (&nbsp;) сохраняются — такие слова анимируются вместе
  function splitWords(el) {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/([ \t\n\r]+)/).forEach((part) => {
            if (!part) return;
            if (/^[ \t\n\r]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const inner = document.createElement('span');
            inner.textContent = part;
            inner.style.setProperty('--i', i++);
            w.appendChild(inner);
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    };
    walk(el);
  }
  $$('[data-split]').forEach(splitWords);

  /* ---------- Счётчики ---------- */
  function countUp(el) {
    const target = Number(el.dataset.count);
    const fmt = (n) => n.toLocaleString('ru-RU').replace(/\s/g, ' ');
    if (reduceMotion) { el.textContent = fmt(target); return; }
    const t0 = performance.now();
    const dur = 1600;
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Появление при скролле ---------- */
  // Соседние элементы появляются «лесенкой»
  $$('.reveal').forEach((el) => {
    const sibs = Array.from(el.parentElement.children).filter((c) => c.classList.contains('reveal'));
    const idx = sibs.indexOf(el);
    if (idx > 0) el.style.transitionDelay = `${Math.min(idx, 5) * 70}ms`;
  });
  const revealTargets = $$('.reveal, .reveal-img, [data-split]:not(.hero__title), [data-count]');
  const show = (el) => {
    if (el.matches('[data-split]')) el.classList.add('is-split-visible');
    else if (el.matches('[data-count]')) countUp(el);
    else el.classList.add('is-visible');
  };
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { show(entry.target); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach(show);
  }
  // Заголовок первого экрана — сразу после загрузки шрифтов (чтобы слова не прыгали)
  const heroTitle = $('.hero__title');
  const showHero = () => requestAnimationFrame(() => heroTitle.classList.add('is-split-visible'));
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 600))]).then(showHero);
  } else {
    showHero();
  }

  /* ---------- Табы прайса ---------- */
  $$('[data-tabs]').forEach((root) => {
    const tabs = $$('[role="tab"]', root);
    const list = $('[role="tablist"]', root);
    const indicator = $('.tabs__indicator', root);
    const moveIndicator = () => {
      const t = tabs.find((x) => x.getAttribute('aria-selected') === 'true');
      if (!indicator || !t) return;
      indicator.style.setProperty('--x', t.offsetLeft + 'px');
      indicator.style.setProperty('--y', t.offsetTop + 'px');
      indicator.style.setProperty('--w', t.offsetWidth + 'px');
      indicator.style.setProperty('--h', t.offsetHeight + 'px');
      list.classList.add('is-ready');
    };
    moveIndicator();
    window.addEventListener('resize', moveIndicator);
    if (document.fonts) document.fonts.ready.then(moveIndicator);
    // Номер строки — для поочерёдного появления при смене таба
    $$('.tabs__panel', root).forEach((p) => $$('.price-row', p).forEach((r, i) => r.style.setProperty('--i', i)));

    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        $('#' + t.getAttribute('aria-controls')).hidden = !on;
      });
      moveIndicator();
      if (focus) tab.focus();
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (e) => {
        const map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
        if (!(e.key in map)) return;
        e.preventDefault();
        select(tabs[(map[e.key] + tabs.length) % tabs.length], true);
      });
    });
  });

  /* =========================================================
     Данные для записи — берутся из разметки прайса и мастеров
     ========================================================= */
  const CATEGORY_LABELS = {};
  $$('[role="tab"]').forEach((t) => {
    const panel = $('#' + t.getAttribute('aria-controls'));
    CATEGORY_LABELS[panel.dataset.category] = t.textContent.trim();
  });

  const SERVICES = $$('.price-row').map((row, i) => {
    const prices = $$('.price-row__price', row);
    return {
      id: 's' + i,
      name: row.dataset.service,
      category: row.closest('[data-category]').dataset.category,
      duration: Number(row.dataset.duration) || 60,
      timeLabel: $('.price-row__time', row).textContent.trim(),
      price: { 'Мастер': prices[0]?.textContent.trim(), 'Топ-мастер': prices[1]?.textContent.trim() },
      row,
    };
  });

  const MASTERS = $$('.master').map((card, i) => ({
    id: 'm' + i,
    name: card.dataset.master,
    level: card.dataset.level,
    categories: card.dataset.categories.split(/\s+/),
    spec: $('.master__spec', card).textContent.trim(),
    title: $('.master__level', card).textContent.trim(), // подпись из карточки: «Топ-мастер», «Врач-косметолог»
    card,
  }));

  /* =========================================================
     Онлайн-запись
     ========================================================= */
  const form = $('#booking-form');
  const successBox = $('#booking-success');
  const bookingSection = $('#booking');
  const serviceSelect = $('#f-service');
  const masterBox = $('#master-options');
  const dateBox = $('#date-options');
  const timeBox = $('#time-options');
  const phoneInput = $('#f-phone');
  const nameInput = $('#f-name');
  const consentInput = $('#f-consent');

  const state = { step: 1, serviceId: '', masterId: 'any', presetMaster: null, date: '', time: '' };

  if (CONFIG.useCrmWidget) {
    form.hidden = true;
    $('#crm-widget').hidden = false;
  }

  /* --- Шаг 1: список услуг --- */
  function renderServiceOptions() {
    const allowed = state.presetMaster ? MASTERS.find((m) => m.id === state.presetMaster).categories : null;
    serviceSelect.innerHTML = '<option value="">Выберите из списка</option>';
    Object.keys(CATEGORY_LABELS).forEach((cat) => {
      if (allowed && !allowed.includes(cat)) return;
      const group = document.createElement('optgroup');
      group.label = CATEGORY_LABELS[cat];
      SERVICES.filter((s) => s.category === cat).forEach((s) => {
        const o = new Option(`${s.name} — ${s.price['Мастер']}`, s.id);
        group.appendChild(o);
      });
      serviceSelect.appendChild(group);
    });
    if (state.serviceId && serviceSelect.querySelector(`option[value="${state.serviceId}"]`)) {
      serviceSelect.value = state.serviceId;
    } else {
      state.serviceId = '';
    }
    renderServiceHint();
  }

  function renderServiceHint() {
    const hint = $('#service-summary');
    const s = getService();
    const m = state.presetMaster && MASTERS.find((x) => x.id === state.presetMaster);
    const parts = [];
    if (s) parts.push(`Длительность: ${s.timeLabel}. Стоимость: ${s.price['Мастер']}${s.price['Топ-мастер'] && s.price['Топ-мастер'] !== '—' ? ` / у топ-мастера ${s.price['Топ-мастер']}` : ''}.`);
    hint.textContent = parts.join(' ');
    if (m) {
      const p = document.createElement('span');
      p.innerHTML = `${parts.length ? ' ' : ''}Мастер: <strong></strong>. `;
      p.querySelector('strong').textContent = m.name;
      const reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'btn btn--text';
      reset.style.minHeight = '32px';
      reset.textContent = 'Показать все услуги';
      reset.addEventListener('click', () => { state.presetMaster = null; state.masterId = 'any'; renderServiceOptions(); serviceSelect.focus(); });
      hint.append(p, reset);
    }
  }

  const getService = () => SERVICES.find((s) => s.id === state.serviceId);
  const getMaster = () => MASTERS.find((m) => m.id === state.masterId);

  serviceSelect.addEventListener('change', () => {
    state.serviceId = serviceSelect.value;
    clearError(serviceSelect, '#f-service-error');
    renderServiceHint();
  });

  /* --- Шаг 2: мастера --- */
  function renderMasters() {
    const s = getService();
    const list = MASTERS.filter((m) => !s || m.categories.includes(s.category));
    if (state.masterId !== 'any' && !list.some((m) => m.id === state.masterId)) state.masterId = 'any';

    masterBox.innerHTML = '';
    const make = (id, title, sub, avatar) => {
      const label = document.createElement('label');
      label.className = 'choice';
      label.innerHTML = `
        <input type="radio" name="master" value="${id}">
        <span class="choice__avatar" aria-hidden="true"></span>
        <span class="choice__text"><span class="choice__title"></span><span class="choice__sub"></span></span>
        <svg class="icon choice__check" aria-hidden="true"><use href="#i-check"/></svg>`;
      label.querySelector('.choice__avatar').textContent = avatar;
      label.querySelector('.choice__title').textContent = title;
      label.querySelector('.choice__sub').textContent = sub;
      const input = label.querySelector('input');
      input.checked = state.masterId === id;
      input.addEventListener('change', () => { state.masterId = id; state.time = ''; });
      masterBox.appendChild(label);
    };
    make('any', 'Любой свободный мастер', 'Подберём ближайшее время', '·');
    list.forEach((m) => {
      const price = s ? ` · ${s.price[m.level] || s.price['Мастер']}` : '';
      make(m.id, m.name, `${m.title}, ${m.spec.split('·')[1]?.trim() || ''}${price}`, m.name[0]);
    });
  }

  /* --- Шаг 3: дата и время --- */
  const DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fmtTime = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
  const fmtDateLong = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return `${d} ${MONTHS[m - 1]}, ${DOW[date.getDay()]}`;
  };

  // Демо-занятость. При подключении CRM замените на запрос свободных слотов из API.
  function isBusy(dateIso, min) {
    const key = `${dateIso}|${min}|${state.masterId}`;
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return h % 100 < (state.masterId === 'any' ? 15 : 35);
  }

  function renderDates() {
    dateBox.innerHTML = '';
    const today = new Date();
    for (let i = 0; i < CONFIG.daysAhead; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const iso = isoDate(d);
      const label = document.createElement('label');
      label.className = 'slot slot--date';
      const dow = DOW[d.getDay()];
      label.innerHTML = `<input type="radio" name="date" value="${iso}"><span class="slot__dow">${dow}</span><span class="slot__day">${d.getDate()}</span>`;
      label.setAttribute('aria-label', fmtDateLong(iso));
      const input = label.querySelector('input');
      if (!state.date) state.date = iso;
      input.checked = state.date === iso;
      input.addEventListener('change', () => { state.date = iso; state.time = ''; renderTimes(); });
      dateBox.appendChild(label);
    }
    renderTimes();
  }

  function renderTimes() {
    timeBox.innerHTML = '';
    const s = getService();
    const dur = s ? s.duration : 60;
    const now = new Date();
    const isToday = state.date === isoDate(now);
    const nowMin = now.getHours() * 60 + now.getMinutes() + 60; // не раньше чем через час
    let free = 0;
    for (let t = CONFIG.open; t + Math.min(dur, 120) <= CONFIG.close; t += CONFIG.slotStep) {
      const disabled = (isToday && t < nowMin) || isBusy(state.date, t);
      const label = document.createElement('label');
      label.className = 'slot';
      label.innerHTML = `<input type="radio" name="time" value="${fmtTime(t)}" ${disabled ? 'disabled' : ''}><span>${fmtTime(t)}</span>`;
      const input = label.querySelector('input');
      input.checked = state.time === fmtTime(t) && !disabled;
      input.addEventListener('change', () => { state.time = fmtTime(t); clearError(null, '#f-time-error'); });
      if (!disabled) free++;
      timeBox.appendChild(label);
    }
    if (!free) {
      timeBox.innerHTML = '<p class="step__hint">На эту дату свободного времени нет — выберите другой день или «Любой свободный мастер».</p>';
    }
  }

  /* --- Шаг 4: телефон --- */
  // 10 цифр номера без кода страны. Понимает любой привычный ввод:
  // «916…», «8 916…», «+7 916…», а также «8…» или «+7…», набранные поверх подставленного «+7 »
  function phoneCore(value) {
    let d = value.replace(/\D/g, '');
    if (value.trim().startsWith('+7')) d = d.slice(1);            // «+7» из маски
    else if (d.length === 11 && /^[78]/.test(d)) d = d.slice(1);  // вставили «8916…» / «7916…»
    if (d.length > 10 && /^[78]/.test(d)) d = d.slice(1);         // повторный код страны
    return d.slice(0, 10);
  }
  function formatPhone(value) {
    const d = phoneCore(value);
    let out = '+7';
    if (d.length) out += ' (' + d.slice(0, 3);
    if (d.length >= 3) out += ')';
    if (d.length > 3) out += ' ' + d.slice(3, 6);
    if (d.length > 6) out += '-' + d.slice(6, 8);
    if (d.length > 8) out += '-' + d.slice(8, 10);
    return out;
  }
  const phoneDigits = () => phoneCore(phoneInput.value);
  phoneInput.addEventListener('focus', () => { if (!phoneInput.value) phoneInput.value = '+7 '; });
  phoneInput.addEventListener('blur', () => { if (phoneInput.value.replace(/\D/g, '') === '7') phoneInput.value = ''; });
  phoneInput.addEventListener('input', (e) => {
    if (e.inputType && e.inputType.startsWith('delete') && /\D$/.test(phoneInput.value)) return; // даём стирать скобки/дефисы
    phoneInput.value = formatPhone(phoneInput.value);
    if (phoneInput.getAttribute('aria-invalid') === 'true' && phoneDigits().length === 10) clearError(phoneInput, '#f-phone-error');
  });
  nameInput.addEventListener('input', () => { if (nameInput.value.trim().length >= 2) clearError(nameInput, '#f-name-error'); });
  consentInput.addEventListener('change', () => { if (consentInput.checked) clearError(consentInput, '#f-consent-error'); });

  const plural = (n, [one, few, many]) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };

  /* --- Ошибки --- */
  function setError(input, selector, text) {
    const el = $(selector);
    el.textContent = text;
    if (input) input.setAttribute('aria-invalid', 'true');
  }
  function clearError(input, selector) {
    $(selector).textContent = '';
    if (input) input.removeAttribute('aria-invalid');
  }

  function validateStep(step) {
    if (step === 1 && !state.serviceId) {
      setError(serviceSelect, '#f-service-error', 'Выберите услугу, чтобы продолжить');
      serviceSelect.focus();
      return false;
    }
    if (step === 3 && !state.time) {
      setError(null, '#f-time-error', 'Выберите время визита');
      ($('input:not(:disabled)', timeBox) || dateBox.querySelector('input')).focus();
      return false;
    }
    if (step === 4) {
      let first = null;
      if (nameInput.value.trim().length < 2) { setError(nameInput, '#f-name-error', 'Укажите имя — так мастер будет к вам обращаться'); first = first || nameInput; }
      const digits = phoneDigits();
      if (!digits.length) { setError(phoneInput, '#f-phone-error', 'Укажите телефон, чтобы мы подтвердили запись'); first = first || phoneInput; }
      else if (digits.length < 10) { setError(phoneInput, '#f-phone-error', `В номере не хватает ${10 - digits.length} ${plural(10 - digits.length, ['цифры', 'цифр', 'цифр'])}`); first = first || phoneInput; }
      // В зоне +7 номера начинаются с 3–9 (9 — мобильные, 3/4/8 — городские, 7 — Казахстан)
      else if (!/^[3-9]/.test(digits)) { setError(phoneInput, '#f-phone-error', 'Номер после +7 не может начинаться с 0, 1 или 2'); first = first || phoneInput; }
      if (!consentInput.checked) { setError(consentInput, '#f-consent-error', 'Без согласия мы не сможем принять запись'); first = first || consentInput; }
      if (first) { first.focus(); return false; }
    }
    return true;
  }

  /* --- Навигация по шагам --- */
  function goTo(step, focus = true) {
    state.step = step;
    if (step === 2) renderMasters();
    if (step === 3) renderDates();
    if (step === 4) renderSummary();
    $$('.step', form).forEach((fs) => fs.classList.toggle('is-active', Number(fs.dataset.step) === step));
    $$('[data-step-indicator]', form).forEach((li) => {
      const n = Number(li.dataset.stepIndicator);
      li.classList.toggle('is-current', n === step);
      li.classList.toggle('is-done', n < step);
      if (n === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    if (focus) {
      const legend = $(`.step[data-step="${step}"] .step__title`, form);
      legend.tabIndex = -1;
      legend.focus({ preventScroll: true });
    }
  }

  form.addEventListener('click', (e) => {
    if (e.target.closest('[data-next]')) {
      if (validateStep(state.step)) goTo(state.step + 1);
    } else if (e.target.closest('[data-prev]')) {
      goTo(state.step - 1);
    }
  });

  function renderSummary() {
    const s = getService();
    const m = getMaster();
    const price = s ? (m ? s.price[m.level] || s.price['Мастер'] : s.price['Мастер']) : '';
    $('#booking-summary').innerHTML = `<dl>
      <dt>Услуга</dt><dd></dd>
      <dt>Мастер</dt><dd></dd>
      <dt>Когда</dt><dd></dd>
      <dt>Стоимость</dt><dd></dd>
    </dl>`;
    const dds = $$('#booking-summary dd');
    dds[0].textContent = s ? s.name : '—';
    dds[1].textContent = m ? m.name : 'Любой свободный';
    dds[2].textContent = `${fmtDateLong(state.date)}, ${state.time}`;
    dds[3].textContent = `${price}, −15% за первый визит`;
  }

  /* --- Отправка --- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(4)) return;
    const btn = $('[data-submit]', form);
    const s = getService();
    const m = getMaster();
    const payload = {
      service: s.name,
      category: CATEGORY_LABELS[s.category],
      master: m ? m.name : 'Любой свободный',
      date: state.date,
      time: state.time,
      duration: s.duration,
      name: nameInput.value.trim(),
      phone: '+7' + phoneDigits(),
      comment: $('#f-comment').value.trim(),
      consent: true,
      source: location.href,
    };

    btn.disabled = true;
    btn.classList.add('is-loading');
    btn.setAttribute('aria-busy', 'true');
    clearError(null, '#form-error');

    try {
      if (CONFIG.endpoint) {
        const res = await fetch(CONFIG.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
      } else {
        await new Promise((r) => setTimeout(r, 900)); // демо-режим
      }
      reachGoal(form.dataset.goalSubmit, { service: payload.service });
      showSuccess(payload, m);
    } catch (err) {
      setError(null, '#form-error', `Не удалось отправить заявку. Позвоните нам: ${CONFIG.phone}`);
    } finally {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      btn.removeAttribute('aria-busy');
    }
  });

  let lastBooking = null;
  function showSuccess(p, m) {
    lastBooking = p;
    const dl = $('#success-details');
    dl.innerHTML = '';
    [['Услуга', p.service], ['Мастер', p.master], ['Когда', `${fmtDateLong(p.date)}, ${p.time}`], ['Адрес', CONFIG.address], ['Телефон', p.phone]]
      .forEach(([k, v]) => {
        const dt = document.createElement('dt'); dt.textContent = k;
        const dd = document.createElement('dd'); dd.textContent = v;
        dl.append(dt, dd);
      });
    form.hidden = true;
    successBox.hidden = false;
    successBox.focus();
  }

  $('#booking-reset').addEventListener('click', () => {
    form.reset();
    Object.assign(state, { serviceId: '', masterId: 'any', presetMaster: null, date: '', time: '' });
    $('#booking-summary').innerHTML = '';
    renderServiceOptions();
    successBox.hidden = true;
    form.hidden = false;
    goTo(1);
  });

  /* --- Добавить в календарь (.ics) --- */
  $('#add-to-calendar').addEventListener('click', () => {
    if (!lastBooking) return;
    const p = lastBooking;
    const [y, mo, d] = p.date.split('-').map(Number);
    const [hh, mm] = p.time.split(':').map(Number);
    const start = new Date(Date.UTC(y, mo - 1, d, hh - CONFIG.utcOffset, mm));
    const end = new Date(start.getTime() + p.duration * 60000);
    const stamp = (dt) => dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const esc = (t) => String(t).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Olha Salon//Booking//RU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@olha-salon.ru`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(p.service + ' — ' + CONFIG.salonName)}`,
      `LOCATION:${esc(CONFIG.address)}`,
      `DESCRIPTION:${esc('Мастер: ' + p.master + '\nТелефон салона: ' + CONFIG.phone)}`,
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Напоминание о визите', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'zapis-olha.ics' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    reachGoal('add_to_calendar');
  });

  /* --- Переход к записи из других блоков --- */
  function openBooking({ serviceId, masterId } = {}) {
    if (!CONFIG.useCrmWidget) {
      if (!successBox.hidden) $('#booking-reset').click();
      if (masterId) {
        state.presetMaster = masterId;
        state.masterId = masterId;
        const m = MASTERS.find((x) => x.id === masterId);
        const cur = getService();
        if (cur && !m.categories.includes(cur.category)) state.serviceId = '';
        renderServiceOptions();
        goTo(1, false);
      }
      if (serviceId) {
        state.serviceId = serviceId;
        if (state.presetMaster) {
          const m = MASTERS.find((x) => x.id === state.presetMaster);
          if (!m.categories.includes(getService().category)) { state.presetMaster = null; state.masterId = 'any'; }
        }
        renderServiceOptions();
        clearError(serviceSelect, '#f-service-error');
        goTo(2, false); // услуга уже выбрана — сразу к выбору мастера
      }
    }
    bookingSection.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => {
      const target = CONFIG.useCrmWidget ? $('#crm-widget') : $(`.step[data-step="${state.step}"] .step__title`, form);
      if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); }
    }, reduceMotion ? 0 : 500);
  }

  $$('[data-book-service]').forEach((btn) => {
    const row = btn.closest('.price-row');
    const svc = SERVICES.find((s) => s.row === row);
    btn.setAttribute('aria-label', `Записаться: ${svc.name}`);
    btn.addEventListener('click', () => openBooking({ serviceId: svc.id }));
  });
  $$('[data-book-master]').forEach((btn) => {
    const m = MASTERS.find((x) => x.card === btn.closest('.master'));
    btn.setAttribute('aria-label', `Записаться к мастеру ${m.name}`);
    btn.addEventListener('click', () => openBooking({ masterId: m.id }));
  });

  renderServiceOptions();

  /* =========================================================
     Модалки
     ========================================================= */
  function openDialog(dlg, opener) {
    dlg._opener = opener || document.activeElement;
    dlg.showModal();
    document.body.classList.add('modal-open');
  }
  $$('dialog').forEach((dlg) => {
    dlg.addEventListener('close', () => {
      document.body.classList.remove('modal-open');
      if (dlg._opener) dlg._opener.focus();
    });
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg && dlg.classList.contains('modal')) dlg.close(); // клик по подложке
      if (e.target.closest('[data-close]')) dlg.close();
    });
  });

  /* --- Работы мастера --- */
  const galleryModal = $('#gallery-modal');
  let galleryMaster = null;
  $$('[data-gallery]').forEach((btn) => {
    const m = MASTERS.find((x) => x.card === btn.closest('.master'));
    btn.setAttribute('aria-label', `Работы мастера ${m.name}`);
    btn.addEventListener('click', () => {
      galleryMaster = m;
      $('#gallery-title').textContent = `Работы: ${m.name}`;
      // Реальные фото берутся из <template class="master__works"> в карточке мастера, иначе — заглушки
      const grid = $('#gallery-grid');
      grid.innerHTML = '';
      const tpl = $('template.master__works', m.card);
      if (tpl) grid.appendChild(tpl.content.cloneNode(true));
      else for (let i = 1; i <= 6; i++) {
        const ph = document.createElement('div');
        ph.className = 'ph ph--1x1';
        ph.setAttribute('role', 'img');
        ph.setAttribute('aria-label', `Работа ${i} мастера ${m.name}`);
        ph.innerHTML = `<span class="ph__label">Работа ${i} · 1:1</span>`;
        grid.appendChild(ph);
      }
      openDialog(galleryModal, btn);
      reachGoal('open_master_gallery', { master: m.name });
    });
  });
  $('#gallery-book').addEventListener('click', () => {
    galleryModal._opener = null;
    galleryModal.close();
    openBooking({ masterId: galleryMaster.id });
  });

  /* --- Портфолио: фильтр --- */
  const works = $$('.work');
  works.forEach((w) => {
    const btn = $('.work__btn', w);
    const cap = document.createElement('span');
    cap.className = 'work__cap';
    cap.setAttribute('aria-hidden', 'true');
    cap.textContent = btn.dataset.caption;
    btn.appendChild(cap);
  });
  $$('.filter__btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.filter__btn').forEach((b) => { const on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
      const f = btn.dataset.filter;
      let n = 0;
      works.forEach((w) => {
        const hide = f !== 'all' && w.dataset.cat !== f;
        w.classList.toggle('is-hidden', hide);
        w.classList.remove('is-filtered');
        if (!hide) {
          w.classList.add('is-visible');
          void w.offsetWidth; // перезапуск анимации
          w.style.setProperty('--i', n++);
          w.classList.add('is-filtered');
        }
      });
    });
  });

  /* --- Лайтбокс --- */
  const lightbox = $('#lightbox');
  let lbItems = [];
  let lbIndex = 0;
  function showLb(i) {
    lbIndex = (i + lbItems.length) % lbItems.length;
    const btn = lbItems[lbIndex];
    const media = $('#lightbox-media');
    media.innerHTML = '';
    if (btn.hasAttribute('data-ba')) {
      media.appendChild(buildCompare(btn));
    } else {
      const img = $('img', btn);
      media.appendChild(img ? Object.assign(img.cloneNode(), { loading: 'eager' }) : $('.ph', btn).cloneNode(true));
    }
    $('#lightbox-caption').textContent = `${btn.dataset.caption} · ${lbIndex + 1} из ${lbItems.length}`;
  }

  // До/после: шторка, которую можно тянуть мышью, пальцем или стрелками с клавиатуры.
  // Для реальных фото положите в кнопку два <img data-before> и <img data-after>.
  function buildCompare(btn) {
    const wrap = document.createElement('div');
    wrap.className = 'compare';
    const before = $('img[data-before]', btn);
    const after = $('img[data-after]', btn);
    const layer = (img, cls, label, tone) => {
      if (img) { const c = img.cloneNode(); c.className = cls; c.loading = 'eager'; return c; }
      const ph = document.createElement('div');
      ph.className = `ph ph--1x1 ${tone} ${cls}`;
      ph.innerHTML = `<span class="ph__label">${label}</span>`;
      return ph;
    };
    wrap.append(layer(after, 'compare__after', 'После', 'ph--tone-3'), layer(before, 'compare__before', 'До', 'ph--tone-1'));
    if (before && after) {
      wrap.insertAdjacentHTML('beforeend', '<span class="compare__tag compare__tag--before">До</span><span class="compare__tag compare__tag--after">После</span>');
    }
    wrap.insertAdjacentHTML('beforeend', `
      <span class="compare__handle"><span class="compare__knob">
        <svg class="icon" aria-hidden="true"><use href="#i-chevron-left"/></svg><svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg>
      </span></span>
      <input class="compare__range" type="range" min="0" max="100" value="50" aria-label="Сравнить до и после: сдвиньте шторку">`);
    const range = $('.compare__range', wrap);
    range.addEventListener('input', () => wrap.style.setProperty('--pos', range.value + '%'));
    return wrap;
  }
  $$('[data-lightbox]').forEach((btn) => {
    btn.setAttribute('aria-label', `Открыть: ${btn.dataset.caption}`);
    btn.addEventListener('click', () => {
      lbItems = $$('.work:not(.is-hidden) [data-lightbox]');
      showLb(lbItems.indexOf(btn));
      openDialog(lightbox, btn);
    });
  });
  $('[data-lb-prev]').addEventListener('click', () => showLb(lbIndex - 1));
  $('[data-lb-next]').addEventListener('click', () => showLb(lbIndex + 1));
  lightbox.addEventListener('keydown', (e) => {
    if (e.target.classList.contains('compare__range')) return; // стрелки двигают шторку
    if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
    if (e.key === 'ArrowRight') showLb(lbIndex + 1);
  });
  let touchX = null;
  lightbox.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) showLb(lbIndex + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* =========================================================
     Карта — ленивая загрузка
     ========================================================= */
  const map = $('#map');
  const loadMap = () => {
    if (map.dataset.loaded) return;
    map.dataset.loaded = '1';
    const iframe = document.createElement('iframe');
    iframe.src = map.dataset.src;
    iframe.title = 'Салон «Ольха» на Яндекс Картах';
    iframe.loading = 'lazy';
    iframe.allowFullscreen = true;
    map.appendChild(iframe);
  };
  if ('IntersectionObserver' in window) {
    const mio = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { loadMap(); mio.disconnect(); }
    }, { rootMargin: '400px 0px' });
    mio.observe(map);
  } else {
    loadMap();
  }

  $('#year').textContent = new Date().getFullYear();
})();
