/* =============================================================================
   Երգարան — նվագարկիչի տրամաբանությունը
   Բոլոր տվյալները մնում են քո համակարգչում. ոչինչ ոչ մի տեղ չի ուղարկվում։
   ========================================================================== */
(function () {
  'use strict';

  var JSON_PATH = 'songs.json';
  var PLACEHOLDER = 'placeholder.svg';
  var STORE_PREFIX = 'erger:';

  /* ---------------------------------------------------------------- helpers */

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  var store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(STORE_PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value)); } catch (e) { /* private mode */ }
    }
  };

  function esc(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtTime(seconds) {
    if (!isFinite(seconds) || seconds <= 0) return '0:00';
    var total = Math.floor(seconds);
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    var mm = h ? (m < 10 ? '0' + m : m) : m;
    return (h ? h + ':' : '') + mm + ':' + (s < 10 ? '0' + s : s);
  }

  function parseDuration(value) {
    if (typeof value === 'number' && isFinite(value)) return value;
    if (typeof value !== 'string') return 0;
    var parts = value.split(':').map(Number);
    if (parts.some(isNaN)) return 0;
    return parts.reduce(function (acc, n) { return acc * 60 + n; }, 0);
  }

  function fileTitle(path) {
    var name = String(path || '').split(/[\\/]/).pop();
    return name.replace(/\.[a-z0-9]+$/i, '').replace(/[_]+/g, ' ').trim();
  }

  function setRangeFill(input) {
    var min = Number(input.min) || 0;
    var max = Number(input.max) || 100;
    var pct = max === min ? 0 : ((Number(input.value) - min) / (max - min)) * 100;
    input.style.setProperty('--p', pct);
  }

  var toastTimer;
  function toast(message) {
    var el = $('#toast');
    el.textContent = message;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-on'); }, 2600);
  }

  /* ------------------------------------------------------------------ state */

  var audio = $('#audio');

  var state = {
    songs: [],            // ամբողջ հավաքածուն
    view: [],             // ցուցադրվող երգերի id-ները՝ ընթացիկ դասավորությամբ
    currentId: null,
    wantsPlay: false,
    seeking: false,
    scope: store.get('scope', 'all'),
    search: '',
    artist: '',
    genre: '',
    sort: store.get('sort', 'custom'),
    layout: store.get('layout', 'list'),
    shuffle: store.get('shuffle', false),
    repeat: store.get('repeat', 'off'),   // off | all | one
    favorites: new Set(store.get('favorites', [])),
    plays: store.get('plays', {}),
    recent: store.get('recent', []),
    durations: store.get('durations', {}),
    shuffleHistory: [],
    sleepAtEnd: false,
    sleepTimer: null,
    countedPlay: false
  };

  function byId(id) {
    for (var i = 0; i < state.songs.length; i++) {
      if (state.songs[i].id === id) return state.songs[i];
    }
    return null;
  }

  /* ----------------------------------------------------------- տվյալների բեռնում */

  function normalize(raw, index) {
    var src = raw.src || raw.file || raw.url || raw.path || '';
    var lyrics = Array.isArray(raw.lyrics) ? raw.lyrics.join('\n') : (raw.lyrics || '');
    var id = String(raw.id || src || ('song-' + index));
    return {
      id: id,
      title: String(raw.title || raw.name || fileTitle(src) || 'Անանուն երգ'),
      artist: String(raw.artist || raw.singer || 'Անհայտ կատարող'),
      album: String(raw.album || ''),
      genre: String(raw.genre || ''),
      year: raw.year || '',
      duration: parseDuration(raw.duration) || state.durations[src] || 0,
      src: src,
      cover: raw.cover || raw.image || raw.art || '',
      lyrics: lyrics,
      local: false,
      missing: false,
      order: index
    };
  }

  function setSongs(list, libraryName) {
    var seen = {};
    state.songs = list.map(normalize).filter(function (song) {
      if (!song.src || seen[song.id]) return false;
      seen[song.id] = true;
      return true;
    });
    if (libraryName) {
      $('#library-sub').textContent = libraryName;
      document.title = libraryName + ' — Երգարան';
    }
    fillFilters();
    render();
    restoreLast();
    loadMissingDurations();
  }

  function readLibrary(data) {
    var list = Array.isArray(data) ? data : (data.songs || data.tracks || data.list || []);
    if (!Array.isArray(list)) throw new Error('bad shape');
    setSongs(list, Array.isArray(data) ? '' : data.name);
  }

  function loadLibrary() {
    fetch(JSON_PATH, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        readLibrary(data);
        $('#overlay').hidden = true;
      })
      .catch(function (err) {
        showLoadProblem(err);
      });
  }

  function showLoadProblem(err) {
    var overlay = $('#overlay');
    var isFile = location.protocol === 'file:';
    $('#overlay-title').textContent = isFile ? 'Ցանկը չբեռնվեց' : 'songs.json-ը չկարդացվեց';
    $('#overlay-text').innerHTML = isFile
      ? 'Դիտարկիչը արգելում է <code>file://</code> հասցեով JSON ֆայլ կարդալը։ Գործարկիր տեղային սերվերը կամ ընտրիր <code>songs.json</code>-ը ձեռքով։'
      : 'Ստուգիր <code>songs.json</code>-ի ճանապարհն ու շարահյուսությունը։ Սխալը՝ ' + esc(err.message) + '։';
    overlay.hidden = false;
  }

  /* --------------------------------------------------------------- ֆիլտրեր */

  function uniqueValues(field) {
    var seen = {};
    state.songs.forEach(function (song) {
      var v = song[field];
      if (v) seen[v] = true;
    });
    return Object.keys(seen).sort(function (a, b) { return a.localeCompare(b, 'hy'); });
  }

  function fillFilters() {
    [['#filter-artist', 'artist'], ['#filter-genre', 'genre']].forEach(function (pair) {
      var select = $(pair[0]);
      var current = select.value;
      var options = ['<option value="">Բոլորը</option>'];
      uniqueValues(pair[1]).forEach(function (value) {
        options.push('<option value="' + esc(value) + '">' + esc(value) + '</option>');
      });
      select.innerHTML = options.join('');
      select.value = current;
    });
  }

  function matches(song) {
    if (state.scope === 'fav' && !state.favorites.has(song.id)) return false;
    if (state.scope === 'recent' && state.recent.indexOf(song.id) === -1) return false;
    if (state.artist && song.artist !== state.artist) return false;
    if (state.genre && song.genre !== state.genre) return false;
    if (!state.search) return true;
    var haystack = (song.title + ' ' + song.artist + ' ' + song.album + ' ' + song.genre).toLowerCase();
    return state.search.split(/\s+/).every(function (word) { return haystack.indexOf(word) !== -1; });
  }

  function sortSongs(list) {
    var sorted = list.slice();
    var by = state.sort;
    if (by === 'custom') {
      if (state.scope === 'recent') {
        sorted.sort(function (a, b) { return state.recent.indexOf(a.id) - state.recent.indexOf(b.id); });
      } else {
        sorted.sort(function (a, b) { return a.order - b.order; });
      }
    } else if (by === 'duration') {
      sorted.sort(function (a, b) { return (a.duration || 0) - (b.duration || 0); });
    } else if (by === 'plays') {
      sorted.sort(function (a, b) { return (state.plays[b.id] || 0) - (state.plays[a.id] || 0); });
    } else {
      sorted.sort(function (a, b) {
        return String(a[by]).localeCompare(String(b[by]), 'hy', { sensitivity: 'base' });
      });
    }
    return sorted;
  }

  /* ------------------------------------------------------------------ render */

  function rowHtml(song, index) {
    var isCurrent = song.id === state.currentId;
    var fav = state.favorites.has(song.id);
    var cover = song.cover || PLACEHOLDER;
    var lead = isCurrent
      ? '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>'
      : String(index + 1);
    var duration = song.duration ? fmtTime(song.duration) : '–:--';

    return '<li class="row' + (isCurrent ? ' is-current' : '') + (song.missing ? ' is-error' : '') +
      '" data-id="' + esc(song.id) + '" tabindex="0" role="button" aria-label="' + esc(song.title + ' — ' + song.artist) + '">' +
      '<span class="row__num">' + lead + '</span>' +
      '<span class="row__main">' +
        '<img class="row__cover" src="' + esc(cover) + '" alt="" loading="lazy" onerror="this.src=\'' + PLACEHOLDER + '\'">' +
        '<span class="row__text">' +
          '<span class="row__title">' + esc(song.title) + '</span>' +
          '<span class="row__artist">' + esc(song.artist) + (song.year ? ' · ' + esc(song.year) : '') + '</span>' +
        '</span>' +
      '</span>' +
      '<span class="row__album">' + esc(song.album) + '</span>' +
      '<span class="row__genre">' + esc(song.genre) + '</span>' +
      '<span class="row__time" data-time="' + esc(song.id) + '">' + duration + '</span>' +
      '<button class="icon-btn row__fav" type="button" data-fav="' + esc(song.id) + '" aria-pressed="' + fav + '" ' +
        'aria-label="' + (fav ? 'Հանել սիրածներից' : 'Ավելացնել սիրածներում') + '">' +
        '<svg class="icon"><use href="' + (fav ? '#i-heart-on' : '#i-heart') + '"></use></svg>' +
      '</button>' +
    '</li>';
  }

  function render() {
    var visible = sortSongs(state.songs.filter(matches));
    state.view = visible.map(function (song) { return song.id; });

    var list = $('#list');
    list.innerHTML = visible.map(rowHtml).join('');

    var isEmpty = visible.length === 0;
    $('#empty').hidden = !isEmpty;
    if (isEmpty) {
      $('#empty-text').textContent = state.songs.length
        ? 'Այս ֆիլտրերով երգ չկա։ Մաքրիր որոնումը կամ ընտրիր «Բոլորը»։'
        : 'Ավելացրու երգեր songs.json ֆայլում կամ սեղմիր «Ավելացնել ֆայլեր»։';
    }

    var titles = { all: 'Բոլոր երգերը', fav: 'Սիրածները', recent: 'Վերջին լսածները' };
    $('#view-title').textContent = titles[state.scope] || 'Բոլոր երգերը';
    $('#view-count').textContent = visible.length ? visible.length + ' երգ' : '';

    var totalSeconds = state.songs.reduce(function (sum, song) { return sum + (song.duration || 0); }, 0);
    $('#stats').textContent = state.songs.length + ' երգ · ' + state.favorites.size + ' սիրած' +
      (totalSeconds ? ' · ' + fmtTime(totalSeconds) + ' ընդամենը' : '');
  }

  function updateRowStates() {
    $$('.row').forEach(function (row) {
      var isCurrent = row.dataset.id === state.currentId;
      row.classList.toggle('is-current', isCurrent);
      row.classList.toggle('is-paused', isCurrent && !state.wantsPlay);
      var num = row.querySelector('.row__num');
      if (isCurrent && !num.querySelector('.eq')) {
        num.innerHTML = '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>';
      } else if (!isCurrent && num.querySelector('.eq')) {
        num.textContent = String(state.view.indexOf(row.dataset.id) + 1);
      }
    });
  }

  function scrollToCurrent() {
    var row = $('.row.is-current');
    if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* --------------------------------------------------------------- նվագարկում */

  function play(id, autoplay) {
    var song = byId(id);
    if (!song) return;

    if (state.currentId !== id) {
      state.currentId = id;
      state.countedPlay = false;
      audio.src = song.src;
      audio.load();
      updateNowPlaying(song);
      render();
      mediaSession(song);
    }

    if (autoplay === false) return;

    state.wantsPlay = true;
    var promise = audio.play();
    if (promise && promise.catch) {
      promise.catch(function () {
        state.wantsPlay = false;
        document.body.classList.remove('is-playing');
      });
    }
    store.set('lastId', id);
  }

  function togglePlay() {
    if (!state.currentId) {
      if (state.view.length) play(state.view[0]);
      return;
    }
    if (audio.paused) {
      state.wantsPlay = true;
      audio.play();
    } else {
      state.wantsPlay = false;
      audio.pause();
    }
  }

  function neighbour(step) {
    if (!state.view.length) return null;
    if (state.shuffle && step > 0) {
      if (state.view.length === 1) return state.view[0];
      var pick;
      do {
        pick = state.view[Math.floor(Math.random() * state.view.length)];
      } while (pick === state.currentId);
      return pick;
    }
    var index = state.view.indexOf(state.currentId);
    if (index === -1) return state.view[0];
    var next = index + step;
    if (next < 0) next = state.repeat === 'all' ? state.view.length - 1 : 0;
    if (next >= state.view.length) {
      if (state.repeat !== 'all' && !state.shuffle) return null;
      next = 0;
    }
    return state.view[next];
  }

  function next(auto) {
    if (state.shuffle && state.currentId) state.shuffleHistory.push(state.currentId);
    var id = neighbour(1);
    if (!id) {
      state.wantsPlay = false;
      audio.pause();
      audio.currentTime = 0;
      document.body.classList.remove('is-playing');
      return;
    }
    play(id, auto !== false);
    scrollToCurrent();
  }

  function prev() {
    if (audio.currentTime > 3 && !audio.paused) { audio.currentTime = 0; return; }
    var id;
    if (state.shuffle && state.shuffleHistory.length) {
      id = state.shuffleHistory.pop();
    } else {
      id = neighbour(-1);
    }
    if (id) { play(id); scrollToCurrent(); }
  }

  function updateNowPlaying(song) {
    $('#now-title').textContent = song.title;
    $('#now-artist').textContent = song.artist + (song.album ? ' · ' + song.album : '');
    $('#now-cover').src = song.cover || PLACEHOLDER;
    $('#now-cover').onerror = function () { this.src = PLACEHOLDER; };
    var fav = state.favorites.has(song.id);
    var favBtn = $('#now-fav');
    favBtn.setAttribute('aria-pressed', String(fav));
    favBtn.querySelector('use').setAttribute('href', fav ? '#i-heart-on' : '#i-heart');
    applyTint(song.cover || PLACEHOLDER);
    syncNowPlayingScreen();
    renderLyrics();
  }

  function applyTint(cover) {
    var glow = $('#glow');
    if (!cover) return;
    var img = new Image();
    img.onload = function () {
      try {
        var size = 22;
        var canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        var ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, size, size);
        var d = ctx.getImageData(0, 0, size, size).data;
        var r = 0, g = 0, b = 0, weight = 0;
        for (var i = 0; i < d.length; i += 4) {
          var max = Math.max(d[i], d[i + 1], d[i + 2]);
          var min = Math.min(d[i], d[i + 1], d[i + 2]);
          var sat = max ? (max - min) / max : 0;
          var lum = (max + min) / 510;
          var w = sat * sat * (1 - Math.abs(lum - 0.55)) + 0.02;
          r += d[i] * w; g += d[i + 1] * w; b += d[i + 2] * w; weight += w;
        }
        if (!weight) return;
        var rgb = [r / weight, g / weight, b / weight];
        var avg = (rgb[0] + rgb[1] + rgb[2]) / 3;
        rgb = rgb.map(function (v) {
          return Math.max(0, Math.min(255, Math.round(avg + (v - avg) * 1.5)));
        });
        glow.style.opacity = 0;
        setTimeout(function () {
          document.documentElement.style.setProperty('--tint-rgb', rgb.join(', '));
          glow.style.opacity = 1;
        }, 240);
      } catch (e) { /* file:// ռեժիմում նկարը կարդալ չի լինում */ }
    };
    img.src = cover;
  }

  function syncNowPlayingScreen() {
    var song = byId(state.currentId);
    if (!song) return;
    $('#np-cover').src = song.cover || PLACEHOLDER;
    $('#np-title').textContent = song.title;
    $('#np-artist').textContent = song.artist + (song.album ? ' · ' + song.album : '');
    var fav = state.favorites.has(song.id);
    $('#np-fav').setAttribute('aria-pressed', String(fav));
    $('#np-fav').querySelector('use').setAttribute('href', fav ? '#i-heart-on' : '#i-heart');
  }

  function setLayout(mode) {
    state.layout = mode;
    $('#list').classList.toggle('is-grid', mode === 'grid');
    $('.list-head').hidden = mode === 'grid';
    $('#view-list').classList.toggle('is-on', mode === 'list');
    $('#view-grid').classList.toggle('is-on', mode === 'grid');
    $('#view-list').setAttribute('aria-pressed', String(mode === 'list'));
    $('#view-grid').setAttribute('aria-pressed', String(mode === 'grid'));
    store.set('layout', mode);
  }

  function openNowPlaying() {
    if (!state.currentId) return;
    syncNowPlayingScreen();
    $('#np').hidden = false;
  }

  function closeNowPlaying() { $('#np').hidden = true; }

  function countPlay() {
    if (state.countedPlay || !state.currentId) return;
    state.countedPlay = true;
    var id = state.currentId;
    state.plays[id] = (state.plays[id] || 0) + 1;
    state.recent = [id].concat(state.recent.filter(function (x) { return x !== id; })).slice(0, 40);
    store.set('plays', state.plays);
    store.set('recent', state.recent);
  }

  /* --------------------------------------------------------- audio իրադարձություններ */

  audio.addEventListener('play', function () {
    document.body.classList.add('is-playing');
    state.wantsPlay = true;
    updateRowStates();
    startViz();
  });

  audio.addEventListener('pause', function () {
    document.body.classList.remove('is-playing');
    updateRowStates();
    if (!viz.raf && viz.ctx) drawViz();
  });

  audio.addEventListener('timeupdate', function () {
    if (state.seeking) return;
    var total = audio.duration;
    $('#time-now').textContent = fmtTime(audio.currentTime);
    var pos = total ? Math.round((audio.currentTime / total) * 1000) : 0;
    var seek = $('#seek');
    seek.value = pos;
    setRangeFill(seek);
    var npSeek = $('#np-seek');
    npSeek.value = pos;
    setRangeFill(npSeek);
    $('#np-time-now').textContent = fmtTime(audio.currentTime);
    $('#player').style.setProperty('--played', pos / 10);
    if (audio.currentTime > Math.min(8, (audio.duration || 30) * 0.3)) countPlay();
  });

  audio.addEventListener('loadedmetadata', function () {
    var song = byId(state.currentId);
    $('#time-total').textContent = fmtTime(audio.duration);
    $('#np-time-total').textContent = fmtTime(audio.duration);
    if (song && isFinite(audio.duration) && audio.duration > 0) {
      song.duration = audio.duration;
      song.missing = false;
      state.durations[song.src] = audio.duration;
      store.set('durations', state.durations);
      var cell = document.querySelector('[data-time="' + CSS.escape(song.id) + '"]');
      if (cell) cell.textContent = fmtTime(audio.duration);
    }
  });

  audio.addEventListener('ended', function () {
    countPlay();
    if (state.sleepAtEnd) {
      state.sleepAtEnd = false;
      $('#btn-sleep').setAttribute('aria-pressed', 'false');
      toast('Քնի ժամաչափը դադարեցրեց նվագարկումը');
      return;
    }
    if (state.repeat === 'one') {
      audio.currentTime = 0;
      audio.play();
      return;
    }
    next(true);
  });

  audio.addEventListener('error', function () {
    var song = byId(state.currentId);
    if (!song) return;
    song.missing = true;
    render();
    if (/\.(m4a|aac|mp4)$/i.test(song.src) && !audio.canPlayType('audio/mp4; codecs="mp4a.40.2"')) {
      toast('Այս դիտարկիչը m4a ֆայլեր չի նվագարկում. բացիր Chrome-ով կամ Edge-ով');
    } else {
      toast('Չհաջողվեց բացել՝ ' + song.src);
    }
    if (state.wantsPlay) setTimeout(function () { next(true); }, 1200);
  });

  /* -------------------------------------------------------- տևողությունների լրացում */

  function loadMissingDurations() {
    var queue = state.songs.filter(function (song) { return !song.duration && !song.local; });
    if (!queue.length) return;
    var probe = new Audio();
    probe.preload = 'metadata';
    var i = 0;

    function step() {
      if (i >= queue.length) { render(); return; }
      var song = queue[i++];
      var done = false;
      var finish = function () {
        if (done) return;
        done = true;
        probe.removeAttribute('src');
        setTimeout(step, 0);
      };
      probe.onloadedmetadata = function () {
        if (isFinite(probe.duration) && probe.duration > 0) {
          song.duration = probe.duration;
          state.durations[song.src] = probe.duration;
          var cell = document.querySelector('[data-time="' + CSS.escape(song.id) + '"]');
          if (cell) cell.textContent = fmtTime(probe.duration);
        }
        finish();
      };
      probe.onerror = function () { song.missing = true; finish(); };
      setTimeout(function () { finish(); }, 6000);
      probe.src = song.src;
    }
    step();
  }

  /* ------------------------------------------------------------------ սիրածներ */

  function toggleFavorite(id) {
    if (state.favorites.has(id)) state.favorites.delete(id);
    else state.favorites.add(id);
    store.set('favorites', Array.from(state.favorites));
    var song = byId(id);
    if (song && id === state.currentId) updateNowPlaying(song);
    syncNowPlayingScreen();
    if (state.scope === 'fav') render();
    else {
      var btn = document.querySelector('[data-fav="' + CSS.escape(id) + '"]');
      if (btn) {
        var on = state.favorites.has(id);
        btn.setAttribute('aria-pressed', String(on));
        btn.setAttribute('aria-label', on ? 'Հանել սիրածներից' : 'Ավելացնել սիրածներում');
        btn.querySelector('use').setAttribute('href', on ? '#i-heart-on' : '#i-heart');
      }
      $('#stats').textContent = state.songs.length + ' երգ · ' + state.favorites.size + ' սիրած';
    }
  }

  /* --------------------------------------------------------------------- բառեր */

  function renderLyrics() {
    var panel = $('#lyrics-panel');
    if (panel.hidden) return;
    var song = byId(state.currentId);
    var body = $('#lyrics-body');
    if (!song) { body.textContent = 'Ընտրիր երգ, որ բառերը երևան։'; return; }
    if (!song.lyrics) {
      body.innerHTML = '<b>' + esc(song.title) + '</b>Այս երգի բառերը գրված չեն։ Ավելացրու <code>"lyrics"</code> դաշտը songs.json-ում։';
      return;
    }
    body.innerHTML = '<b>' + esc(song.title) + '</b>' + esc(song.lyrics);
  }

  /* --------------------------------------------------------------- տեսաձևավորում */

  var viz = { ctx: null, raf: null, analyser: null, data: null, tried: false };

  function setupCanvas() {
    var canvas = $('#viz');
    var dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    viz.ctx = canvas.getContext('2d');
    viz.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function connectAnalyser() {
    if (viz.tried || location.protocol === 'file:') return;
    viz.tried = true;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      var source = ctx.createMediaElementSource(audio);
      var analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      viz.analyser = analyser;
      viz.audioCtx = ctx;
      viz.data = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) { viz.analyser = null; }
  }

  function drawViz() {
    var canvas = $('#viz');
    var ctx = viz.ctx;
    if (!ctx) return;
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    if (audio.paused) { viz.raf = null; return; }

    var bars = 64;
    var gap = 2;
    var barW = Math.max(2, (w - gap * bars) / bars);
    var accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#f2a65a';
    ctx.fillStyle = accent;

    var values = [];
    if (viz.analyser) {
      viz.analyser.getByteFrequencyData(viz.data);
      for (var i = 0; i < bars; i++) {
        values.push(viz.data[Math.floor(i * viz.data.length / bars)] / 255);
      }
    } else {
      var t = Date.now() / 420;
      for (var j = 0; j < bars; j++) {
        var v = (Math.sin(t + j * 0.45) + Math.sin(t * 0.7 + j * 0.17) + 2) / 4;
        values.push(v * 0.72 + 0.06);
      }
    }

    for (var k = 0; k < bars; k++) {
      var height = Math.max(2, values[k] * h * 0.9);
      ctx.fillRect(k * (barW + gap), h - height, barW, height);
    }

    viz.raf = requestAnimationFrame(drawViz);
  }

  function startViz() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    connectAnalyser();
    if (viz.audioCtx && viz.audioCtx.state === 'suspended') viz.audioCtx.resume();
    if (!viz.raf) drawViz();
  }

  /* ----------------------------------------------------------- media session */

  function mediaSession(song) {
    if (!('mediaSession' in navigator)) return;
    try {
      var art = song.cover || PLACEHOLDER;
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: song.album || '',
        artwork: [{ src: new URL(art, location.href).href, sizes: '400x400', type: art.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg' }]
      });
      navigator.mediaSession.setActionHandler('play', function () { audio.play(); });
      navigator.mediaSession.setActionHandler('pause', function () { audio.pause(); });
      navigator.mediaSession.setActionHandler('previoustrack', prev);
      navigator.mediaSession.setActionHandler('nexttrack', function () { next(true); });
      navigator.mediaSession.setActionHandler('seekto', function (d) {
        if (d.seekTime != null) audio.currentTime = d.seekTime;
      });
    } catch (e) { /* անտեսում ենք */ }
  }

  /* -------------------------------------------------------------- ֆայլեր, JSON */

  function addFiles(files) {
    var added = 0;
    Array.prototype.forEach.call(files, function (file) {
      if (!/^audio\//.test(file.type) && !/\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|weba|webm)$/i.test(file.name)) return;
      var base = fileTitle(file.name);
      var dash = base.split(' - ');
      var song = {
        id: 'local:' + file.name + ':' + file.size,
        title: dash.length > 1 ? dash.slice(1).join(' - ') : base,
        artist: dash.length > 1 ? dash[0] : 'Անհայտ կատարող',
        album: '', genre: '', year: '',
        duration: 0,
        src: URL.createObjectURL(file),
        fileName: file.name,
        cover: '', lyrics: '',
        local: true, missing: false,
        order: state.songs.length + added
      };
      if (!byId(song.id)) { state.songs.push(song); added++; }
    });
    if (!added) { toast('Երաժշտական ֆայլ չգտնվեց'); return; }
    fillFilters();
    render();
    toast(added + ' երգ ավելացվեց այս սեանսի համար');
  }

  function exportJson() {
    var data = {
      name: $('#library-sub').textContent,
      songs: state.songs.map(function (song) {
        var item = {
          id: song.local ? fileTitle(song.fileName) : song.id,
          title: song.title,
          artist: song.artist,
          src: song.local ? song.fileName : song.src
        };
        if (song.album) item.album = song.album;
        if (song.year) item.year = song.year;
        if (song.genre) item.genre = song.genre;
        if (song.duration) item.duration = Math.round(song.duration);
        if (song.cover) item.cover = song.cover;
        if (song.lyrics) item.lyrics = song.lyrics;
        return item;
      })
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'songs.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('songs.json-ը ներբեռնվեց — փոխարինիր հին songs.json-ը դրանով');
  }

  function readJsonFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        readLibrary(JSON.parse(reader.result));
        $('#overlay').hidden = true;
        toast('Ցանկը բեռնվեց');
      } catch (e) {
        toast('JSON-ը սխալ է. ' + e.message);
      }
    };
    reader.readAsText(file);
  }

  /* --------------------------------------------------------------- քնի ժամաչափ */

  function setSleep(value) {
    clearTimeout(state.sleepTimer);
    state.sleepTimer = null;
    state.sleepAtEnd = false;
    var btn = $('#btn-sleep');

    if (value === '0') {
      btn.setAttribute('aria-pressed', 'false');
      toast('Քնի ժամաչափն անջատված է');
    } else if (value === 'end') {
      state.sleepAtEnd = true;
      btn.setAttribute('aria-pressed', 'true');
      toast('Կդադարի այս երգի վերջում');
    } else {
      var minutes = Number(value);
      state.sleepTimer = setTimeout(function () {
        audio.pause();
        state.wantsPlay = false;
        btn.setAttribute('aria-pressed', 'false');
        toast('Քնի ժամաչափը դադարեցրեց նվագարկումը');
      }, minutes * 60000);
      btn.setAttribute('aria-pressed', 'true');
      toast(minutes + ' րոպեից նվագարկումը կդադարի');
    }
    $$('.sleep-options .btn').forEach(function (b) {
      b.classList.toggle('is-on', b.dataset.min === value && value !== '0');
    });
  }

  /* ------------------------------------------------------------------- կապեր */

  function bind() {
    // ցանկի սեղմումներ
    $('#list').addEventListener('click', function (e) {
      var fav = e.target.closest('[data-fav]');
      if (fav) { e.stopPropagation(); toggleFavorite(fav.dataset.fav); return; }
      var row = e.target.closest('.row');
      if (!row) return;
      if (row.dataset.id === state.currentId) togglePlay();
      else play(row.dataset.id);
    });

    $('#list').addEventListener('keydown', function (e) {
      var row = e.target.closest('.row');
      if (!row) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        play(row.dataset.id);
      } else if (e.key === 'ArrowDown' && row.nextElementSibling) {
        e.preventDefault(); row.nextElementSibling.focus();
      } else if (e.key === 'ArrowUp' && row.previousElementSibling) {
        e.preventDefault(); row.previousElementSibling.focus();
      }
    });

    // նվագարկման կոճակներ
    $('#btn-play').addEventListener('click', togglePlay);
    $('#btn-next').addEventListener('click', function () { next(true); });
    $('#btn-prev').addEventListener('click', prev);

    $('#btn-shuffle').addEventListener('click', function () {
      state.shuffle = !state.shuffle;
      this.setAttribute('aria-pressed', String(state.shuffle));
      $('#np-shuffle').setAttribute('aria-pressed', String(state.shuffle));
      store.set('shuffle', state.shuffle);
      toast(state.shuffle ? 'Խառը նվագարկում' : 'Հերթականությամբ');
    });

    $('#btn-repeat').addEventListener('click', function () {
      var order = ['off', 'all', 'one'];
      state.repeat = order[(order.indexOf(state.repeat) + 1) % 3];
      applyRepeat();
      store.set('repeat', state.repeat);
      toast({ off: 'Կրկնությունն անջատված է', all: 'Կրկնել ամբողջ ցանկը', one: 'Կրկնել այս երգը' }[state.repeat]);
    });

    // ընթացքի գծերը (նվագարկիչում և մեծ էկրանին)
    ['#seek', '#np-seek'].forEach(function (sel) {
      var bar = $(sel);
      bar.addEventListener('input', function () {
        state.seeking = true;
        setRangeFill(bar);
        if (audio.duration) {
          var t = fmtTime(bar.value / 1000 * audio.duration);
          $('#time-now').textContent = t;
          $('#np-time-now').textContent = t;
        }
      });
      var commit = function () {
        if (audio.duration) audio.currentTime = bar.value / 1000 * audio.duration;
        state.seeking = false;
      };
      bar.addEventListener('change', commit);
      bar.addEventListener('pointerup', commit);
    });

    // ձայն
    var volume = $('#volume');
    volume.addEventListener('input', function () {
      audio.volume = volume.value / 100;
      audio.muted = false;
      document.body.classList.remove('is-muted');
      setRangeFill(volume);
      store.set('volume', Number(volume.value));
    });

    $('#btn-mute').addEventListener('click', function () {
      audio.muted = !audio.muted;
      document.body.classList.toggle('is-muted', audio.muted);
      store.set('muted', audio.muted);
    });

    $('#speed').addEventListener('change', function () {
      audio.playbackRate = Number(this.value);
      store.set('speed', this.value);
    });

    $('#now-fav').addEventListener('click', function () {
      if (state.currentId) toggleFavorite(state.currentId);
    });

    // որոնում և ֆիլտրեր
    var onSearch = function (value) {
      state.search = value.trim().toLowerCase();
      $('#search').value = value;
      $('#search-mobile').value = value;
      render();
    };
    $('#search').addEventListener('input', function () { onSearch(this.value); });
    $('#search-mobile').addEventListener('input', function () { onSearch(this.value); });

    $$('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        state.scope = chip.dataset.scope;
        $$('.chip').forEach(function (c) { c.classList.toggle('is-on', c === chip); });
        store.set('scope', state.scope);
        render();
      });
    });

    $('#filter-artist').addEventListener('change', function () { state.artist = this.value; render(); });
    $('#filter-genre').addEventListener('change', function () { state.genre = this.value; render(); });
    $('#sort').addEventListener('change', function () {
      state.sort = this.value;
      store.set('sort', state.sort);
      render();
    });

    // ֆայլեր
    $('#add-files').addEventListener('click', function () { $('#file-audio').click(); });
    $('#file-audio').addEventListener('change', function () { addFiles(this.files); this.value = ''; });
    $('#load-json').addEventListener('click', function () { $('#file-json').click(); });
    $('#overlay-pick').addEventListener('click', function () { $('#file-json').click(); });
    $('#file-json').addEventListener('change', function () {
      if (this.files[0]) readJsonFile(this.files[0]);
      this.value = '';
    });
    $('#export-json').addEventListener('click', exportJson);

    // քաշել-թողնել
    ['dragenter', 'dragover'].forEach(function (type) {
      document.addEventListener(type, function (e) {
        e.preventDefault();
        document.body.classList.add('is-dragging');
      });
    });
    ['dragleave', 'drop'].forEach(function (type) {
      document.addEventListener(type, function (e) {
        if (type === 'drop') e.preventDefault();
        if (e.relatedTarget === null || type === 'drop') document.body.classList.remove('is-dragging');
      });
    });
    document.addEventListener('drop', function (e) {
      var files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      var json = Array.prototype.filter.call(files, function (f) { return /\.json$/i.test(f.name); })[0];
      if (json) readJsonFile(json);
      else addFiles(files);
    });

    // ցանկի տեսքը
    $('#view-list').addEventListener('click', function () { setLayout('list'); });
    $('#view-grid').addEventListener('click', function () { setLayout('grid'); });

    // ընթացիկ երգի մեծ էկրանը
    $('#open-np').addEventListener('click', openNowPlaying);
    $('#now-meta').addEventListener('click', openNowPlaying);
    $('#np-close').addEventListener('click', closeNowPlaying);
    $('#np-play').addEventListener('click', togglePlay);
    $('#np-next').addEventListener('click', function () { next(true); });
    $('#np-prev').addEventListener('click', prev);
    $('#np-shuffle').addEventListener('click', function () { $('#btn-shuffle').click(); });
    $('#np-repeat').addEventListener('click', function () { $('#btn-repeat').click(); });
    $('#np-mute').addEventListener('click', function () { $('#btn-mute').click(); });
    $('#np-sleep').addEventListener('click', function () { $('#sleep-dialog').showModal(); });
    $('#np-fav').addEventListener('click', function () {
      if (state.currentId) toggleFavorite(state.currentId);
    });
    $('#np-lyrics').addEventListener('click', function () {
      closeNowPlaying();
      if ($('#lyrics-panel').hidden) $('#btn-lyrics').click();
    });

    // վահանակներ
    $('#btn-lyrics').addEventListener('click', function () {
      var panel = $('#lyrics-panel');
      panel.hidden = !panel.hidden;
      this.setAttribute('aria-pressed', String(!panel.hidden));
      renderLyrics();
    });
    $('#lyrics-close').addEventListener('click', function () {
      $('#lyrics-panel').hidden = true;
      $('#btn-lyrics').setAttribute('aria-pressed', 'false');
    });

    $('#btn-sleep').addEventListener('click', function () { $('#sleep-dialog').showModal(); });
    $('#sleep-close').addEventListener('click', function () { $('#sleep-dialog').close(); });
    $$('.sleep-options .btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setSleep(btn.dataset.min);
        $('#sleep-dialog').close();
      });
    });

    $('#help-open').addEventListener('click', function () { $('#help').showModal(); });
    $('#help-close').addEventListener('click', function () { $('#help').close(); });

    // ձևավորում
    $('#theme').addEventListener('click', function () {
      var next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
      document.body.dataset.theme = next;
      store.set('theme', next);
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = next === 'dark' ? '#0d1a20' : '#eaf0ef';
    });

    // շարժական ընտրացանկ
    $('#rail-open').addEventListener('click', function () { document.body.classList.add('rail-open'); });
    $('#rail-close').addEventListener('click', function () { document.body.classList.remove('rail-open'); });
    $('#list').addEventListener('pointerdown', function () { document.body.classList.remove('rail-open'); });

    // ստեղնաշար
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'select' || tag === 'textarea';
      if (e.key === '/' && !typing) { e.preventDefault(); $('#search').focus(); return; }
      if (typing) {
        if (e.key === 'Escape') { e.target.blur(); }
        return;
      }
      if (document.querySelector('dialog[open]')) return;
      if (e.key === 'Escape' && !$('#np').hidden) { closeNowPlaying(); return; }

      switch (e.key) {
        case ' ': e.preventDefault(); togglePlay(); break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) next(true);
          else audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) prev();
          else audio.currentTime = Math.max(0, audio.currentTime - 5);
          break;
        case 'ArrowUp': case 'ArrowDown': {
          e.preventDefault();
          var vol = $('#volume');
          vol.value = Math.min(100, Math.max(0, Number(vol.value) + (e.key === 'ArrowUp' ? 5 : -5)));
          vol.dispatchEvent(new Event('input'));
          break;
        }
        default: break;
      }

      var key = e.key.toLowerCase();
      if (key === 'm') $('#btn-mute').click();
      if (key === 's') $('#btn-shuffle').click();
      if (key === 'r') $('#btn-repeat').click();
      if (key === 'l') $('#btn-lyrics').click();
      if (key === 'f' && state.currentId) toggleFavorite(state.currentId);
      if (key === '?') $('#help').showModal();
    });

    window.addEventListener('resize', setupCanvas);
    window.addEventListener('beforeunload', function () {
      store.set('lastTime', audio.currentTime);
    });
  }

  function applyRepeat() {
    var btn = $('#btn-repeat');
    btn.dataset.mode = state.repeat;
    btn.setAttribute('aria-pressed', String(state.repeat !== 'off'));
    $('#np-repeat').setAttribute('aria-pressed', String(state.repeat !== 'off'));
    $('#repeat-badge').hidden = state.repeat !== 'one';
  }

  function restoreLast() {
    var lastId = store.get('lastId', null);
    if (!lastId || !byId(lastId)) return;
    play(lastId, false);
    var t = store.get('lastTime', 0);
    if (t > 0) {
      audio.addEventListener('loadedmetadata', function once() {
        audio.removeEventListener('loadedmetadata', once);
        if (t < audio.duration - 2) audio.currentTime = t;
      });
    }
  }

  /* -------------------------------------------------------------------- init */

  function init() {
    document.body.dataset.theme = store.get('theme', 'dark');

    var volume = $('#volume');
    volume.value = store.get('volume', 80);
    audio.volume = volume.value / 100;
    audio.muted = store.get('muted', false);
    document.body.classList.toggle('is-muted', audio.muted);
    setRangeFill(volume);
    setRangeFill($('#seek'));

    var speed = store.get('speed', '1');
    $('#speed').value = speed;
    audio.playbackRate = Number(speed);

    $('#sort').value = state.sort;
    setLayout(state.layout);
    $('#btn-shuffle').setAttribute('aria-pressed', String(state.shuffle));
    applyRepeat();
    $$('.chip').forEach(function (chip) {
      chip.classList.toggle('is-on', chip.dataset.scope === state.scope);
    });

    setupCanvas();
    bind();
    loadLibrary();
  }


  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
