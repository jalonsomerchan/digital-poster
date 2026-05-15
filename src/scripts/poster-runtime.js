import { cloneDefaultPoster, decodePosterConfig, encodePosterConfig, uid, clamp } from '../utils/posterState';

const STORAGE_KEY = 'digital-poster-config-v1';
const BASE_URL = import.meta.env.BASE_URL || '/';
const WEATHER_CODES = {
  0: 'Despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nuboso',
  3: 'Nuboso',
  45: 'Niebla',
  48: 'Niebla helada',
  51: 'Llovizna suave',
  53: 'Llovizna',
  55: 'Llovizna intensa',
  61: 'Lluvia débil',
  63: 'Lluvia',
  65: 'Lluvia fuerte',
  66: 'Lluvia helada débil',
  67: 'Lluvia helada fuerte',
  71: 'Nieve débil',
  73: 'Nieve',
  75: 'Nieve fuerte',
  77: 'Granos de nieve',
  80: 'Chubascos débiles',
  81: 'Chubascos',
  82: 'Chubascos fuertes',
  95: 'Tormenta',
  96: 'Tormenta con granizo',
  99: 'Tormenta fuerte',
};
const WEATHER_ICON_CODES = {
  0: '01',
  1: '02',
  2: '03',
  3: '04',
  45: '50',
  48: '50',
  51: '09',
  53: '09',
  55: '09',
  61: '10',
  63: '10',
  65: '10',
  66: '13',
  67: '13',
  71: '13',
  73: '13',
  75: '13',
  77: '13',
  80: '09',
  81: '09',
  82: '09',
  95: '11',
  96: '11',
  99: '11',
};

function getConfigFromUrl() {
  return decodePosterConfig(new URLSearchParams(location.search).get('config'));
}

function loadConfig() {
  const urlConfig = getConfigFromUrl();
  if (urlConfig) return urlConfig;

  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return cloneDefaultPoster();

  try {
    return JSON.parse(saved);
  } catch {
    return cloneDefaultPoster();
  }
}

function saveConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function widgetDefaults(type) {
  const base = { id: uid('widget'), type, x: 10, y: 10, w: 28, h: 18 };

  if (type === 'text') {
    return {
      ...base,
      text: 'Texto libre',
      color: '#ffffff',
      fontSize: 42,
      fontFamily: 'system-ui',
      bold: true,
      italic: false,
      letterSpacing: 0,
    };
  }

  if (type === 'qr') return { ...base, url: 'https://example.com', qrDark: '#111827', qrLight: '#ffffff' };
  if (type === 'datetime') return { ...base, format: 'datetime', color: '#ffffff', fontSize: 34 };
  if (type === 'image') {
    return {
      ...base,
      imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format',
      fit: 'cover',
    };
  }
  if (type === 'weather') return { ...base, municipality: 'Cáceres', color: '#ffffff', fontSize: 28 };

  return { ...base, municipality: 'Cáceres', color: '#ffffff', fontSize: 20, days: 4 };
}

function textStyle(widget) {
  return [
    `color:${widget.color || '#fff'}`,
    `font-size:${widget.fontSize || 32}px`,
    `font-family:${widget.fontFamily || 'system-ui'}`,
    `font-weight:${widget.bold ? 800 : 400}`,
    `font-style:${widget.italic ? 'italic' : 'normal'}`,
    `letter-spacing:${widget.letterSpacing || 0}px`,
  ].join(';');
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  })[char]);
}

function weatherIconUrl(code, isDay = true) {
  const icon = WEATHER_ICON_CODES[code] || '01';
  const suffix = isDay ? 'd' : 'n';

  return `https://openweathermap.org/img/wn/${icon}${suffix}@2x.png`;
}

function weatherIconHtml(code, label, isDay = true) {
  return `<img class="weather-icon" src="${weatherIconUrl(code, isDay)}" width="100" height="100" alt="${escapeHtml(label)}" loading="lazy" decoding="async" />`;
}

function getDateTime(format) {
  const now = new Date();
  if (format === 'date') return now.toLocaleDateString('es-ES', { dateStyle: 'full' });
  if (format === 'time') return now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return now.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' });
}

function qrSvg(url, dark = '#111827', light = '#ffffff') {
  const safe = encodeURIComponent(url || 'https://example.com');
  return `<img alt="QR" src="https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${safe}&color=${dark.replace('#', '')}&bgcolor=${light.replace('#', '')}" />`;
}

async function fetchWeather(place, forecast = false) {
  const name = place || 'Cáceres';
  const geo = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=es&format=json`
  ).then((response) => response.json());
  const hit = geo.results?.[0];
  if (!hit) throw new Error('Municipio no encontrado');

  const params = forecast
    ? 'daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=7'
    : 'current=temperature_2m,weather_code,wind_speed_10m,is_day';
  const data = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${hit.latitude}&longitude=${hit.longitude}&${params}&timezone=auto`
  ).then((response) => response.json());

  return { name: hit.name, data };
}

function renderWeather(widget, target) {
  target.style.cssText = textStyle(widget);
  target.textContent = 'Cargando tiempo…';
  fetchWeather(widget.municipality)
    .then(({ name, data }) => {
      const current = data.current;
      const label = WEATHER_CODES[current.weather_code] || 'Tiempo actual';
      target.innerHTML = `<strong>${escapeHtml(name)}</strong><div class="weather-current">${weatherIconHtml(current.weather_code, label, current.is_day !== 0)}<span>${Math.round(current.temperature_2m)} °C</span></div><small>${label} · viento ${Math.round(current.wind_speed_10m)} km/h</small>`;
    })
    .catch(() => {
      target.textContent = 'No se pudo cargar el tiempo';
    });
}

function renderForecast(widget, target) {
  target.style.cssText = textStyle(widget);
  target.textContent = 'Cargando previsión…';
  fetchWeather(widget.municipality, true)
    .then(({ name, data }) => {
      const rows = data.daily.time
        .slice(0, Number(widget.days || 4))
        .map((day, index) => {
          const label = WEATHER_CODES[data.daily.weather_code[index]] || 'Previsión';
          return `<li>${weatherIconHtml(data.daily.weather_code[index], label)}<b>${new Date(day).toLocaleDateString('es-ES', { weekday: 'short' })}</b><span>${Math.round(data.daily.temperature_2m_min[index])}° / ${Math.round(data.daily.temperature_2m_max[index])}°</span><small>${label}</small></li>`;
        })
        .join('');
      target.innerHTML = `<strong>${escapeHtml(name)}</strong><ul>${rows}</ul>`;
    })
    .catch(() => {
      target.textContent = 'No se pudo cargar la previsión';
    });
}

function renderWidget(widget, editable = false) {
  const el = document.createElement('article');
  el.className = `poster-widget poster-widget-${widget.type}`;
  el.dataset.id = widget.id;
  el.style.cssText = `left:${widget.x}%;top:${widget.y}%;width:${widget.w}%;height:${widget.h}%;`;

  const body = document.createElement('div');
  body.className = 'poster-widget-body';

  if (widget.type === 'text') {
    const text = document.createElement('div');
    text.className = 'poster-editable-text';
    text.style.cssText = textStyle(widget);
    text.textContent = widget.text || '';
    if (editable) {
      text.contentEditable = 'true';
      text.spellcheck = false;
      text.dataset.inlineText = 'true';
    }
    body.append(text);
  }

  if (widget.type === 'qr') body.innerHTML = qrSvg(widget.url, widget.qrDark, widget.qrLight);
  if (widget.type === 'datetime') body.innerHTML = `<time style="${textStyle(widget)}">${getDateTime(widget.format)}</time>`;
  if (widget.type === 'image') body.innerHTML = `<img src="${escapeHtml(widget.imageUrl)}" alt="" style="object-fit:${widget.fit || 'cover'}" />`;
  if (widget.type === 'weather') renderWeather(widget, body);
  if (widget.type === 'forecast') renderForecast(widget, body);

  el.append(body);
  if (editable) el.insertAdjacentHTML('beforeend', '<button class="widget-resize" type="button" aria-label="Redimensionar"></button>');

  return el;
}

function renderScreen(screen, page, editable = false) {
  screen.innerHTML = '';
  screen.style.background = page.background || '#101827';
  page.widgets.forEach((widget) => screen.append(renderWidget(widget, editable)));
}

function initViewer(root) {
  const config = loadConfig();
  const screen = root.querySelector('[data-viewer-screen]');
  let index = 0;

  const show = () => {
    const page = config.pages[index] || config.pages[0];
    renderScreen(screen, page, false);
    index = (index + 1) % config.pages.length;
    setTimeout(show, Math.max(2, Number(page.duration || 10)) * 1000);
  };

  show();
  setInterval(() => screen.querySelectorAll('time').forEach((node) => {
    const widget = config.pages
      .flatMap((page) => page.widgets)
      .find((item) => node.closest('[data-id]')?.dataset.id === item.id);
    if (widget) node.textContent = getDateTime(widget.format);
  }), 30000);
}

function initBuilder(root) {
  let config = loadConfig();
  let selectedPageIndex = 0;
  let selectedWidgetId = config.pages[0].widgets[0]?.id || null;
  const screen = root.querySelector('[data-editor-screen]');
  const pageList = root.querySelector('[data-page-list]');
  const inspector = root.querySelector('[data-inspector]');
  const urlOutput = root.querySelector('[data-share-url]');
  const currentPage = () => config.pages[selectedPageIndex];
  const currentWidget = () => currentPage().widgets.find((widget) => widget.id === selectedWidgetId);

  function updateShareUrl() {
    urlOutput.value = new URL(`${BASE_URL}display/?config=${encodePosterConfig(config)}`, location.origin).toString();
  }

  function persist() {
    saveConfig(config);
    updateShareUrl();
  }

  function sync(options = {}) {
    const { skipInspector = false, skipPages = false } = options;
    persist();
    if (!skipPages) renderPages();
    renderScreen(screen, currentPage(), true);
    bindWidgetEvents();
    if (!skipInspector) renderInspector();
  }

  function bindWidgetEvents() {
    screen.querySelectorAll('.poster-widget').forEach((el) => {
      el.classList.toggle('is-selected', el.dataset.id === selectedWidgetId);
      el.addEventListener('pointerdown', startDrag);
      el.querySelector('.widget-resize')?.addEventListener('pointerdown', startResize);
      el.addEventListener('click', () => {
        selectedWidgetId = el.dataset.id;
        sync();
      });
    });

    screen.querySelectorAll('[data-inline-text]').forEach((text) => {
      text.addEventListener('pointerdown', (event) => event.stopPropagation());
      text.addEventListener('click', (event) => {
        selectedWidgetId = text.closest('.poster-widget')?.dataset.id || selectedWidgetId;
        event.stopPropagation();
        renderInspector();
      });
      text.addEventListener('input', () => {
        const widget = currentPage().widgets.find((item) => item.id === text.closest('.poster-widget')?.dataset.id);
        if (!widget) return;
        widget.text = text.textContent || '';
        selectedWidgetId = widget.id;
        persist();
      });
    });
  }

  function renderPages() {
    pageList.innerHTML = config.pages
      .map((page, index) => `<button type="button" class="${index === selectedPageIndex ? 'is-active' : ''}" data-page="${index}">${escapeHtml(page.name)}</button>`)
      .join('');
    pageList.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => {
      selectedPageIndex = Number(button.dataset.page);
      selectedWidgetId = currentPage().widgets[0]?.id || null;
      sync();
    }));
  }

  function field(label, key, value, type = 'text') {
    return `<label><span>${label}</span><input data-key="${key}" type="${type}" value="${escapeHtml(value ?? '')}" /></label>`;
  }

  function renderInspector() {
    const page = currentPage();
    const widget = currentWidget();
    inspector.innerHTML = `<h2>Página</h2>${field('Nombre', 'page.name', page.name)}${field('Duración en segundos', 'page.duration', page.duration, 'number')}${field('Color de fondo', 'page.background', page.background, 'color')}<hr /><h2>Widget</h2>`;

    if (!widget) {
      inspector.innerHTML += '<p>Selecciona o añade un widget.</p>';
      return;
    }

    inspector.innerHTML += field('X %', 'x', widget.x, 'number') + field('Y %', 'y', widget.y, 'number') + field('Ancho %', 'w', widget.w, 'number') + field('Alto %', 'h', widget.h, 'number');

    if (widget.type === 'text') {
      inspector.innerHTML += field('Texto', 'text', widget.text) + field('Color', 'color', widget.color, 'color') + field('Tamaño', 'fontSize', widget.fontSize, 'number') + field('Fuente', 'fontFamily', widget.fontFamily) + field('Separación letras', 'letterSpacing', widget.letterSpacing, 'number') + '<label><input data-key="bold" type="checkbox" ' + (widget.bold ? 'checked' : '') + ' /> Negrita</label><label><input data-key="italic" type="checkbox" ' + (widget.italic ? 'checked' : '') + ' /> Cursiva</label><p class="help-text">También puedes editar el texto directamente dentro del widget.</p>';
    }

    if (widget.type === 'qr') inspector.innerHTML += field('URL', 'url', widget.url, 'url') + field('Color QR', 'qrDark', widget.qrDark, 'color') + field('Fondo QR', 'qrLight', widget.qrLight, 'color');
    if (widget.type === 'datetime') inspector.innerHTML += '<label><span>Formato</span><select data-key="format"><option value="datetime">Fecha y hora</option><option value="date">Solo fecha</option><option value="time">Solo hora</option></select></label>' + field('Color', 'color', widget.color, 'color') + field('Tamaño', 'fontSize', widget.fontSize, 'number');
    if (widget.type === 'image') inspector.innerHTML += field('URL de imagen', 'imageUrl', widget.imageUrl, 'url') + '<label><span>Ajuste</span><select data-key="fit"><option value="cover">Cubrir</option><option value="contain">Contener</option></select></label>';
    if (widget.type === 'weather' || widget.type === 'forecast') inspector.innerHTML += field('Municipio', 'municipality', widget.municipality) + field('Color', 'color', widget.color, 'color') + field('Tamaño', 'fontSize', widget.fontSize, 'number') + (widget.type === 'forecast' ? field('Días', 'days', widget.days, 'number') : '');

    inspector.innerHTML += '<button class="danger" type="button" data-delete-widget>Eliminar widget</button>';
    inspector.querySelectorAll('select').forEach((select) => {
      if (widget[select.dataset.key]) select.value = widget[select.dataset.key];
    });
  }

  function updateFromInspector(event, shouldRender) {
    const input = event.target.closest('[data-key]');
    if (!input) return;

    const key = input.dataset.key;
    const value = input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) : input.value;

    if (key.startsWith('page.')) currentPage()[key.split('.')[1]] = value;
    else if (currentWidget()) currentWidget()[key] = value;

    persist();

    if (shouldRender) {
      renderScreen(screen, currentPage(), true);
      bindWidgetEvents();
    }
  }

  inspector.addEventListener('input', (event) => {
    const key = event.target.closest('[data-key]')?.dataset.key;
    updateFromInspector(event, !['municipality', 'url', 'imageUrl'].includes(key));
  });

  inspector.addEventListener('change', (event) => {
    updateFromInspector(event, true);
  });

  inspector.addEventListener('click', (event) => {
    if (!event.target.closest('[data-delete-widget]')) return;
    currentPage().widgets = currentPage().widgets.filter((widget) => widget.id !== selectedWidgetId);
    selectedWidgetId = currentPage().widgets[0]?.id || null;
    sync();
  });

  root.querySelectorAll('[data-add-widget]').forEach((button) => button.addEventListener('click', () => {
    const widget = widgetDefaults(button.dataset.addWidget);
    currentPage().widgets.push(widget);
    selectedWidgetId = widget.id;
    sync();
  }));

  root.querySelector('[data-add-page]').addEventListener('click', () => {
    config.pages.push({ id: uid('page'), name: `Página ${config.pages.length + 1}`, duration: 10, background: '#111827', widgets: [] });
    selectedPageIndex = config.pages.length - 1;
    selectedWidgetId = null;
    sync();
  });

  root.querySelector('[data-reset]').addEventListener('click', () => {
    config = cloneDefaultPoster();
    selectedPageIndex = 0;
    selectedWidgetId = config.pages[0].widgets[0]?.id;
    sync();
  });

  root.querySelector('[data-export]').addEventListener('click', () => {
    root.querySelector('[data-json]').value = JSON.stringify(config, null, 2);
  });

  root.querySelector('[data-import]').addEventListener('click', () => {
    try {
      config = JSON.parse(root.querySelector('[data-json]').value);
      selectedPageIndex = 0;
      selectedWidgetId = config.pages[0]?.widgets[0]?.id || null;
      sync();
    } catch {
      alert('JSON no válido');
    }
  });

  function moveWidget(event, mode) {
    const targetWidget = event.currentTarget.closest?.('.poster-widget') || event.currentTarget;
    const widget = currentPage().widgets.find((item) => item.id === targetWidget.dataset.id);
    if (!widget) return;

    event.preventDefault();
    event.stopPropagation();
    targetWidget.setPointerCapture?.(event.pointerId);

    const box = screen.getBoundingClientRect();
    const start = { x: event.clientX, y: event.clientY, widget: { ...widget } };

    const onMove = (move) => {
      const dx = ((move.clientX - start.x) / box.width) * 100;
      const dy = ((move.clientY - start.y) / box.height) * 100;

      if (mode === 'resize') {
        widget.w = clamp(start.widget.w + dx, 5, 100 - widget.x);
        widget.h = clamp(start.widget.h + dy, 5, 100 - widget.y);
      } else {
        widget.x = clamp(start.widget.x + dx, 0, 100 - widget.w);
        widget.y = clamp(start.widget.y + dy, 0, 100 - widget.h);
      }

      selectedWidgetId = widget.id;
      targetWidget.style.left = `${widget.x}%`;
      targetWidget.style.top = `${widget.y}%`;
      targetWidget.style.width = `${widget.w}%`;
      targetWidget.style.height = `${widget.h}%`;
      persist();
    };

    const onUp = () => {
      targetWidget.releasePointerCapture?.(event.pointerId);
      removeEventListener('pointermove', onMove);
      renderInspector();
    };

    addEventListener('pointermove', onMove);
    addEventListener('pointerup', onUp, { once: true });
  }

  function startDrag(event) {
    if (event.target.closest('.widget-resize') || event.target.closest('[data-inline-text]')) return;
    moveWidget(event, 'drag');
  }

  function startResize(event) {
    moveWidget(event, 'resize');
  }

  sync();
}

const builder = document.querySelector('[data-poster-builder]');
if (builder) initBuilder(builder);
const viewer = document.querySelector('[data-poster-viewer]');
if (viewer) initViewer(viewer);
