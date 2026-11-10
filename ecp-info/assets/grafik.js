/* Помесячный календарь смен: сетка месяца, выбор даты, карточка дня. */
(function () {
  'use strict';
  var E = window.ECP, G = window.GRAFIK;
  var today = E.moscowToday();
  var qs = new URLSearchParams(location.search);
  var start = qs.get('date') || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !G.days[start]) start = today;
  var sel = start;
  var td = E.parseISO(sel);
  var viewY = td.getFullYear(), viewM = td.getMonth();

  var grid = document.getElementById('grid');
  var title = document.getElementById('calTitle');
  var info = document.getElementById('dayinfo');
  var jump = document.getElementById('jump');

  document.getElementById('shiftRange').textContent = G.shift.start + ' – ' + G.shift.end;

  var dates = Object.keys(G.days).sort();
  var minDate = dates[0], maxDate = dates[dates.length - 1];

  /* полное название смены для ячейки */
  function whoShort(day) {
    if (day.status === 'shift') {
      return day.actual.map(function (k) { return G.admins[k].short; }).join(', ');
    }
    if (day.status === 'dit') return 'ДИТ';
    return 'нет данных';
  }

  function ditShort(day) {
    var n = day.notes.filter(function (x) { return x.type === 'dit'; })[0];
    if (!n) return '';
    if (/удал/i.test(n.text)) return 'удалёнка';
    if (/Акишин/i.test(n.text)) return 'Акишин';
    if (/инженер/i.test(n.text)) return 'инженер';
    return 'ДИТ';
  }

  function cellClass(day, isoStr, d) {
    var cls = ['day'];
    if (!day) cls.push('day--none');
    else if (day.status === 'shift') cls.push('day--' + E.colorOf(day.actual[0]));
    else if (day.status === 'dit') cls.push('day--dit');
    else cls.push('day--none');
    if (d.getDay() === 0 || d.getDay() === 6) cls.push('day--weekend');
    if (isoStr === today) cls.push('day--today');
    if (isoStr === sel) cls.push('day--selected');
    return cls.join(' ');
  }

  function render() {
    title.textContent = E.MONTHS_NOM[viewM] + ' ' + viewY;

    var first = new Date(viewY, viewM, 1);
    var offset = (first.getDay() + 6) % 7;           /* Пн = 0 */
    var daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
    var html = '';
    for (var i = 0; i < offset; i++) html += '<div class="day day--empty"></div>';

    var gaps = [];
    for (var d = 1; d <= daysInMonth; d++) {
      var dt = new Date(viewY, viewM, d);
      var isoStr = E.iso(dt);
      var day = G.days[isoStr];
      var cls = cellClass(day, isoStr, dt);
      var note = '';
      var noteCls = 'day__note';
      if (day) {
        var vac = day.notes.filter(function (n) { return n.type === 'vacation'; })[0];
        if (day.status === 'unknown') { note = vac ? 'замена не указана' : '—'; gaps.push(d); }
        else if (day.status === 'dit') note = ditShort(day);
        else {
          if (vac) note = vac.text.replace(' в отпуске', ' — отпуск');
          /* сокращённая смена из графика («с 9 до 18») — главный факт дня;
             чей отпуск — отдельной строкой, иначе «9–18 · отпуск» читается
             как «Гришуткин в отпуске» */
          if (day.hours) {
            var hh = parseInt(day.hours.start, 10) + '–' + parseInt(day.hours.end, 10);
            note = hh + (vac ? '<span class="day__note-sub">' + vac.text.replace(' в отпуске', ' — отпуск') + '</span>' : '');
            noteCls += ' day__note--hours';   /* короткие часы видно и на телефоне */
          }
        }
      } else {
        note = '—';
      }
      html += '<button class="' + cls + '" data-date="' + isoStr + '">' +
        '<span class="day__num">' + d + '</span>' +
        '<span class="day__who">' + (day ? whoShort(day) : '—') + '</span>' +
        '<span class="' + noteCls + '">' + note + '</span>' +
        '</button>';
    }
    grid.innerHTML = html;
    renderInfo(gaps);
  }

  function renderInfo(gaps) {
    var day = G.days[sel];
    var s = E.shiftOf(sel);
    var d = E.parseISO(sel);
    var head = '<div class="dayinfo__date">' + E.humanDate(sel) + ', ' + E.weekday(sel) + '</div>';
    var body;

    if (s.status === 'shift') {
      var key = s.admins[0];
      body = '<div class="dayinfo__name" style="color:var(--' + E.colorOf(key) + ')">' + s.names + '</div>' +
        '<div class="dayinfo__line">На смене ' + s.hours + '</div>';
    } else if (s.status === 'dit') {
      body = '<div class="dayinfo__name">Дежурит ДИТ</div>' +
        '<div class="dayinfo__line">Администратор ЕЦП на смену не выходит</div>';
    } else {
      body = '<div class="dayinfo__name">Нет данных</div>' +
        '<div class="dayinfo__line">В графике на эту дату смена не указана</div>';
    }

    var chips = '';
    if (day) {
      day.notes.forEach(function (n) {
        chips += '<span class="chip ' + (n.type === 'vacation' ? 'chip--warn' : 'chip--calm') + '">' + n.text + '</span>';
      });
      if (day.status !== 'unknown' && day.nominal && day.actual.length && day.nominal !== day.actual[0]) {
        chips += '<span class="chip chip--calm">по графику: ' + G.admins[day.nominal].short + '</span>';
      }
    }
    if (chips) body += '<div class="dayinfo__chips">' + chips + '</div>';

    if (gaps.length) {
      body += '<div class="alert">В этом месяце замена не указана в графике для: ' +
        gaps.join(', ') + ' — в эти дни дежурный администратор не определён.</div>';
    }
    info.innerHTML = head + body;
  }

  function go(delta) {
    viewM += delta;
    if (viewM < 0) { viewM = 11; viewY--; }
    if (viewM > 11) { viewM = 0; viewY++; }
    render();
  }

  grid.addEventListener('click', function (ev) {
    var btn = ev.target.closest('.day');
    if (!btn || !btn.dataset.date) return;
    sel = btn.dataset.date;
    var d = E.parseISO(sel);
    if (d.getMonth() !== viewM || d.getFullYear() !== viewY) { viewM = d.getMonth(); viewY = d.getFullYear(); }
    if (jump) jump.value = sel;
    try { history.replaceState(null, '', '?date=' + sel); } catch (e) {}
    render();
  });

  document.getElementById('prev').addEventListener('click', function () { go(-1); });
  document.getElementById('next').addEventListener('click', function () { go(1); });
  document.getElementById('todayBtn').addEventListener('click', function () {
    var t = E.parseISO(today);
    viewY = t.getFullYear(); viewM = t.getMonth(); sel = today;
    if (jump) jump.value = sel;
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
    render();
  });

  if (jump) {
    jump.min = minDate; jump.max = maxDate; jump.value = sel;
    jump.addEventListener('change', function () {
      if (!jump.value) return;
      sel = jump.value;
      var d = E.parseISO(sel);
      viewY = d.getFullYear(); viewM = d.getMonth();
      try { history.replaceState(null, '', '?date=' + sel); } catch (e) {}
      render();
    });
  }

  render();
})();
