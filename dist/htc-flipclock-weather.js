/*
 * HTC Flip Clock & Weather card for Home Assistant — v2
 * Dependency-free web component (no jQuery, no CDN imports), fully responsive.
 *
 * Time source: a time_date sensor (default sensor.date_time_iso), so the clock
 * follows the HA server clock. Each card may set its own `time_entity`,
 * `timezone` (IANA, e.g. "America/New_York") and `svrOffset` (seconds), so
 * several cards can show different cities / time zones side by side.
 */
import { regional } from './regional.js?v1.1.5';

const VERSION = '2.1.3';
const BASE_PATH = new URL('./', import.meta.url).pathname;

const THEMES = {
    // digit: [width, left of 1st digit, left of 2nd digit] inside a 200-unit tile (matches the PNG sizes)
    default: { panel: 'background.png', line: true, icons: 'htc', digit: [80, 20, 100] },
    dusk: { panel: null, line: false, icons: 'dusk', digit: [100, 0, 100] },
};

const DEFAULTS = {
    lang: 'en',
    am_pm: false,
    svrOffset: 0,
    renderClock: true,
    renderForecast: true,
    renderDetails: true,
    forecast_days: 4,
    high_low_entity: false,
    time_entity: 'sensor.date_time_iso',
    timezone: null,
    widgetPath: BASE_PATH,
    theme: { name: 'default', weather_icon_set: 'default' },
};

const ICONS_DAY = {
    clear: 'sunny',
    'clear-night': 'night',
    cloudy: 'cloudy',
    fog: 'fog',
    hail: 'hail',
    lightning: 'thunder',
    'lightning-rainy': 'thunder',
    partlycloudy: 'partlycloudy',
    pouring: 'pouring',
    rainy: 'pouring',
    snowy: 'snowy',
    'snowy-rainy': 'snowy-rainy',
    sunny: 'sunny',
    windy: 'cloudy',
    'windy-variant': 'partlycloudy',
    exceptional: 'na',
};
const ICONS_NIGHT = {
    ...ICONS_DAY,
    clear: 'night',
    sunny: 'night',
    fog: 'night-fog',
    partlycloudy: 'cloudy-night-3',
    'windy-variant': 'cloudy-night-3',
};

// Per icon-set overrides for sets that have extra artwork (e.g. dusk, from the MIUI pack).
const ICON_SET_OVERRIDES = {
    dusk: {
        day: {
            lightning: 'thunder-day',
            'lightning-rainy': 'thunder-day',
            rainy: 'rainy',
            windy: 'windy',
        },
        night: {
            lightning: 'thunder',
            'lightning-rainy': 'thunder',
            rainy: 'rainy-night',
            pouring: 'rainy-night',
            snowy: 'snowy-night',
            partlycloudy: 'partlycloudy-night',
            windy: 'windy',
        },
    },
};

// Flip animation timing (ms): the top flap falls, then the bottom flap lands.
const FLIP_FALL = 280;
const FLIP_LAND = 380;
const FLIP_SHADING = false; // darken flaps while they move (set true to re-enable)

const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const round = (v, d = 1) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : v;
};

const STYLE = `
:host { display: block; }
ha-card { overflow: hidden; cursor: pointer; padding: 12px 12px 10px; box-sizing: border-box; }
.wrap { container-type: inline-size; max-width: 520px; margin: 0 auto; }
.scale { --u: calc(100cqw / 440); --off: 0; }
.scale.noclock { --off: 40; }

.hero { position: relative; height: calc(330 * var(--u)); font-family: Arial, Verdana, Tahoma, Helvetica, sans-serif; }
.scale.noclock .hero { height: calc(290 * var(--u)); }

.panel {
  position: absolute; left: 0; top: calc((40 - var(--off)) * var(--u));
  width: 100%; height: calc(246 * var(--u));
  background: var(--panel) center / 100% 100% no-repeat;
}

.clock { position: absolute; inset: 0; z-index: 2; }
.scale.noclock .clock { display: none; }
.tile {
  position: absolute; top: 0; width: calc(200 * var(--u)); height: calc(200 * var(--u));
  perspective: calc(700 * var(--u));
}
.tile.hours { left: calc(18 * var(--u)); }
.tile.minutes { left: calc(222 * var(--u)); }
/* Each tile is 4 full-size faces clipped to halves: static top/bottom + two moving flaps. */
.face { position: absolute; inset: 0; transform-origin: 50% 50%; }
.face.top { clip-path: inset(0 0 50% 0); }
.face.bot { clip-path: inset(50% 0 0 0); }
.face.flap { z-index: 2; visibility: hidden; backface-visibility: hidden; will-change: transform; }
.face.flap.on { visibility: visible; }
.face img { position: absolute; top: 0; height: 100%; }
.face .bg { left: 0; width: 100%; }
.face .d { width: calc(var(--dw, 80) * var(--u)); }
.face .d1 { left: calc(var(--d1x, 20) * var(--u)); }
.face .d2 { left: calc(var(--d2x, 100) * var(--u)); }
.face .shade { position: absolute; inset: 0; background: #000; opacity: 0; pointer-events: none; }
.tile .line {
  position: absolute; z-index: 3; left: calc(12 * var(--u)); top: calc(97 * var(--u));
  width: calc(175 * var(--u)); height: max(1px, calc(2 * var(--u))); background: #efefef;
}
.scale.noline .line { display: none; }
.ampm {
  position: absolute; z-index: 4; display: none;
  left: calc(130 * var(--u)); top: calc(156 * var(--u));
  width: calc(70 * var(--u)); height: calc(44 * var(--u));
}
.ampm.on { display: block; }

.wicon {
  position: absolute; z-index: 5; left: calc(60 * var(--u)); top: calc((135 - var(--off)) * var(--u));
  width: calc(320 * var(--u)); height: calc(206 * var(--u)); object-fit: contain; pointer-events: none;
}
.local, .today {
  position: absolute; z-index: 6; top: calc((205 - var(--off)) * var(--u));
  color: #fff; text-shadow: 0 1px 3px rgba(0, 0, 0, .7); line-height: 1.2; max-width: 45%;
}
.scale.nopanel .local, .scale.nopanel .today { color: var(--primary-text-color); text-shadow: none; }
.local { left: calc(18 * var(--u)); }
.today { right: calc(18 * var(--u)); text-align: right; }
.city, .date { font-size: calc(19 * var(--u)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.temp { font-size: calc(30 * var(--u)); font-weight: bold; }
.hilo { font-size: calc(24 * var(--u)); }
.unit { font-size: .6em; vertical-align: top; margin-left: 1px; }

.forecast { display: flex; margin-top: 4px; }
.forecast:empty { display: none; }
.day {
  flex: 1 1 0; min-width: 0; text-align: center; padding: 2px 2px 4px;
  border-left: 1px solid var(--divider-color, rgba(127, 127, 127, .3));
}
.day:first-child { border-left: 0; }
.day .name { font-weight: bold; font-size: clamp(12px, 3.6cqw, 16px); color: var(--primary-text-color); }
.day img { display: block; width: 100%; max-width: 110px; aspect-ratio: 320 / 206; object-fit: contain; margin: 0 auto; }
.day .t { font-weight: bold; font-size: clamp(12px, 3.6cqw, 16px); color: var(--primary-text-color); white-space: nowrap; }
.day .lo { color: var(--secondary-text-color); font-weight: normal; }

.details {
  display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 2px 12px;
  margin-top: 6px; font-size: clamp(12px, 3.2cqw, 14px); color: var(--secondary-text-color);
}
.details:empty { display: none; }
.details span { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
.details ha-icon { --mdc-icon-size: 18px; }
.details .rise ha-icon { color: var(--state-sun-above_horizon-color, #ff9800); }
.details .set ha-icon { color: var(--state-sun-below_horizon-color, #e53935); }
.details .upd { flex-basis: 100%; justify-content: flex-end; font-size: .8em; opacity: .8; }
.details .upd ha-icon { --mdc-icon-size: 13px; }

.warn { padding: 16px; color: var(--error-color, #db4437); }
`;

const faceHtml = (cls) =>
    `<div class="face ${cls}"><img class="bg" alt=""><img class="d d1" alt=""><img class="d d2" alt=""><i class="shade"></i></div>`;
const tileHtml = (name) =>
    `<div class="tile ${name}">${faceHtml('top base-top')}${faceHtml('bot base-bot')}` +
    `${faceHtml('top flap flap-top')}${faceHtml('bot flap flap-bot')}<div class="line"></div></div>`;

const TEMPLATE = `
<style>${STYLE}</style>
<ha-card>
  <div class="warn" hidden></div>
  <div class="wrap">
    <div class="scale">
      <div class="hero">
        <div class="panel"></div>
        <div class="clock">
          ${tileHtml('hours')}
          ${tileHtml('minutes')}
          <img class="ampm" alt="">
        </div>
        <img class="wicon" alt="">
        <div class="local"><div class="city"></div><div class="temp"></div></div>
        <div class="today"><div class="date"></div><div class="hilo"></div></div>
      </div>
      <div class="forecast"></div>
      <div class="details"></div>
    </div>
  </div>
</ha-card>`;

class HtcWeatherCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._forecast = null;
        this._shown = null; // { hh, mm } currently on the flip tiles
        this._forecastKey = '';
        this._detailsKey = '';
    }

    static getStubConfig(hass) {
        const entity = Object.keys(hass?.states || {}).find((e) => e.startsWith('weather.')) || 'weather.home';
        return { entity, renderForecast: true };
    }

    setConfig(config) {
        if (!config || !config.entity) throw new Error('You need to define a weather `entity`');
        const theme = { ...DEFAULTS.theme, ...(config.theme || {}) };
        const c = { ...DEFAULTS, ...config, theme };
        if (!c.widgetPath.endsWith('/')) c.widgetPath += '/';
        c.forecast_days = Math.max(1, Math.min(7, Number(c.forecast_days) || 4));
        c.imagesPath = `${c.widgetPath}themes/${theme.name}/`;
        c.clockImagesPath = `${c.imagesPath}clock/`;
        c.themeOpts = THEMES[theme.name] || THEMES.default;
        // Icon sets are shared by all themes: themes/icons/<set>/ (htc, dusk, picto).
        // "default" means the theme's own set.
        const iconSet = !theme.weather_icon_set || theme.weather_icon_set === 'default' ? c.themeOpts.icons : theme.weather_icon_set;
        c.weatherImagesPath = `${c.widgetPath}themes/icons/${iconSet}/`;
        c.iconSet = iconSet;

        const reconnect = this._config && this._config.entity !== c.entity;
        this._config = c;
        this._build();
        if (reconnect) {
            this._unsubscribe();
            this._subFailed = false;
        }
        this._shown = null;
        this._forecastKey = this._detailsKey = '';
        if (this._hass) {
            this._subscribe();
            this._update();
        }
    }

    set hass(hass) {
        const old = this._hass;
        this._hass = hass;
        if (!this._config) return;
        if (!this._unsubP && this.isConnected) this._subscribe();
        const c = this._config;
        const watched = [c.entity, 'sun.sun', c.time_entity, c.high_low_entity && c.high_low_entity.entity_id];
        if (!old || watched.some((e) => e && old.states[e] !== hass.states[e]) || old.locale !== hass.locale) {
            this._update();
        }
    }

    connectedCallback() {
        this._scheduleTick();
        if (this._hass && this._config) {
            this._subscribe();
            this._update();
        }
    }

    disconnectedCallback() {
        this._unsubscribe();
        this._cancelAnims();
        clearTimeout(this._tick);
        this._tick = null;
        this._shown = null; // an interrupted flip would otherwise leave stale digits
    }

    /** Re-render right after every minute boundary, independent of hass updates. */
    _scheduleTick() {
        clearTimeout(this._tick);
        const wait = 60000 - (Date.now() % 60000) + 300;
        this._tick = setTimeout(() => {
            this._update();
            this._scheduleTick();
        }, wait);
    }

    getCardSize() {
        return this._config && this._config.renderForecast ? 8 : 5;
    }

    getGridOptions() {
        return { columns: 12, min_columns: 6 };
    }

    // ---------- DOM ----------

    _build() {
        const c = this._config;
        const root = this.shadowRoot;
        root.innerHTML = TEMPLATE;
        const $ = (s) => root.querySelector(s);
        this._el = {
            card: $('ha-card'),
            warn: $('.warn'),
            scale: $('.scale'),
            panel: $('.panel'),
            hours: this._tileRefs($('.tile.hours')),
            minutes: this._tileRefs($('.tile.minutes')),
            ampm: $('.ampm'),
            wicon: $('.wicon'),
            city: $('.city'),
            temp: $('.temp'),
            date: $('.date'),
            hilo: $('.hilo'),
            forecast: $('.forecast'),
            details: $('.details'),
        };
        const e = this._el;
        e.scale.classList.toggle('noclock', !c.renderClock);
        e.scale.classList.toggle('noline', !c.themeOpts.line);
        if (c.themeOpts.panel) e.panel.style.setProperty('--panel', `url("${c.imagesPath}${c.themeOpts.panel}")`);
        else e.panel.style.display = 'none';
        e.scale.classList.toggle('nopanel', !c.themeOpts.panel);
        const [dw, d1x, d2x] = c.themeOpts.digit;
        e.scale.style.setProperty('--dw', dw);
        e.scale.style.setProperty('--d1x', d1x);
        e.scale.style.setProperty('--d2x', d2x);
        e.wicon.addEventListener('error', () => {
            const na = `${c.weatherImagesPath}na.png`;
            if (!e.wicon.src.endsWith(na)) e.wicon.src = na;
        });
        e.card.addEventListener('click', () => this._moreInfo());
        this._preloadFrames();
    }

    _tileRefs(tile) {
        const face = (cls) => {
            const el = tile.querySelector(`.${cls}`);
            return { el, bg: el.querySelector('.bg'), d1: el.querySelector('.d1'), d2: el.querySelector('.d2'), shade: el.querySelector('.shade') };
        };
        return { baseTop: face('base-top'), baseBot: face('base-bot'), flapTop: face('flap-top'), flapBot: face('flap-bot'), anims: [] };
    }

    _preloadFrames() {
        if (!this._config.renderClock) return;
        const p = this._config.clockImagesPath;
        const names = ['clockbg1', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        this._preloaded = names.map((n) => Object.assign(new Image(), { src: `${p}${n}.png` }));
    }

    _moreInfo() {
        const ev = new Event('hass-more-info', { bubbles: true, composed: true });
        ev.detail = { entityId: this._config.entity };
        this.dispatchEvent(ev);
    }

    // ---------- Forecast subscription ----------

    _subscribe() {
        const c = this._config;
        const st = this._hass && this._hass.states[c.entity];
        if (this._unsubP || this._subFailed || !st || !this._hass.connection) return;
        const feat = st.attributes.supported_features || 0;
        const type = feat & 1 ? 'daily' : feat & 4 ? 'twice_daily' : feat & 2 ? 'hourly' : null;
        this._forecastType = type;
        if (!type) return; // legacy integration: falls back to attributes.forecast
        this._unsubP = this._hass.connection
            .subscribeMessage(
                (msg) => {
                    this._forecast = msg.forecast || [];
                    this._update();
                },
                { type: 'weather/subscribe_forecast', forecast_type: type, entity_id: c.entity }
            )
            .catch((err) => {
                console.warn('htc-weather-card: forecast subscription failed', err);
                this._unsubP = null;
                this._subFailed = true; // don't retry on every state change; falls back to attributes.forecast
            });
    }

    _unsubscribe() {
        if (this._unsubP) {
            this._unsubP.then((unsub) => unsub && unsub()).catch(() => {});
            this._unsubP = null;
        }
        this._forecast = null;
    }

    _forecastItems() {
        const st = this._hass.states[this._config.entity];
        let list = this._forecast || (st && st.attributes.forecast) || [];
        if (this._forecastType === 'twice_daily') list = list.filter((f) => f.is_daytime !== false);
        return list;
    }

    // ---------- Time ----------

    /** Wall-clock time to display: { h, m, y, mo, d, ms } */
    _now() {
        const c = this._config;
        const st = this._hass.states[c.time_entity];
        if (!st && !this._warnedNoSensor) {
            this._warnedNoSensor = true;
            console.warn(`htc-weather-card: ${c.time_entity} not found, using browser clock`);
        }
        const offset = (Number(c.svrOffset) || 0) * 1000;

        if (c.timezone) {
            const ms = Math.floor((Date.now() - offset) / 60000) * 60000;
            try {
                const parts = {};
                new Intl.DateTimeFormat('en-US', {
                    timeZone: c.timezone, hourCycle: 'h23',
                    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
                }).formatToParts(new Date(ms)).forEach((p) => (parts[p.type] = Number(p.value)));
                return { h: parts.hour % 24, m: parts.minute, y: parts.year, mo: parts.month - 1, d: parts.day, ms };
            } catch (e) {
                console.warn(`htc-weather-card: invalid timezone "${c.timezone}"`);
            }
        }
        // The sensor's state is the server's wall-clock time and last_changed is the real
        // instant it ticked. Their difference is the server's offset vs. this browser's
        // time zone; apply it to the live browser clock so the card keeps ticking on its own.
        let delta = 0;
        if (st) {
            const wall = new Date(st.state).getTime();
            const instant = Date.parse(st.last_changed);
            if (Number.isFinite(wall) && Number.isFinite(instant)) {
                delta = Math.round((wall - instant) / 60000) * 60000;
            }
        }
        const t = new Date(Date.now() + delta - offset);
        return { h: t.getHours(), m: t.getMinutes(), y: t.getFullYear(), mo: t.getMonth(), d: t.getDate(), ms: t.getTime() };
    }

    _clockStrings(h, m) {
        const hh = this._config.am_pm ? pad(h % 12 || 12) : pad(h);
        return { hh, mm: pad(m) };
    }

    _cancelAnims() {
        if (!this._el) return;
        for (const tile of [this._el.hours, this._el.minutes]) {
            tile.anims.forEach((a) => a.cancel());
            tile.anims = [];
        }
    }

    _setFace(face, digits) {
        const p = this._config.clockImagesPath;
        const set = (img, name) => {
            const src = `${p}${name}.png`;
            if (img.getAttribute('src') !== src) img.src = src;
        };
        set(face.bg, 'clockbg1');
        set(face.d1, digits[0]);
        set(face.d2, digits[1]);
    }

    _setStatic(tile, digits) {
        tile.anims.forEach((a) => a.cancel());
        tile.anims = [];
        this._setFace(tile.baseTop, digits);
        this._setFace(tile.baseBot, digits);
        tile.flapTop.el.classList.remove('on');
        tile.flapBot.el.classList.remove('on');
    }

    /**
     * Real flip: the top half of the old digits falls forward (0 -> -90deg), revealing the new
     * top half behind it, then the bottom half of the new digits lands (90 -> 0deg) over the old one.
     */
    _flip(tile, from, to) {
        const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced || !tile.flapTop.el.animate) return this._setStatic(tile, to);
        tile.anims.forEach((a) => a.cancel());

        this._setFace(tile.baseTop, to);
        this._setFace(tile.baseBot, from);
        this._setFace(tile.flapTop, from);
        this._setFace(tile.flapBot, to);
        tile.flapTop.el.classList.add('on');
        tile.flapBot.el.classList.add('on');

        const fall = { duration: FLIP_FALL, easing: 'cubic-bezier(.55, 0, .9, .45)', fill: 'forwards' };
        const land = { duration: FLIP_LAND, delay: FLIP_FALL, easing: 'cubic-bezier(.2, 1.25, .45, 1)', fill: 'both' };
        const coverOld = { duration: FLIP_LAND, delay: FLIP_FALL, easing: 'ease-out', fill: 'both' };
        tile.anims = [
            tile.flapTop.el.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)' }], fall),
            tile.flapBot.el.animate([{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }], land),
        ];
        if (FLIP_SHADING) {
            tile.anims.push(
                tile.flapTop.shade.animate([{ opacity: 0 }, { opacity: 0.45 }], fall),
                tile.baseTop.shade.animate([{ opacity: 0.35 }, { opacity: 0 }], { ...fall, easing: 'ease-in' }),
                tile.flapBot.shade.animate([{ opacity: 0.45 }, { opacity: 0 }], land),
                tile.baseBot.shade.animate([{ opacity: 0 }, { opacity: 0.3 }], coverOld)
            );
        }
        const anims = tile.anims;
        Promise.all(anims.map((a) => a.finished))
            .then(() => {
                if (tile.anims !== anims) return; // superseded by a newer flip
                this._setStatic(tile, to);
            })
            .catch(() => {}); // cancelled
    }

    _updateClock(now) {
        const c = this._config;
        if (!c.renderClock) return;
        const cur = this._clockStrings(now.h, now.m);
        let prev = this._shown;
        if (!prev) {
            // First paint: start one minute earlier so the card flips in, like the original.
            const t = (now.h * 60 + now.m + 1439) % 1440;
            prev = this._clockStrings(Math.floor(t / 60), t % 60);
        }
        if (prev.hh !== cur.hh || prev.mm !== cur.mm) {
            if (prev.hh !== cur.hh) this._flip(this._el.hours, prev.hh, cur.hh);
            else if (!this._shown) this._setStatic(this._el.hours, cur.hh);
            this._flip(this._el.minutes, prev.mm, cur.mm);
        }
        this._shown = cur;
        this._el.ampm.classList.toggle('on', !!c.am_pm);
        if (c.am_pm) this._el.ampm.src = `${c.clockImagesPath}${now.h < 12 ? 'am' : 'pm'}.png`;
    }

    // ---------- Weather ----------

    _dayName(date) {
        const lang = this._config.lang;
        const names = regional[lang] && regional[lang].dayNames;
        if (names) return names[date.getDay()];
        try {
            return date.toLocaleDateString(lang, { weekday: 'short' });
        } catch (e) {
            return regional.en.dayNames[date.getDay()];
        }
    }

    _timeStr(date) {
        const opts = { hour: '2-digit', minute: '2-digit', hour12: !!this._config.am_pm };
        if (this._config.timezone) opts.timeZone = this._config.timezone;
        try {
            return date.toLocaleTimeString(this._hass.locale?.language || undefined, opts);
        } catch (e) {
            return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        }
    }

    _weatherIcon(condition, night) {
        const over = ICON_SET_OVERRIDES[this._config.iconSet];
        const name = (over && over[night ? 'night' : 'day'][condition]) || (night ? ICONS_NIGHT : ICONS_DAY)[condition] || 'na';
        return `${this._config.weatherImagesPath}${name}.png`;
    }

    _update() {
        if (!this._hass || !this._config || !this._el) return;
        const c = this._config;
        const e = this._el;
        const st = this._hass.states[c.entity];

        e.warn.hidden = !!st;
        e.scale.hidden = !st;
        if (!st) {
            e.warn.textContent = `Entity not available: ${c.entity}`;
            return;
        }

        const now = this._now();
        this._updateClock(now);

        const a = st.attributes;
        const tUnit = a.temperature_unit || this._hass.config.unit_system.temperature || '';
        const sun = this._hass.states['sun.sun'];
        const night = sun ? sun.state === 'below_horizon' : false;

        const icon = this._weatherIcon(st.state, night);
        if (e.wicon.getAttribute('src') !== icon) e.wicon.src = icon;
        e.wicon.title = st.state;

        e.city.textContent = c.title || a.friendly_name || c.entity;
        e.temp.innerHTML = `${esc(round(a.temperature))}<span class="unit">${esc(tUnit)}</span>`;

        // Right block: date + high/low (or custom entity)
        const today = new Date(now.y, now.mo, now.d);
        const todayLabel = `${this._dayName(today)} ${now.d}`;
        const fc = this._forecastItems();
        if (c.high_low_entity && c.high_low_entity.entity_id) {
            const hl = this._hass.states[c.high_low_entity.entity_id];
            e.date.textContent = c.high_low_entity.name || todayLabel;
            e.hilo.textContent = hl ? `${hl.state}${hl.attributes.unit_of_measurement ? ' ' + hl.attributes.unit_of_measurement : ''}` : '—';
        } else {
            e.date.textContent = todayLabel;
            const f0 = fc[0];
            e.hilo.innerHTML = f0
                ? `${esc(round(f0.temperature, 0))}&deg;${f0.templow != null ? ` / ${esc(round(f0.templow, 0))}&deg;` : ''}`
                : '';
        }

        this._renderForecast(fc, tUnit);
        this._renderDetails(st, sun);
    }

    _renderForecast(fc, tUnit) {
        const c = this._config;
        if (!c.renderForecast) {
            this._el.forecast.innerHTML = '';
            return;
        }
        const items = fc.slice(0, c.forecast_days);
        const key = JSON.stringify(items) + c.lang;
        if (key === this._forecastKey) return;
        this._forecastKey = key;
        const hourly = this._forecastType === 'hourly';
        this._el.forecast.innerHTML = items
            .map((f) => {
                const d = new Date(f.datetime);
                const label = hourly ? this._timeStr(d) : `${this._dayName(d)} ${d.getDate()}`;
                const lo = f.templow != null ? ` <span class="lo">/ ${esc(round(f.templow, 0))}&deg;</span>` : '';
                return `<div class="day">
                    <div class="name">${esc(label)}</div>
                    <img src="${this._weatherIcon(f.condition, hourly && f.is_daytime === false)}" alt="${esc(f.condition)}" title="${esc(f.condition)}"
                         onerror="this.onerror=null;this.src='${c.weatherImagesPath}na.png'">
                    <div class="t">${esc(round(f.temperature, 0))}&deg;${lo}</div>
                </div>`;
            })
            .join('');
    }

    _renderDetails(st, sun) {
        const c = this._config;
        if (!c.renderDetails) {
            this._el.details.innerHTML = '';
            return;
        }
        const a = st.attributes;
        const parts = [];
        if (sun) {
            parts.push(`<span class="rise"><ha-icon icon="mdi:weather-sunset-up"></ha-icon>${esc(this._timeStr(new Date(sun.attributes.next_rising)))}</span>`);
            parts.push(`<span class="set"><ha-icon icon="mdi:weather-sunset-down"></ha-icon>${esc(this._timeStr(new Date(sun.attributes.next_setting)))}</span>`);
        }
        if (a.wind_speed != null) {
            let dir = '';
            if (typeof a.wind_bearing === 'number') {
                const dirs = (regional[c.lang] || regional.en).windDirections;
                dir = dirs[Math.floor((a.wind_bearing % 360 + 11.25) / 22.5)] + ' ';
            } else if (a.wind_bearing) {
                dir = `${a.wind_bearing} `;
            }
            const unit = a.wind_speed_unit || (this._hass.config.unit_system.length === 'km' ? 'km/h' : 'mph');
            parts.push(`<span class="wind"><ha-icon icon="mdi:weather-windy"></ha-icon>${esc(dir)}${esc(round(a.wind_speed))} ${esc(unit)}</span>`);
        }
        parts.push(`<span class="upd"><ha-icon icon="mdi:refresh"></ha-icon>${esc(this._timeStr(new Date(st.last_updated)))}</span>`);
        const html = parts.join('');
        if (html !== this._detailsKey) {
            this._detailsKey = html;
            this._el.details.innerHTML = html;
        }
    }
}

if (!customElements.get('htc-weather-card')) {
    customElements.define('htc-weather-card', HtcWeatherCard);
    window.customCards = window.customCards || [];
    window.customCards.push({
        type: 'htc-weather-card',
        name: 'HTC Flip Clock & Weather',
        description: 'HTC-style flip clock with current weather and forecast',
        preview: true,
    });
    console.info(
        `%c HTC Flip Clock %c ${VERSION} `,
        'color: white; background: #555555;',
        'color: white; background: #3a7ec6;'
    );
}
