/* =============================================================================
   Երգարան — նվագարկիչ, ադմին պանել, 3 լեզու
   Ամեն ինչ մնում է քո համակարգչում. ոչինչ ոչ մի տեղ չի ուղարկվում։
   ========================================================================== */
(function () {
  'use strict';

  var JSON_PATH = 'songs.json';
  var PLACEHOLDER = 'placeholder.svg';
  var STORE_PREFIX = 'erger:';
  var ADMIN_HASH = 'jrv83x';   // Narek :: harutyunyan2009

  /* ------------------------------------------------------------- օգնականներ */

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
      try { localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    }
  };

  function esc(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
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
    toastTimer = setTimeout(function () { el.classList.remove('is-on'); }, 2800);
  }

  /* --------------------------------------------------------------- լեզուներ */

  var I18N = {
    hy: {
      app_sub: 'տեղային հավաքածու', search_ph: 'Երգ կամ կատարող', search_ph_short: 'Փնտրել…',
      scope_all: 'Բոլորը', scope_fav: 'Սիրածները', scope_recent: 'Վերջինները',
      lbl_artist: 'Կատարող', lbl_genre: 'Ժանր', lbl_sort: 'Դասավորել', lbl_lang: 'Լեզու', lbl_theme: 'Ձևավորում',
      opt_all: 'Բոլորը', sort_custom: 'Ինչպես ցանկում է', sort_title: 'Անունով', sort_artist: 'Կատարողով',
      sort_album: 'Ալբոմով', sort_duration: 'Տևողությամբ', sort_plays: 'Նվագարկումներով',
      add_files: 'Ավելացնել ֆայլեր', save_json: 'Պահպանել songs.json', load_json: 'Բացել այլ songs.json',
      theme_day: 'Օր', theme_night: 'Գիշեր',
      title_all: 'Բոլոր երգերը', title_fav: 'Սիրածները', title_recent: 'Վերջին լսածները',
      count_songs: '{n} երգ', stats: '{n} երգ · {f} սիրած', stats_time: '{n} երգ · {f} սիրած · {t}',
      col_song: 'Երգ', col_album: 'Ալբոմ', col_genre: 'Ժանր', col_duration: 'Տևողություն',
      empty_title: 'Այստեղ դատարկ է', empty_filter: 'Այս ֆիլտրերով երգ չկա։ Մաքրիր որոնումը կամ ընտրիր «Բոլորը»։',
      empty_none: 'Ավելացրու երգեր ադմին պանելից կամ songs.json ֆայլում։',
      dropzone: 'Կարող ես նաև երաժշտական ֆայլերը քաշել ու թողնել այս պատուհանում։',
      np_label: 'Հիմա նվագարկվում է', pick_song: 'Ընտրիր երգ', pick_hint: 'Սեղմիր ցանկի ցանկացած տողի վրա',
      unknown_artist: 'Անհայտ կատարող', untitled: 'Անանուն երգ', close: 'Փակել',
      lyrics_title: 'Բառերը', lyrics_pick: 'Ընտրիր երգ, որ բառերը երևան։',
      lyrics_none: 'Այս երգի բառերը գրված չեն։',
      help_title: 'Ստեղնաշարի կոճակները', key_space: 'Բացատ', key_space_d: 'նվագարկել կամ դադարեցնել',
      key_seek_d: '5 վայրկյան առաջ կամ ետ', key_next_d: 'հաջորդ երգը', key_prev_d: 'նախորդ երգը',
      key_vol_d: 'ձայնը բարձրացնել կամ իջեցնել', key_m_d: 'ձայնն անջատել', key_s_d: 'խառը նվագարկում',
      key_r_d: 'կրկնության ռեժիմ', key_f_d: 'ավելացնել սիրածներում', key_l_d: 'բառերը', key_slash_d: 'անցնել որոնմանը',
      eq_title: 'Ձայնի կարգավորում',
      eq_note: 'Կարգավորումները չեն փոխում ֆայլերը, բայց օգնում են դրանք ավելի լիարժեք հնչել։',
      eq_note_file: 'Ձայնի մշակումն աշխատում է միայն սերվերով բացելիս։',
      eq_flat: 'Առանց', eq_bass: 'Բաս', eq_vocal: 'Ձայն', eq_bright: 'Պայծառ', eq_warm: 'Տաք',
      eq_low: 'Ցածր', eq_mid: 'Միջին', eq_high: 'Բարձր',
      eq_loud: 'Բարձրաձայն ռեժիմ — հավասարեցնում է ձայնը և ավելացնում ուժը։',
      sleep_title: 'Քնի ժամաչափ', sleep_text: 'Նվագարկումը կդադարի ընտրված ժամանակից հետո։',
      sleep_10: '10 րոպե', sleep_20: '20 րոպե', sleep_30: '30 րոպե', sleep_60: '60 րոպե',
      sleep_end: 'Այս երգի վերջում', sleep_off: 'Անջատել',
      overlay_title: 'Ցանկը չբեռնվեց',
      overlay_file: 'Դիտարկիչն արգելում է file:// հասցեով JSON ֆայլ կարդալը։ Գործարկիր տեղային սերվերը կամ ընտրիր songs.json-ը ձեռքով։',
      overlay_err: 'Ստուգիր songs.json-ի ճանապարհն ու շարահյուսությունը։ Սխալը՝ {e}։',
      overlay_pick: 'Ընտրել songs.json',
      overlay_hint: 'Սերվերը գործարկելու համար՝ Windows-ում կրկնակի սեղմիր start-windows.bat, macOS/Linux-ում՝ start-mac-linux.sh։',
      admin_title: 'Ադմին պանել', admin_login: 'Մուտք', admin_login_text: 'Այս բաժինը միայն քեզ համար է։',
      admin_user: 'Օգտանուն', admin_pass: 'Գաղտնաբառ', admin_enter: 'Մուտք գործել',
      admin_wrong: 'Օգտանունը կամ գաղտնաբառը սխալ է։', admin_logout: 'Դուրս գալ',
      admin_add_title: 'Ավելացրու երգեր',
      admin_add_hint: 'Ընտրիր ֆայլերը Downloads-ից կամ քաշիր ու թող այստեղ։ Դրանք պահվում են դիտարկիչում և մնում են նաև էջը փակելուց հետո։',
      admin_pick: 'Ընտրել ֆայլեր', admin_lib: 'Ցանկը',
      admin_badge_added: 'ավելացրած', admin_badge_base: 'songs.json',
      admin_title_ph: 'Երգի անունը', admin_artist_ph: 'Կատարողը',
      admin_restore: 'Վերականգնել ջնջվածները ({n})',
      admin_idb: 'Այս ռեժիմում ավելացրած երգերը կմնան միայն մինչև էջը փակելը։ Մշտական պահելու համար բաց արա սերվերով։',
      t_added: '{n} երգ ավելացվեց', t_no_audio: 'Երաժշտական ֆայլ չգտնվեց',
      t_deleted: 'Երգը ջնջվեց', t_restored: 'Ջնջվածները վերականգնվեցին',
      t_saved: 'Պահպանվեց', t_export: 'songs.json-ը ներբեռնվեց',
      t_json_ok: 'Ցանկը բեռնվեց', t_json_bad: 'JSON-ը սխալ է. {e}',
      t_cant_open: 'Չհաջողվեց բացել՝ {s}', t_no_aac: 'Այս դիտարկիչը m4a/AAC չի նվագարկում. բացիր Chrome-ով',
      t_shuffle_on: 'Խառը նվագարկում', t_shuffle_off: 'Հերթականությամբ',
      t_repeat_off: 'Կրկնությունն անջատված է', t_repeat_all: 'Կրկնել ամբողջ ցանկը', t_repeat_one: 'Կրկնել այս երգը',
      t_sleep_off: 'Քնի ժամաչափն անջատված է', t_sleep_end: 'Կդադարի այս երգի վերջում',
      t_sleep_min: '{n} րոպեից նվագարկումը կդադարի', t_sleep_stop: 'Քնի ժամաչափը դադարեցրեց նվագարկումը',
      a_search: 'Փնտրել երգերի մեջ', a_menu: 'Բացել ընտրացանկը', a_close: 'Փակել', a_help: 'Օգնություն',
      a_admin: 'Ադմին պանել', a_list_view: 'Ցուցակով', a_grid_view: 'Շապիկներով', a_open_np: 'Բացել ընթացիկ երգը',
      a_shuffle: 'Խառը նվագարկում', a_prev: 'Նախորդ երգը', a_play: 'Նվագարկել', a_next: 'Հաջորդ երգը',
      a_repeat: 'Կրկնել', a_fav: 'Սիրածներ', a_lyrics: 'Բառերը', a_eq: 'Ձայնի կարգավորում',
      a_sleep: 'Քնի ժամաչափ', a_mute: 'Ձայնն անջատել', a_volume: 'Ձայնի ուժգնություն',
      a_speed: 'Նվագարկման արագություն', a_seek: 'Երգի ընթացքը', a_delete: 'Ջնջել'
    },

    en: {
      app_sub: 'local library', search_ph: 'Song or artist', search_ph_short: 'Search…',
      scope_all: 'All', scope_fav: 'Favorites', scope_recent: 'Recent',
      lbl_artist: 'Artist', lbl_genre: 'Genre', lbl_sort: 'Sort by', lbl_lang: 'Language', lbl_theme: 'Theme',
      opt_all: 'All', sort_custom: 'Library order', sort_title: 'Title', sort_artist: 'Artist',
      sort_album: 'Album', sort_duration: 'Duration', sort_plays: 'Play count',
      add_files: 'Add files', save_json: 'Save songs.json', load_json: 'Open another songs.json',
      theme_day: 'Day', theme_night: 'Night',
      title_all: 'All songs', title_fav: 'Favorites', title_recent: 'Recently played',
      count_songs: '{n} songs', stats: '{n} songs · {f} favorites', stats_time: '{n} songs · {f} favorites · {t}',
      col_song: 'Song', col_album: 'Album', col_genre: 'Genre', col_duration: 'Duration',
      empty_title: 'Nothing here', empty_filter: 'No songs match these filters. Clear the search or pick “All”.',
      empty_none: 'Add songs from the admin panel or in songs.json.',
      dropzone: 'You can also drag and drop audio files onto this window.',
      np_label: 'Now playing', pick_song: 'Pick a song', pick_hint: 'Tap any row in the list',
      unknown_artist: 'Unknown artist', untitled: 'Untitled', close: 'Close',
      lyrics_title: 'Lyrics', lyrics_pick: 'Pick a song to see its lyrics.',
      lyrics_none: 'No lyrics saved for this song.',
      help_title: 'Keyboard shortcuts', key_space: 'Space', key_space_d: 'play or pause',
      key_seek_d: '5 seconds forward or back', key_next_d: 'next song', key_prev_d: 'previous song',
      key_vol_d: 'volume up or down', key_m_d: 'mute', key_s_d: 'shuffle',
      key_r_d: 'repeat mode', key_f_d: 'add to favorites', key_l_d: 'lyrics', key_slash_d: 'jump to search',
      eq_title: 'Sound settings',
      eq_note: 'These settings do not change the files, they just help them sound fuller.',
      eq_note_file: 'Sound processing only works when the page is opened through the local server.',
      eq_flat: 'Off', eq_bass: 'Bass', eq_vocal: 'Vocal', eq_bright: 'Bright', eq_warm: 'Warm',
      eq_low: 'Low', eq_mid: 'Mid', eq_high: 'High',
      eq_loud: 'Loudness mode — evens out volume between songs and adds power.',
      sleep_title: 'Sleep timer', sleep_text: 'Playback stops after the chosen time.',
      sleep_10: '10 minutes', sleep_20: '20 minutes', sleep_30: '30 minutes', sleep_60: '60 minutes',
      sleep_end: 'At the end of this song', sleep_off: 'Turn off',
      overlay_title: 'The library did not load',
      overlay_file: 'The browser blocks reading JSON over file://. Start the local server or pick songs.json manually.',
      overlay_err: 'Check the path and syntax of songs.json. Error: {e}.',
      overlay_pick: 'Choose songs.json',
      overlay_hint: 'To start the server: double-click start-windows.bat on Windows, or start-mac-linux.sh on macOS/Linux.',
      admin_title: 'Admin panel', admin_login: 'Sign in', admin_login_text: 'This section is only for you.',
      admin_user: 'Username', admin_pass: 'Password', admin_enter: 'Sign in',
      admin_wrong: 'Wrong username or password.', admin_logout: 'Sign out',
      admin_add_title: 'Add songs',
      admin_add_hint: 'Pick files from Downloads or drop them here. They are stored in the browser and stay after you close the page.',
      admin_pick: 'Choose files', admin_lib: 'Library',
      admin_badge_added: 'added', admin_badge_base: 'songs.json',
      admin_title_ph: 'Song title', admin_artist_ph: 'Artist',
      admin_restore: 'Restore deleted ({n})',
      admin_idb: 'In this mode added songs only last until you close the page. Open through the server to keep them.',
      t_added: '{n} songs added', t_no_audio: 'No audio files found',
      t_deleted: 'Song deleted', t_restored: 'Deleted songs restored',
      t_saved: 'Saved', t_export: 'songs.json downloaded',
      t_json_ok: 'Library loaded', t_json_bad: 'Invalid JSON: {e}',
      t_cant_open: 'Could not open: {s}', t_no_aac: 'This browser cannot play m4a/AAC — try Chrome',
      t_shuffle_on: 'Shuffle on', t_shuffle_off: 'Shuffle off',
      t_repeat_off: 'Repeat off', t_repeat_all: 'Repeat the whole list', t_repeat_one: 'Repeat this song',
      t_sleep_off: 'Sleep timer off', t_sleep_end: 'Will stop at the end of this song',
      t_sleep_min: 'Playback stops in {n} minutes', t_sleep_stop: 'Sleep timer stopped playback',
      a_search: 'Search songs', a_menu: 'Open menu', a_close: 'Close', a_help: 'Help',
      a_admin: 'Admin panel', a_list_view: 'List view', a_grid_view: 'Grid view', a_open_np: 'Open now playing',
      a_shuffle: 'Shuffle', a_prev: 'Previous song', a_play: 'Play', a_next: 'Next song',
      a_repeat: 'Repeat', a_fav: 'Favorite', a_lyrics: 'Lyrics', a_eq: 'Sound settings',
      a_sleep: 'Sleep timer', a_mute: 'Mute', a_volume: 'Volume',
      a_speed: 'Playback speed', a_seek: 'Track position', a_delete: 'Delete'
    },

    ru: {
      app_sub: 'локальная коллекция', search_ph: 'Песня или артист', search_ph_short: 'Поиск…',
      scope_all: 'Все', scope_fav: 'Любимые', scope_recent: 'Недавние',
      lbl_artist: 'Артист', lbl_genre: 'Жанр', lbl_sort: 'Сортировка', lbl_lang: 'Язык', lbl_theme: 'Оформление',
      opt_all: 'Все', sort_custom: 'Как в списке', sort_title: 'По названию', sort_artist: 'По артисту',
      sort_album: 'По альбому', sort_duration: 'По длительности', sort_plays: 'По прослушиваниям',
      add_files: 'Добавить файлы', save_json: 'Сохранить songs.json', load_json: 'Открыть другой songs.json',
      theme_day: 'День', theme_night: 'Ночь',
      title_all: 'Все песни', title_fav: 'Любимые', title_recent: 'Недавно прослушанные',
      count_songs: 'песен: {n}', stats: 'песен: {n} · любимых: {f}', stats_time: 'песен: {n} · любимых: {f} · {t}',
      col_song: 'Песня', col_album: 'Альбом', col_genre: 'Жанр', col_duration: 'Длительность',
      empty_title: 'Здесь пусто', empty_filter: 'Ничего не найдено. Очисти поиск или выбери «Все».',
      empty_none: 'Добавь песни через админ-панель или в songs.json.',
      dropzone: 'Можно просто перетащить аудиофайлы в это окно.',
      np_label: 'Сейчас играет', pick_song: 'Выбери песню', pick_hint: 'Нажми на любую строку списка',
      unknown_artist: 'Неизвестный артист', untitled: 'Без названия', close: 'Закрыть',
      lyrics_title: 'Текст', lyrics_pick: 'Выбери песню, чтобы увидеть текст.',
      lyrics_none: 'Текст для этой песни не добавлен.',
      help_title: 'Горячие клавиши', key_space: 'Пробел', key_space_d: 'играть или пауза',
      key_seek_d: '5 секунд вперёд или назад', key_next_d: 'следующая песня', key_prev_d: 'предыдущая песня',
      key_vol_d: 'громкость больше или меньше', key_m_d: 'выключить звук', key_s_d: 'случайный порядок',
      key_r_d: 'режим повтора', key_f_d: 'в любимые', key_l_d: 'текст песни', key_slash_d: 'перейти к поиску',
      eq_title: 'Настройки звука',
      eq_note: 'Настройки не меняют файлы, но помогают им звучать полнее.',
      eq_note_file: 'Обработка звука работает только при открытии через локальный сервер.',
      eq_flat: 'Без', eq_bass: 'Бас', eq_vocal: 'Вокал', eq_bright: 'Ярко', eq_warm: 'Тепло',
      eq_low: 'Низкие', eq_mid: 'Средние', eq_high: 'Высокие',
      eq_loud: 'Громкий режим — выравнивает громкость между песнями и добавляет силы.',
      sleep_title: 'Таймер сна', sleep_text: 'Воспроизведение остановится через выбранное время.',
      sleep_10: '10 минут', sleep_20: '20 минут', sleep_30: '30 минут', sleep_60: '60 минут',
      sleep_end: 'В конце этой песни', sleep_off: 'Выключить',
      overlay_title: 'Список не загрузился',
      overlay_file: 'Браузер запрещает читать JSON через file://. Запусти локальный сервер или выбери songs.json вручную.',
      overlay_err: 'Проверь путь и синтаксис songs.json. Ошибка: {e}.',
      overlay_pick: 'Выбрать songs.json',
      overlay_hint: 'Чтобы запустить сервер: на Windows — start-windows.bat, на macOS/Linux — start-mac-linux.sh.',
      admin_title: 'Админ-панель', admin_login: 'Вход', admin_login_text: 'Этот раздел только для тебя.',
      admin_user: 'Имя пользователя', admin_pass: 'Пароль', admin_enter: 'Войти',
      admin_wrong: 'Неверное имя или пароль.', admin_logout: 'Выйти',
      admin_add_title: 'Добавить песни',
      admin_add_hint: 'Выбери файлы из Downloads или перетащи их сюда. Они хранятся в браузере и остаются после закрытия страницы.',
      admin_pick: 'Выбрать файлы', admin_lib: 'Список',
      admin_badge_added: 'добавлено', admin_badge_base: 'songs.json',
      admin_title_ph: 'Название песни', admin_artist_ph: 'Артист',
      admin_restore: 'Вернуть удалённые ({n})',
      admin_idb: 'В этом режиме добавленные песни живут только до закрытия страницы. Открой через сервер, чтобы они сохранялись.',
      t_added: 'добавлено песен: {n}', t_no_audio: 'Аудиофайлы не найдены',
      t_deleted: 'Песня удалена', t_restored: 'Удалённые песни возвращены',
      t_saved: 'Сохранено', t_export: 'songs.json скачан',
      t_json_ok: 'Список загружен', t_json_bad: 'Ошибка в JSON: {e}',
      t_cant_open: 'Не удалось открыть: {s}', t_no_aac: 'Этот браузер не играет m4a/AAC — открой в Chrome',
      t_shuffle_on: 'Случайный порядок', t_shuffle_off: 'По порядку',
      t_repeat_off: 'Повтор выключен', t_repeat_all: 'Повторять весь список', t_repeat_one: 'Повторять эту песню',
      t_sleep_off: 'Таймер сна выключен', t_sleep_end: 'Остановится в конце этой песни',
      t_sleep_min: 'Воспроизведение остановится через {n} минут', t_sleep_stop: 'Таймер сна остановил воспроизведение',
      a_search: 'Поиск по песням', a_menu: 'Открыть меню', a_close: 'Закрыть', a_help: 'Помощь',
      a_admin: 'Админ-панель', a_list_view: 'Списком', a_grid_view: 'Обложками', a_open_np: 'Открыть текущую песню',
      a_shuffle: 'Случайный порядок', a_prev: 'Предыдущая песня', a_play: 'Играть', a_next: 'Следующая песня',
      a_repeat: 'Повтор', a_fav: 'В любимые', a_lyrics: 'Текст', a_eq: 'Настройки звука',
      a_sleep: 'Таймер сна', a_mute: 'Выключить звук', a_volume: 'Громкость',
      a_speed: 'Скорость', a_seek: 'Позиция трека', a_delete: 'Удалить'
    }
  };

  function t(key, params) {
    var dict = I18N[state.lang] || I18N.hy;
    var text = dict[key] !== undefined ? dict[key] : (I18N.hy[key] !== undefined ? I18N.hy[key] : key);
    if (params) {
      Object.keys(params).forEach(function (name) {
        text = text.replace('{' + name + '}', params[name]);
      });
    }
    return text;
  }

  function applyLang(lang) {
    state.lang = I18N[lang] ? lang : 'hy';
    store.set('lang', state.lang);
    document.documentElement.lang = state.lang;

    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-ph]').forEach(function (el) { el.placeholder = t(el.dataset.i18nPh); });
    $$('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });

    $$('.segmented [data-lang]').forEach(function (b) {
      b.classList.toggle('is-on', b.dataset.lang === state.lang);
    });

    fillFilters();
    render();
    var song = byId(state.currentId);
    if (song) updateNowPlaying(song);
    else {
      $('#now-title').textContent = t('pick_song');
      $('#now-artist').textContent = t('pick_hint');
    }
    $('#eq-note').textContent = location.protocol === 'file:' ? t('eq_note_file') : t('eq_note');
    $('#overlay-title').textContent = t('overlay_title');
    $('#overlay-hint').textContent = t('overlay_hint');
    applyEq(false);
    if (!$('#admin').hidden) renderAdmin();
  }

  /* ---------------------------------------------------------------- վիճակը */

  var audio = $('#audio');

  var state = {
    songs: [],
    view: [],
    currentId: null,
    lang: store.get('lang', 'hy'),
    wantsPlay: false,
    seeking: false,
    scope: store.get('scope', 'all'),
    search: '',
    artist: '',
    genre: '',
    sort: store.get('sort', 'custom'),
    layout: store.get('layout', 'list'),
    shuffle: store.get('shuffle', false),
    repeat: store.get('repeat', 'off'),
    favorites: new Set(store.get('favorites', [])),
    plays: store.get('plays', {}),
    recent: store.get('recent', []),
    durations: store.get('durations', {}),
    hidden: new Set(store.get('hidden', [])),
    overrides: store.get('overrides', {}),
    baseSongs: [],
    addedSongs: [],
    libraryName: '',
    isAdmin: store.get('admin', false),
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

  /* ------------------------------------------------- IndexedDB (ավելացրածները) */

  var DB = {
    ready: null,
    open: function () {
      if (DB.ready) return DB.ready;
      DB.ready = new Promise(function (resolve, reject) {
        try {
          var request = indexedDB.open('ergaran', 1);
          request.onupgradeneeded = function () {
            if (!request.result.objectStoreNames.contains('songs')) {
              request.result.createObjectStore('songs', { keyPath: 'id' });
            }
          };
          request.onsuccess = function () { resolve(request.result); };
          request.onerror = function () { reject(request.error); };
        } catch (e) { reject(e); }
      });
      return DB.ready;
    },
    run: function (mode, fn) {
      return DB.open().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction('songs', mode);
          var req = fn(tx.objectStore('songs'));
          tx.oncomplete = function () { resolve(req && req.result); };
          tx.onerror = function () { reject(tx.error); };
        });
      });
    },
    all: function () { return DB.run('readonly', function (s) { return s.getAll(); }); },
    put: function (item) { return DB.run('readwrite', function (s) { return s.put(item); }); },
    del: function (id) { return DB.run('readwrite', function (s) { return s.delete(id); }); }
  };

  /* --------------------------------------------------------- տվյալների բեռնում */

  function letterCover(text, seedText) {
    var letter = String(text || '♪').trim().charAt(0).toUpperCase() || '♪';
    var seed = hash(seedText || text || 'x');
    var pairs = [['#1f4b57', '#0c2129'], ['#3a2a46', '#141026'], ['#153f37', '#08211d'],
                 ['#4a2f22', '#1d1310'], ['#22374f', '#0b1622'], ['#432434', '#1a0d14'],
                 ['#1b4740', '#0a1f1c'], ['#37324e', '#13111f']];
    var pair = pairs[Math.abs(parseInt(seed, 36)) % pairs.length];
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 460">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + pair[0] + '"/><stop offset="1" stop-color="' + pair[1] + '"/>' +
      '</linearGradient></defs><rect width="460" height="460" fill="url(#g)"/>' +
      '<g fill="none" stroke="#ffffff" stroke-opacity=".07" stroke-width="34">' +
      '<circle cx="230" cy="230" r="300"/><circle cx="230" cy="230" r="220"/><circle cx="230" cy="230" r="140"/></g>' +
      '<text x="230" y="230" text-anchor="middle" dominant-baseline="central" font-family="Georgia, serif" ' +
      'font-size="190" fill="#ffffff" fill-opacity=".9">' + esc(letter) + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function normalize(raw, index) {
    var src = raw.src || raw.file || raw.url || raw.path || '';
    var lyrics = Array.isArray(raw.lyrics) ? raw.lyrics.join('\n') : (raw.lyrics || '');
    var id = String(raw.id || src || ('song-' + index));
    return {
      id: id,
      title: String(raw.title || raw.name || fileTitle(src) || t('untitled')),
      artist: String(raw.artist || raw.singer || t('unknown_artist')),
      album: String(raw.album || ''),
      genre: String(raw.genre || ''),
      year: raw.year || '',
      duration: parseDuration(raw.duration) || state.durations[src] || 0,
      src: src,
      cover: raw.cover || raw.image || raw.art || '',
      lyrics: lyrics,
      added: false,
      missing: false,
      order: index
    };
  }

  function rebuild() {
    var all = state.baseSongs.concat(state.addedSongs);
    var seen = {};
    state.songs = all.filter(function (song) {
      if (!song.src || seen[song.id] || state.hidden.has(song.id)) return false;
      seen[song.id] = true;
      return true;
    }).map(function (song) {
      var over = state.overrides[song.id];
      if (over) {
        if (over.title) song.title = over.title;
        if (over.artist) song.artist = over.artist;
      }
      return song;
    });
    fillFilters();
    render();
    if (!$('#admin').hidden) renderAdmin();
  }

  function readLibrary(data) {
    var list = Array.isArray(data) ? data : (data.songs || data.tracks || data.list || []);
    if (!Array.isArray(list)) throw new Error('bad shape');
    state.baseSongs = list.map(normalize);
    state.libraryName = Array.isArray(data) ? '' : (data.name || '');
    if (state.libraryName) {
      $('#library-sub').textContent = state.libraryName;
      $('#library-sub').removeAttribute('data-i18n');
      document.title = state.libraryName + ' — Երգարան';
    }
    rebuild();
    restoreLast();
    loadMissingDurations();
  }

  function loadAdded() {
    return DB.all().then(function (items) {
      state.addedSongs = (items || []).sort(function (a, b) { return a.addedAt - b.addedAt; })
        .map(function (item, i) {
          return {
            id: item.id,
            title: item.title,
            artist: item.artist,
            album: item.album || '',
            genre: item.genre || '',
            year: '',
            duration: item.duration || 0,
            src: URL.createObjectURL(item.blob),
            cover: letterCover(item.artist || item.title, item.id),
            lyrics: item.lyrics || '',
            fileName: item.name,
            added: true,
            missing: false,
            order: 100000 + i
          };
        });
      rebuild();
    }).catch(function () {
      $('#admin-warn').hidden = false;
      $('#admin-warn').textContent = t('admin_idb');
    });
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
        $('#overlay-title').textContent = t('overlay_title');
        $('#overlay-text').textContent = location.protocol === 'file:'
          ? t('overlay_file') : t('overlay_err', { e: err.message });
        $('#overlay-hint').textContent = t('overlay_hint');
        $('#overlay').hidden = false;
      })
      .then(loadAdded);
  }

  /* ---------------------------------------------------------------- ֆիլտրեր */

  function uniqueValues(field) {
    var seen = {};
    state.songs.forEach(function (song) { if (song[field]) seen[song[field]] = true; });
    return Object.keys(seen).sort(function (a, b) { return a.localeCompare(b, 'hy'); });
  }

  function fillFilters() {
    [['#filter-artist', 'artist'], ['#filter-genre', 'genre']].forEach(function (pair) {
      var select = $(pair[0]);
      var current = select.value;
      var options = ['<option value="">' + esc(t('opt_all')) + '</option>'];
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
        return String(a[by]).localeCompare(String(b[by]), state.lang === 'hy' ? 'hy' : state.lang, { sensitivity: 'base' });
      });
    }
    return sorted;
  }

  /* ------------------------------------------------------------------ render */

  function rowHtml(song, index) {
    var isCurrent = song.id === state.currentId;
    var fav = state.favorites.has(song.id);
    var cover = song.cover || PLACEHOLDER;
    var lead = isCurrent ? '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>' : String(index + 1);

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
      '<span class="row__time" data-time="' + esc(song.id) + '">' + (song.duration ? fmtTime(song.duration) : '–:--') + '</span>' +
      '<button class="icon-btn row__fav" type="button" data-fav="' + esc(song.id) + '" aria-pressed="' + fav + '" ' +
        'aria-label="' + esc(t('a_fav')) + '"><svg class="icon"><use href="' + (fav ? '#i-heart-on' : '#i-heart') + '"></use></svg></button>' +
    '</li>';
  }

  function render() {
    var visible = sortSongs(state.songs.filter(matches));
    state.view = visible.map(function (song) { return song.id; });

    $('#list').innerHTML = visible.map(rowHtml).join('');

    var isEmpty = visible.length === 0;
    $('#empty').hidden = !isEmpty;
    if (isEmpty) {
      $('#empty-title').textContent = t('empty_title');
      $('#empty-text').textContent = state.songs.length ? t('empty_filter') : t('empty_none');
    }

    $('#view-title').textContent = t('title_' + state.scope) || t('title_all');
    $('#view-count').textContent = visible.length ? t('count_songs', { n: visible.length }) : '';

    var total = state.songs.reduce(function (sum, song) { return sum + (song.duration || 0); }, 0);
    $('#stats').textContent = total
      ? t('stats_time', { n: state.songs.length, f: state.favorites.size, t: fmtTime(total) })
      : t('stats', { n: state.songs.length, f: state.favorites.size });
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
    if (audio.paused) { state.wantsPlay = true; audio.play(); }
    else { state.wantsPlay = false; audio.pause(); }
  }

  function neighbour(step) {
    if (!state.view.length) return null;
    if (state.shuffle && step > 0) {
      if (state.view.length === 1) return state.view[0];
      var pick;
      do { pick = state.view[Math.floor(Math.random() * state.view.length)]; }
      while (pick === state.currentId);
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
    var id = (state.shuffle && state.shuffleHistory.length) ? state.shuffleHistory.pop() : neighbour(-1);
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
        rgb = rgb.map(function (v) { return Math.max(0, Math.min(255, Math.round(avg + (v - avg) * 1.5))); });
        glow.style.opacity = 0;
        setTimeout(function () {
          document.documentElement.style.setProperty('--tint-rgb', rgb.join(', '));
          glow.style.opacity = 1;
        }, 240);
      } catch (e) { /* file:// */ }
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

  /* ------------------------------------------------------- audio իրադարձություններ */

  audio.addEventListener('play', function () {
    buildAudioChain();
    if (sound.ctx && sound.ctx.state === 'suspended') sound.ctx.resume();
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
    var pos = total ? Math.round((audio.currentTime / total) * 1000) : 0;
    $('#time-now').textContent = fmtTime(audio.currentTime);
    $('#np-time-now').textContent = fmtTime(audio.currentTime);
    var seek = $('#seek');
    seek.value = pos; setRangeFill(seek);
    var npSeek = $('#np-seek');
    npSeek.value = pos; setRangeFill(npSeek);
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
      if (!song.added) {
        state.durations[song.src] = audio.duration;
        store.set('durations', state.durations);
      }
      var cell = document.querySelector('[data-time="' + CSS.escape(song.id) + '"]');
      if (cell) cell.textContent = fmtTime(audio.duration);
    }
  });

  audio.addEventListener('ended', function () {
    countPlay();
    if (state.sleepAtEnd) {
      state.sleepAtEnd = false;
      $('#btn-sleep').setAttribute('aria-pressed', 'false');
      toast(t('t_sleep_stop'));
      return;
    }
    if (state.repeat === 'one') { audio.currentTime = 0; audio.play(); return; }
    next(true);
  });

  audio.addEventListener('error', function () {
    var song = byId(state.currentId);
    if (!song) return;
    song.missing = true;
    render();
    var probe = document.createElement('audio');
    if (/\.(m4a|aac|mp4)$/i.test(song.src) && !probe.canPlayType('audio/mp4; codecs="mp4a.40.2"')) {
      toast(t('t_no_aac'));
      return;
    }
    toast(t('t_cant_open', { s: song.src }));
    if (state.wantsPlay) setTimeout(function () { next(true); }, 1200);
  });

  /* ------------------------------------------------------ տևողությունների լրացում */

  function loadMissingDurations() {
    var queue = state.songs.filter(function (song) { return !song.duration && !song.added; });
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
      setTimeout(finish, 6000);
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
        btn.querySelector('use').setAttribute('href', on ? '#i-heart-on' : '#i-heart');
      }
      var total = state.songs.reduce(function (sum, s) { return sum + (s.duration || 0); }, 0);
      $('#stats').textContent = total
        ? t('stats_time', { n: state.songs.length, f: state.favorites.size, t: fmtTime(total) })
        : t('stats', { n: state.songs.length, f: state.favorites.size });
    }
  }

  /* --------------------------------------------------------------------- բառեր */

  function renderLyrics() {
    var panel = $('#lyrics-panel');
    if (panel.hidden) return;
    var song = byId(state.currentId);
    var body = $('#lyrics-body');
    if (!song) { body.textContent = t('lyrics_pick'); return; }
    body.innerHTML = '<b>' + esc(song.title) + '</b>' + (song.lyrics ? esc(song.lyrics) : esc(t('lyrics_none')));
  }

  /* ---------------------------------------------------------------- ձայն և EQ */

  var EQ_PRESETS = {
    flat: [0, 0, 0], bass: [6, -1, 1], vocal: [-2, 4, 1], bright: [0, 1, 5], warm: [3, 0, -2]
  };

  var sound = { ready: false, ctx: null, bass: null, mid: null, treble: null, comp: null, gain: null, tried: false };
  var eq = store.get('eq', { bass: 0, mid: 0, treble: 0, loud: false });

  function buildAudioChain() {
    if (sound.tried || location.protocol === 'file:') return;
    sound.tried = true;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      var source = ctx.createMediaElementSource(audio);

      var bass = ctx.createBiquadFilter();
      bass.type = 'lowshelf'; bass.frequency.value = 190;

      var mid = ctx.createBiquadFilter();
      mid.type = 'peaking'; mid.frequency.value = 1100; mid.Q.value = 0.9;

      var treble = ctx.createBiquadFilter();
      treble.type = 'highshelf'; treble.frequency.value = 4800;

      var comp = ctx.createDynamicsCompressor();
      var gain = ctx.createGain();
      var analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(bass); bass.connect(mid); mid.connect(treble);
      treble.connect(comp); comp.connect(gain); gain.connect(analyser);
      analyser.connect(ctx.destination);

      sound.ctx = ctx; sound.bass = bass; sound.mid = mid; sound.treble = treble;
      sound.comp = comp; sound.gain = gain; sound.ready = true;

      viz.analyser = analyser;
      viz.audioCtx = ctx;
      viz.data = new Uint8Array(analyser.frequencyBinCount);
      applyEq(false);
    } catch (e) {
      sound.ready = false;
      viz.analyser = null;
    }
  }

  function applyEq(save) {
    ['bass', 'mid', 'treble'].forEach(function (band) {
      var input = $('#eq-' + band);
      input.value = eq[band];
      setRangeFill(input);
      $('#eq-' + band + '-val').textContent = (eq[band] > 0 ? '+' : '') + eq[band] + ' dB';
    });
    $('#eq-loud').checked = !!eq.loud;

    var on = !!(eq.bass || eq.mid || eq.treble || eq.loud);
    $('#btn-eq').setAttribute('aria-pressed', String(on));
    $('#np-eq').setAttribute('aria-pressed', String(on));

    $$('.eq-presets .chip').forEach(function (chip) {
      var p = EQ_PRESETS[chip.dataset.preset];
      chip.classList.toggle('is-on', p[0] === eq.bass && p[1] === eq.mid && p[2] === eq.treble);
    });

    if (sound.ready) {
      sound.bass.gain.value = eq.bass;
      sound.mid.gain.value = eq.mid;
      sound.treble.gain.value = eq.treble;
      if (eq.loud) {
        sound.comp.threshold.value = -20;
        sound.comp.knee.value = 18;
        sound.comp.ratio.value = 6;
        sound.comp.attack.value = 0.005;
        sound.comp.release.value = 0.25;
        sound.gain.gain.value = 1.45;
      } else {
        sound.comp.threshold.value = 0;
        sound.comp.knee.value = 0;
        sound.comp.ratio.value = 1;
        sound.gain.gain.value = 1;
      }
    }
    if (save !== false) store.set('eq', eq);
  }

  /* --------------------------------------------------------------- տեսաձևավորում */

  var viz = { ctx: null, raf: null, analyser: null, data: null };

  function setupCanvas() {
    var canvas = $('#viz');
    var dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    viz.ctx = canvas.getContext('2d');
    viz.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawViz() {
    var canvas = $('#viz');
    var ctx = viz.ctx;
    if (!ctx) return;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    if (audio.paused) { viz.raf = null; return; }

    var bars = 64, gap = 2;
    var barW = Math.max(2, (w - gap * bars) / bars);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#f2a65a';

    var values = [];
    if (viz.analyser) {
      viz.analyser.getByteFrequencyData(viz.data);
      for (var i = 0; i < bars; i++) values.push(viz.data[Math.floor(i * viz.data.length / bars)] / 255);
    } else {
      var time = Date.now() / 420;
      for (var j = 0; j < bars; j++) {
        var v = (Math.sin(time + j * 0.45) + Math.sin(time * 0.7 + j * 0.17) + 2) / 4;
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
    if (!viz.raf) drawViz();
  }

  /* ------------------------------------------------------------ media session */

  function mediaSession(song) {
    if (!('mediaSession' in navigator)) return;
    try {
      var art = song.cover || PLACEHOLDER;
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: song.album || '',
        artwork: [{ src: art.indexOf('data:') === 0 ? art : new URL(art, location.href).href, sizes: '460x460', type: 'image/svg+xml' }]
      });
      navigator.mediaSession.setActionHandler('play', function () { audio.play(); });
      navigator.mediaSession.setActionHandler('pause', function () { audio.pause(); });
      navigator.mediaSession.setActionHandler('previoustrack', prev);
      navigator.mediaSession.setActionHandler('nexttrack', function () { next(true); });
      navigator.mediaSession.setActionHandler('seekto', function (d) {
        if (d.seekTime != null) audio.currentTime = d.seekTime;
      });
    } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------ ֆայլերի ավելացում */

  function isAudioFile(file) {
    return /^audio\//.test(file.type) || /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|weba|webm)$/i.test(file.name);
  }

  function probeDuration(url) {
    return new Promise(function (resolve) {
      var probe = new Audio();
      probe.preload = 'metadata';
      var done = function (value) { resolve(value || 0); };
      probe.onloadedmetadata = function () { done(isFinite(probe.duration) ? probe.duration : 0); };
      probe.onerror = function () { done(0); };
      setTimeout(function () { done(0); }, 5000);
      probe.src = url;
    });
  }

  function splitName(name) {
    var base = fileTitle(name);
    var parts = base.split(/\s+-\s+/);
    if (parts.length > 1) return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
    return { artist: t('unknown_artist'), title: base };
  }

  /* Ավելացնում է ֆայլերը և պահում դիտարկիչի պահոցում (IndexedDB)։ */
  function addFiles(files, silent) {
    var list = Array.prototype.filter.call(files, isAudioFile);
    if (!list.length) { toast(t('t_no_audio')); return Promise.resolve(0); }

    var jobs = list.map(function (file) {
      var id = 'added:' + file.name + ':' + file.size;
      if (byId(id)) return Promise.resolve(null);
      var url = URL.createObjectURL(file);
      return probeDuration(url).then(function (duration) {
        var parts = splitName(file.name);
        var record = {
          id: id, name: file.name, blob: file,
          title: parts.title, artist: parts.artist,
          album: '', genre: '', lyrics: '',
          duration: duration, addedAt: Date.now()
        };
        return DB.put(record).catch(function () { /* file:// */ }).then(function () {
          state.addedSongs.push({
            id: id, title: record.title, artist: record.artist, album: '', genre: '', year: '',
            duration: duration, src: url, cover: letterCover(record.artist, id), lyrics: '',
            fileName: file.name, added: true, missing: false, order: 100000 + state.addedSongs.length
          });
          return id;
        });
      });
    });

    return Promise.all(jobs).then(function (results) {
      var count = results.filter(Boolean).length;
      state.hidden.forEach(function (id) {
        if (results.indexOf(id) !== -1) state.hidden.delete(id);
      });
      store.set('hidden', Array.from(state.hidden));
      rebuild();
      if (!silent) toast(t('t_added', { n: count }));
      return count;
    });
  }

  function deleteSong(id) {
    var song = byId(id);
    if (!song) return;
    if (song.added) {
      DB.del(id).catch(function () { /* ignore */ });
      state.addedSongs = state.addedSongs.filter(function (s) { return s.id !== id; });
    } else {
      state.hidden.add(id);
      store.set('hidden', Array.from(state.hidden));
    }
    if (state.currentId === id) {
      audio.pause();
      state.currentId = null;
      $('#now-title').textContent = t('pick_song');
      $('#now-artist').textContent = t('pick_hint');
      $('#now-cover').src = PLACEHOLDER;
    }
    rebuild();
    toast(t('t_deleted'));
  }

  function restoreHidden() {
    state.hidden.clear();
    store.set('hidden', []);
    rebuild();
    toast(t('t_restored'));
  }

  function saveOverride(id, field, value) {
    var song = byId(id);
    if (!song) return;
    var clean = String(value || '').trim();
    if (!clean) return;
    state.overrides[id] = state.overrides[id] || {};
    state.overrides[id][field] = clean;
    store.set('overrides', state.overrides);
    song[field] = clean;

    if (song.added) {
      DB.all().then(function (items) {
        var record = (items || []).filter(function (x) { return x.id === id; })[0];
        if (record) { record[field] = clean; DB.put(record); }
      }).catch(function () { /* ignore */ });
    }
    fillFilters();
    render();
    if (state.currentId === id) updateNowPlaying(song);
  }

  /* ------------------------------------------------------------- ադմին պանել */

  function renderAdmin() {
    var list = $('#admin-list');
    list.innerHTML = state.songs.map(function (song) {
      return '<div class="arow" data-id="' + esc(song.id) + '">' +
        '<img class="arow__cover" src="' + esc(song.cover || PLACEHOLDER) + '" alt="" loading="lazy">' +
        '<div class="arow__fields">' +
          '<input class="arow__input" data-field="title" value="' + esc(song.title) + '" placeholder="' + esc(t('admin_title_ph')) + '">' +
          '<input class="arow__input arow__input--sub" data-field="artist" value="' + esc(song.artist) + '" placeholder="' + esc(t('admin_artist_ph')) + '">' +
        '</div>' +
        '<span class="arow__meta">' +
          '<span class="arow__badge' + (song.added ? ' arow__badge--added' : '') + '">' +
            esc(song.added ? t('admin_badge_added') : t('admin_badge_base')) + '</span>' +
          '<span class="arow__time">' + (song.duration ? fmtTime(song.duration) : '–:--') + '</span>' +
        '</span>' +
        '<button class="icon-btn arow__del" type="button" data-del="' + esc(song.id) + '" aria-label="' + esc(t('a_delete')) + '">' +
          '<svg class="icon"><use href="#i-trash"></use></svg></button>' +
      '</div>';
    }).join('');

    var restore = $('#admin-restore');
    restore.hidden = state.hidden.size === 0;
    $('#admin-restore-text').textContent = t('admin_restore', { n: state.hidden.size });
  }

  function openAdmin() {
    if (!state.isAdmin) { $('#login-error').hidden = true; $('#login').showModal(); $('#login-user').focus(); return; }
    renderAdmin();
    $('#admin').hidden = false;
  }

  function tryLogin() {
    var user = $('#login-user').value.trim();
    var pass = $('#login-pass').value;
    if (hash(user + '::' + pass) === ADMIN_HASH) {
      state.isAdmin = true;
      store.set('admin', true);
      $('#login').close();
      $('#login-pass').value = '';
      openAdmin();
    } else {
      $('#login-error').hidden = false;
    }
  }

  /* ----------------------------------------------------------- JSON ներմուծում */

  function exportJson() {
    var data = {
      name: state.libraryName || 'Songs',
      songs: state.songs.map(function (song) {
        var item = {
          id: song.added ? fileTitle(song.fileName) : song.id,
          title: song.title,
          artist: song.artist,
          src: song.added ? song.fileName : song.src
        };
        if (song.album) item.album = song.album;
        if (song.year) item.year = song.year;
        if (song.genre) item.genre = song.genre;
        if (song.duration) item.duration = Math.round(song.duration);
        if (song.cover && song.cover.indexOf('data:') !== 0) item.cover = song.cover;
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
    toast(t('t_export'));
  }

  function readJsonFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        readLibrary(JSON.parse(reader.result));
        $('#overlay').hidden = true;
        toast(t('t_json_ok'));
      } catch (e) {
        toast(t('t_json_bad', { e: e.message }));
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
      toast(t('t_sleep_off'));
    } else if (value === 'end') {
      state.sleepAtEnd = true;
      btn.setAttribute('aria-pressed', 'true');
      toast(t('t_sleep_end'));
    } else {
      var minutes = Number(value);
      state.sleepTimer = setTimeout(function () {
        audio.pause();
        state.wantsPlay = false;
        btn.setAttribute('aria-pressed', 'false');
        toast(t('t_sleep_stop'));
      }, minutes * 60000);
      btn.setAttribute('aria-pressed', 'true');
      toast(t('t_sleep_min', { n: minutes }));
    }
    $$('.sleep-options .btn').forEach(function (b) {
      b.classList.toggle('is-on', b.dataset.min === value && value !== '0');
    });
  }

  /* --------------------------------------------------------------- ձևավորում */

  function setTheme(mode) {
    var theme = mode === 'day' ? 'light' : 'dark';
    document.body.dataset.theme = theme;
    store.set('theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#060d11' : '#eceff0';
    $$('.segmented [data-theme-set]').forEach(function (b) {
      b.classList.toggle('is-on', (b.dataset.themeSet === 'day') === (theme === 'light'));
    });
  }

  function applyRepeat() {
    $('#btn-repeat').dataset.mode = state.repeat;
    $('#btn-repeat').setAttribute('aria-pressed', String(state.repeat !== 'off'));
    $('#np-repeat').setAttribute('aria-pressed', String(state.repeat !== 'off'));
    $('#repeat-badge').hidden = state.repeat !== 'one';
  }

  function restoreLast() {
    var lastId = store.get('lastId', null);
    if (!lastId || !byId(lastId)) return;
    play(lastId, false);
    var seconds = store.get('lastTime', 0);
    if (seconds > 0) {
      audio.addEventListener('loadedmetadata', function once() {
        audio.removeEventListener('loadedmetadata', once);
        if (seconds < audio.duration - 2) audio.currentTime = seconds;
      });
    }
  }

  /* ------------------------------------------------------------------- կապեր */

  function bind() {
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
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(row.dataset.id); }
      else if (e.key === 'ArrowDown' && row.nextElementSibling) { e.preventDefault(); row.nextElementSibling.focus(); }
      else if (e.key === 'ArrowUp' && row.previousElementSibling) { e.preventDefault(); row.previousElementSibling.focus(); }
    });

    $('#btn-play').addEventListener('click', togglePlay);
    $('#btn-next').addEventListener('click', function () { next(true); });
    $('#btn-prev').addEventListener('click', prev);

    $('#btn-shuffle').addEventListener('click', function () {
      state.shuffle = !state.shuffle;
      this.setAttribute('aria-pressed', String(state.shuffle));
      $('#np-shuffle').setAttribute('aria-pressed', String(state.shuffle));
      store.set('shuffle', state.shuffle);
      toast(state.shuffle ? t('t_shuffle_on') : t('t_shuffle_off'));
    });

    $('#btn-repeat').addEventListener('click', function () {
      var order = ['off', 'all', 'one'];
      state.repeat = order[(order.indexOf(state.repeat) + 1) % 3];
      applyRepeat();
      store.set('repeat', state.repeat);
      toast(t('t_repeat_' + state.repeat));
    });

    ['#seek', '#np-seek'].forEach(function (sel) {
      var bar = $(sel);
      bar.addEventListener('input', function () {
        state.seeking = true;
        setRangeFill(bar);
        if (audio.duration) {
          var text = fmtTime(bar.value / 1000 * audio.duration);
          $('#time-now').textContent = text;
          $('#np-time-now').textContent = text;
        }
      });
      var commit = function () {
        if (audio.duration) audio.currentTime = bar.value / 1000 * audio.duration;
        state.seeking = false;
      };
      bar.addEventListener('change', commit);
      bar.addEventListener('pointerup', commit);
    });

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

    $('#now-fav').addEventListener('click', function () { if (state.currentId) toggleFavorite(state.currentId); });

    var onSearch = function (value) {
      state.search = value.trim().toLowerCase();
      $('#search').value = value;
      $('#search-mobile').value = value;
      render();
    };
    $('#search').addEventListener('input', function () { onSearch(this.value); });
    $('#search-mobile').addEventListener('input', function () { onSearch(this.value); });

    $$('.chip[data-scope]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        state.scope = chip.dataset.scope;
        $$('.chip[data-scope]').forEach(function (c) { c.classList.toggle('is-on', c === chip); });
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

    $('#add-files').addEventListener('click', function () { $('#file-audio').click(); });
    $('#file-audio').addEventListener('change', function () { addFiles(this.files); this.value = ''; });
    $('#admin-add').addEventListener('click', function () { $('#file-admin').click(); });
    $('#file-admin').addEventListener('change', function () { addFiles(this.files); this.value = ''; });
    $('#load-json').addEventListener('click', function () { $('#file-json').click(); });
    $('#overlay-pick').addEventListener('click', function () { $('#file-json').click(); });
    $('#file-json').addEventListener('change', function () {
      if (this.files[0]) readJsonFile(this.files[0]);
      this.value = '';
    });
    $('#export-json').addEventListener('click', exportJson);

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

    // տեսք
    $('#view-list').addEventListener('click', function () { setLayout('list'); });
    $('#view-grid').addEventListener('click', function () { setLayout('grid'); });

    // ընթացիկ երգի էկրան
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
    $('#np-eq').addEventListener('click', function () { $('#eq-dialog').showModal(); });
    $('#np-fav').addEventListener('click', function () { if (state.currentId) toggleFavorite(state.currentId); });
    $('#np-lyrics').addEventListener('click', function () {
      closeNowPlaying();
      if ($('#lyrics-panel').hidden) $('#btn-lyrics').click();
    });

    // ադմին
    $('#admin-open').addEventListener('click', openAdmin);
    $('#admin-close').addEventListener('click', function () { $('#admin').hidden = true; });
    $('#admin-logout').addEventListener('click', function () {
      state.isAdmin = false;
      store.set('admin', false);
      $('#admin').hidden = true;
    });
    $('#admin-restore').addEventListener('click', restoreHidden);
    $('#login-submit').addEventListener('click', tryLogin);
    $('#login-cancel').addEventListener('click', function () { $('#login').close(); });
    $('#login-pass').addEventListener('keydown', function (e) { if (e.key === 'Enter') tryLogin(); });
    $('#login-user').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('#login-pass').focus(); });

    $('#admin-list').addEventListener('click', function (e) {
      var del = e.target.closest('[data-del]');
      if (del) deleteSong(del.dataset.del);
    });
    $('#admin-list').addEventListener('change', function (e) {
      var input = e.target.closest('.arow__input');
      if (!input) return;
      saveOverride(input.closest('.arow').dataset.id, input.dataset.field, input.value);
      toast(t('t_saved'));
    });

    var dropZone = $('#admin-drop');
    dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('is-over'); });
    dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('is-over'); });
    dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropZone.classList.remove('is-over');
      if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
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

    $('#btn-eq').addEventListener('click', function () { $('#eq-dialog').showModal(); });
    $('#eq-close').addEventListener('click', function () { $('#eq-dialog').close(); });
    ['bass', 'mid', 'treble'].forEach(function (band) {
      $('#eq-' + band).addEventListener('input', function () { eq[band] = Number(this.value); applyEq(); });
    });
    $('#eq-loud').addEventListener('change', function () { eq.loud = this.checked; applyEq(); });
    $$('.eq-presets .chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var p = EQ_PRESETS[chip.dataset.preset];
        eq.bass = p[0]; eq.mid = p[1]; eq.treble = p[2];
        applyEq();
      });
    });

    $('#btn-sleep').addEventListener('click', function () { $('#sleep-dialog').showModal(); });
    $('#sleep-close').addEventListener('click', function () { $('#sleep-dialog').close(); });
    $$('.sleep-options .btn').forEach(function (btn) {
      btn.addEventListener('click', function () { setSleep(btn.dataset.min); $('#sleep-dialog').close(); });
    });

    $('#help-open').addEventListener('click', function () { $('#help').showModal(); });
    $('#help-close').addEventListener('click', function () { $('#help').close(); });

    $$('.segmented [data-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () { applyLang(btn.dataset.lang); });
    });
    $$('.segmented [data-theme-set]').forEach(function (btn) {
      btn.addEventListener('click', function () { setTheme(btn.dataset.themeSet); });
    });

    $('#rail-open').addEventListener('click', function () { document.body.classList.add('rail-open'); });
    $('#rail-close').addEventListener('click', function () { document.body.classList.remove('rail-open'); });
    $('#list').addEventListener('pointerdown', function () { document.body.classList.remove('rail-open'); });

    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'select' || tag === 'textarea';
      if (e.key === '/' && !typing) { e.preventDefault(); $('#search').focus(); return; }
      if (typing) { if (e.key === 'Escape') e.target.blur(); return; }
      if (document.querySelector('dialog[open]')) return;
      if (e.key === 'Escape') {
        if (!$('#np').hidden) { closeNowPlaying(); return; }
        if (!$('#admin').hidden) { $('#admin').hidden = true; return; }
      }

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
    });

    window.addEventListener('resize', setupCanvas);
    window.addEventListener('beforeunload', function () { store.set('lastTime', audio.currentTime); });
  }

  /* -------------------------------------------------------------------- init */

  function init() {
    setTheme(store.get('theme', 'dark') === 'light' ? 'day' : 'night');

    var volume = $('#volume');
    volume.value = store.get('volume', 80);
    audio.volume = volume.value / 100;
    audio.muted = store.get('muted', false);
    document.body.classList.toggle('is-muted', audio.muted);
    setRangeFill(volume);
    setRangeFill($('#seek'));
    setRangeFill($('#np-seek'));

    var speed = store.get('speed', '1');
    $('#speed').value = speed;
    audio.playbackRate = Number(speed);

    $('#sort').value = state.sort;
    setLayout(state.layout);
    $('#btn-shuffle').setAttribute('aria-pressed', String(state.shuffle));
    $('#np-shuffle').setAttribute('aria-pressed', String(state.shuffle));
    applyRepeat();
    $$('.chip[data-scope]').forEach(function (chip) {
      chip.classList.toggle('is-on', chip.dataset.scope === state.scope);
    });

    setupCanvas();
    bind();
    applyLang(state.lang);
    loadLibrary();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
