// Token Radar's dashboard. It reads window.RADAR (written beside dashboard/
// by main.ts) and renders the ranked board, filters, a per-protocol detail
// drawer with the model's own inputs and the protocol's farm plan, and the
// live-token set aside. No network: every byte it shows is in data.js.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var state = { q: '', category: 'all', chain: 'all', wl: false, tab: 'pre', sort: 'implied', dir: -1, selected: null, scroll: null };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  var usdFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usdFmt.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function fmtMult(n) { return (Math.round(n * 100) / 100).toFixed(2) + 'x'; }

  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('cat')) state.category = params.get('cat');
    if (params.get('chain')) state.chain = params.get('chain');
    if (params.get('wl') === '1') state.wl = true;
    if (params.get('tab') === 'live') state.tab = 'live';
    if (params.get('p')) state.selected = params.get('p');
    if (params.get('scroll')) state.scroll = params.get('scroll');
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('cat', state.category);
    if (state.chain !== 'all') params.set('chain', state.chain);
    if (state.wl) params.set('wl', '1');
    if (state.tab === 'live') params.set('tab', 'live');
    if (state.selected) params.set('p', state.selected);
    var next = params.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  function visibleRows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.wl && !r.watchlist) return false;
      if (state.category !== 'all' && r.category !== state.category) return false;
      if (state.chain !== 'all' && !(r.chains || []).includes(state.chain)) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  function stat(label, value, note) {
    return '<div class="stat"><span>' + esc(label) + '</span><b>' + esc(value) + '</b><small>' + esc(note) + '</small></div>';
  }

  function renderTop() {
    $('topbar-meta').innerHTML =
      '<span>Snapshot <b>' + esc(DATA.as_of) + '</b></span>' +
      '<span>DefiLlama protocol index</span>' +
      '<span><b>' + esc(DATA.model_version) + '</b> model</span>';
    $('as-of').textContent = DATA.as_of;
    $('board-count').textContent = DATA.board_size;
    $('stats').innerHTML =
      stat('Watchlist covered', DATA.watchlist_size + ' / ' + DATA.watchlist_size, 'every watchlist protocol ranked') +
      stat('Pre-token rows scored', String(DATA.board_size), 'standalone protocols, no token on record') +
      stat('Early rows below the floor', String(DATA.early_size), 'under the $50M watchlist floor') +
      stat('Live-token protocols set aside', String(DATA.live_size), 'already trading, shown apart');
    $('source-date').textContent = DATA.as_of;
    $('foot-model').textContent = 'Model ' + DATA.model_version + ': implied = round(4 x TVL^0.85 x growth x age x breadth x category). ' +
      'The board is a model, not a price, and no row predicts whether or when a token is issued.';
    var top = DATA.rows.slice(0, 8);
    var max = top.length ? top[0].implied_value_usd : 1;
    $('chart').innerHTML = top.map(function (r) {
      var pct = Math.max(3, Math.round((r.implied_value_usd / max) * 100));
      return '<div class="chart-row"><span class="name"><span class="rk">#' + r.rank + '</span>' + esc(r.name) + '</span>' +
        '<span class="chart-track"><i style="width:' + pct + '%"></i></span>' +
        '<span class="bar-val">' + esc(fmtUsd(r.implied_value_usd)) + '</span></div>';
    }).join('');
  }

  function fillSelect(el, values, allLabel) {
    var cur = el.value;
    el.innerHTML = '<option value="all">' + esc(allLabel) + '</option>' +
      values.map(function (v) { return '<option value="' + esc(v) + '">' + esc(v) + '</option>'; }).join('');
    if (values.indexOf(cur) >= 0) el.value = cur;
  }

  function renderControls() {
    var cats = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var chains = Array.from(new Set(DATA.rows.reduce(function (acc, r) { return acc.concat(r.chains || []); }, []))).sort();
    fillSelect($('category'), cats, 'All categories');
    fillSelect($('chain'), chains, 'All chains');
    if (state.category !== 'all') $('category').value = state.category;
    if (state.chain !== 'all') $('chain').value = state.chain;
    $('q').value = state.q;
    $('watchlist-only').checked = state.wl;
    $('tab-pre').setAttribute('aria-selected', state.tab === 'pre' ? 'true' : 'false');
    $('tab-live').setAttribute('aria-selected', state.tab === 'live' ? 'true' : 'false');
  }

  function sortBtn(key, label) {
    var arrow = state.sort === key ? (state.dir < 0 ? ' \u25bc' : ' \u25b2') : '';
    return '<button type="button" data-sort="' + key + '">' + esc(label) + '<span class="arrow">' + arrow + '</span></button>';
  }

  function boardTable() {
    var list = sortedRows(visibleRows());
    $('count').textContent = list.length + ' rows shown';
    if (list.length === 0) {
      return '<div class="empty"><h2>No protocol matches that filter</h2>' +
        '<p>Clear the search or pick another category or chain to see the board again.</p>' +
        '<button class="btn" type="button" id="clear-filters">Clear filters</button></div>';
    }
    var max = list[0].implied_value_usd || 1;
    var rows = list.map(function (r) {
      var growth = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var gc = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var star = r.watchlist ? '<span class="star" title="On the watchlist">\u2605</span>' : '';
      var pct = Math.max(3, Math.round((r.implied_value_usd / max) * 100));
      return '<tr tabindex="0" data-slug="' + esc(r.slug) + '" aria-selected="' + (state.selected === r.slug) + '">' +
        '<td class="num rank">' + r.rank + '</td>' +
        '<td><div class="pname">' + esc(r.name) + star + '</div><div class="psub">' + esc(r.category || 'Other') + ' on ' + esc((r.chains || []).slice(0, 2).join(', ') || 'an unnamed chain') + '</div></td>' +
        '<td class="num">' + esc(fmtUsd(r.tvl_usd)) + '</td>' +
        '<td class="num ' + gc + '">' + esc(growth) + '</td>' +
        '<td class="num">' + esc(fmtAge(r.age_days)) + '</td>' +
        '<td><div class="imp"><span class="bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span><span class="num">' + esc(fmtUsd(r.implied_value_usd)) + '</span></div></td>' +
        '<td><span class="badge">no token</span></td></tr>';
    }).join('');
    return '<table><caption>Pre-token protocols, strongest implied value first. Select a row for its model and farm plan. \u2605 marks the watchlist.</caption>' +
      '<thead><tr><th scope="col" class="num">' + sortBtn('implied', 'Rank') + '</th>' +
      '<th scope="col">' + sortBtn('name', 'Protocol') + '</th>' +
      '<th scope="col" class="num">' + sortBtn('tvl', 'TVL') + '</th>' +
      '<th scope="col" class="num">' + sortBtn('growth', '7d') + '</th>' +
      '<th scope="col" class="num">' + sortBtn('age', 'Age') + '</th>' +
      '<th scope="col" class="num">' + sortBtn('implied', 'Implied value') + '</th>' +
      '<th scope="col">Token</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function liveTable() {
    $('count').textContent = DATA.live.length + ' live-token protocols';
    var rows = DATA.live.map(function (r) {
      return '<tr><td><span class="badge live">already trades</span></td>' +
        '<td><div class="pname">' + esc(r.name) + '</div><div class="psub">' + esc(r.category || 'Other') + ' on ' + esc((r.chains || []).slice(0, 2).join(', ') || 'an unnamed chain') + '</div></td>' +
        '<td class="num">' + esc(fmtUsd(r.tvl_usd)) + '</td>' +
        '<td class="num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg') + '">' + esc(fmtPct(r.change_7d)) + '</td>' +
        '<td class="num">' + esc(fmtUsd(r.mcap_usd)) + '</td></tr>';
    }).join('');
    return '<table><caption>Token live: these protocols already trade, so their market cap is a fact, not a model. They are set aside from the pre-token ranking.</caption>' +
      '<thead><tr><th scope="col">Status</th><th scope="col">Protocol</th><th scope="col" class="num">TVL</th>' +
      '<th scope="col" class="num">7d</th><th scope="col" class="num">Market cap</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function renderModel() {
    var m = DATA.model;
    $('model-panel').innerHTML =
      '<h2>How implied value is computed</h2>' +
      '<p>One function scores every row from the snapshot figures. No protocol name is special-cased, ' +
      'and no row is hand-picked. A protocol is ranked only when it records no token and is a standalone ' +
      'protocol — not a wrapped, staked or bridged product of a token that already trades.</p>' +
      '<div class="formula">implied = round( 4 x TVL^0.85 x (1 + clamp(7d, -60, 150)/100 x 0.6) x (0.7 + 0.3 x min(age, 1460)/1460) x (1 + 0.03 x min(chains-1, 5)) x category )</div>' +
      '<div class="model-grid">' +
      '<div class="model-cell"><b>Log-TVL base · 4 x TVL^0.85</b><span>Value grows slower than TVL: a small protocol is worth relatively more per TVL dollar than a giant one.</span></div>' +
      '<div class="model-cell"><b>Growth · up to ' + fmtMult(1 + m.growth_cap / 100 * m.growth_weight) + '</b><span>Seven-day TVL change, clamped to ' + m.growth_floor + '% … +' + m.growth_cap + '%, weighted ' + m.growth_weight + '.</span></div>' +
      '<div class="model-cell"><b>Age without a token · ' + m.age_floor + '–' + (m.age_floor + m.age_range) + 'x</b><span>Days since first listed, capped at ' + m.age_cap_days + ' days; an unknown age uses ' + m.unknown_age_days + ' days.</span></div>' +
      '<div class="model-cell"><b>Chain breadth · up to ' + fmtMult(1 + m.breadth_per_chain * m.breadth_max_chains) + '</b><span>Each extra chain, up to ' + m.breadth_max_chains + ', adds ' + (m.breadth_per_chain * 100) + '%: a wider future holder base.</span></div>' +
      '<div class="model-cell"><b>Category multiple · 0.85–1.20x</b><span>Derivatives 1.20, Dexs 1.15, curators and allocators 1.10, lending 1.05, most others 1.00 or less.</span></div>' +
      '<div class="model-cell"><b>What it is not</b><span>Not a price, not a prediction of whether or when a token is issued — the model values the protocol as it stands today.</span></div>' +
      '</div>';
  }

  function openDetail(slug) {
    var row = null;
    DATA.rows.forEach(function (r) { if (r.slug === slug) row = r; });
    var drawer = $('drawer');
    var scrim = $('scrim');
    if (!row) { drawer.hidden = true; scrim.hidden = true; return; }
    state.selected = slug;
    writeHash();
    var steps = row.farm_steps.map(function (s) {
      var at = s.indexOf(' Cost: ');
      var action = at >= 0 ? s.slice(0, at) : s;
      var tail = at >= 0 ? s.slice(at + 1) : '';
      return '<li><span>' + esc(action) + '</span><span class="cost">' + esc(tail) + '</span></li>';
    }).join('');
    $('drawer-in').innerHTML =
      '<div class="drawer-head"><div><span class="rk">Rank ' + row.rank + ' of ' + DATA.board_size + (row.watchlist ? ' · Watchlist' : '') + '</span>' +
      '<h2>' + esc(row.name) + '</h2><p class="psub">' + esc(row.category || 'Other') + ' on ' + esc((row.chains || []).join(', ') || 'an unnamed chain') + '</p></div>' +
      '<button class="close-btn" type="button" id="drawer-close">Close</button></div>' +
      '<div class="detail-sec"><h3>Implied value</h3><div class="eq">' +
      '<div class="eq-row"><span>TVL</span><b>' + esc(fmtUsd(row.tvl_usd)) + '</b></div>' +
      '<div class="eq-row"><span>Log-TVL base · 4 x TVL^0.85</span><b>' + esc(fmtUsd(row.base_value)) + '</b></div>' +
      '<div class="eq-row"><span>Seven-day growth</span><b>' + esc(fmtPct(row.change_7d)) + ' → ' + esc(fmtMult(row.growth_multiplier)) + '</b></div>' +
      '<div class="eq-row"><span>Age with no token</span><b>' + esc(fmtAge(row.age_days)) + ' → ' + esc(fmtMult(row.maturity_multiplier)) + '</b></div>' +
      '<div class="eq-row"><span>Chain breadth · ' + (row.chains || []).length + ' chains</span><b>' + esc(fmtMult(row.breadth_multiplier)) + '</b></div>' +
      '<div class="eq-row"><span>Category · ' + esc(row.category || 'Other') + '</span><b>' + esc(fmtMult(row.category_multiplier)) + '</b></div>' +
      '<div class="eq-row total"><span>Implied value</span><b>' + esc(fmtUsd(row.implied_value_usd)) + '</b></div>' +
      '</div><p class="note">The same function scores every protocol. This is an estimate, not a price.</p></div>' +
      '<div class="detail-sec"><h3>Farm plan</h3><ol class="steps">' + steps + '</ol></div>';
    drawer.hidden = false;
    scrim.hidden = false;
    $('drawer-close').addEventListener('click', closeDetail);
  }
  function closeDetail() {
    state.selected = null;
    writeHash();
    $('drawer').hidden = true;
    $('scrim').hidden = true;
    renderTable();
  }

  function renderTable() {
    $('table-wrap').innerHTML = state.tab === 'pre' ? boardTable() : liveTable();
    var clear = $('clear-filters');
    if (clear) clear.addEventListener('click', function () {
      state.q = ''; state.category = 'all'; state.chain = 'all'; state.wl = false;
      writeHash(); render();
    });
    var heads = document.querySelectorAll('thead th button[data-sort]');
    heads.forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-sort');
        if (state.sort === key) state.dir = -state.dir;
        else { state.sort = key; state.dir = key === 'name' ? 1 : -1; }
        renderTable();
      });
    });
    var rows = document.querySelectorAll('tbody tr[data-slug]');
    rows.forEach(function (tr) {
      tr.addEventListener('click', function () { openDetail(tr.getAttribute('data-slug')); renderTable(); });
      tr.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(tr.getAttribute('data-slug')); renderTable(); }
      });
    });
  }

  function render() {
    renderControls();
    renderTable();
    if (state.selected) openDetail(state.selected);
    else { $('drawer').hidden = true; $('scrim').hidden = true; }
  }

  readHash();
  renderTop();
  renderModel();
  render();
  if (state.scroll === 'board') {
    var boardEl = document.getElementById('board');
    if (boardEl) boardEl.scrollIntoView();
    state.scroll = null;
  }

  $('q').addEventListener('input', function () { state.q = $('q').value; writeHash(); renderTable(); });
  $('category').addEventListener('change', function () { state.category = $('category').value; writeHash(); renderTable(); });
  $('chain').addEventListener('change', function () { state.chain = $('chain').value; writeHash(); renderTable(); });
  $('watchlist-only').addEventListener('change', function () { state.wl = $('watchlist-only').checked; writeHash(); renderTable(); });
  $('tab-pre').addEventListener('click', function () { state.tab = 'pre'; writeHash(); render(); });
  $('tab-live').addEventListener('click', function () { state.tab = 'live'; writeHash(); render(); });
  $('scrim').addEventListener('click', closeDetail);
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('drawer').hidden) closeDetail();
  });
})();
