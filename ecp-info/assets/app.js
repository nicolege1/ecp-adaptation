/* Общие помощники: московские даты, названия месяцев и дней, разбор смены. */
(function () {
  'use strict';
  var MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  var MONTHS_NOM = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  var WD = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];

  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* «сегодня» по Москве, независимо от часового пояса зрителя */
  function moscowToday() {
    var s = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' });
    return s;
  }

  function parseISO(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }

  function humanDate(s) {          /* 25 октября 2026 */
    var d = parseISO(s);
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  function weekday(s) { return WD[parseISO(s).getDay()]; }

  function shiftOf(s) {
    var g = window.GRAFIK;
    var day = g.days[s];
    if (!day) return { status: 'none', text: 'нет данных на эту дату', admins: [] };
    if (day.status === 'shift') {
      var h = day.hours || g.shift;   /* «с 9 до 18» в графике важнее общей смены */
      return {
        status: 'shift',
        admins: day.actual,
        names: day.actual.map(function (k) { return g.admins[k].name; }).join(', '),
        hours: h.start + ' – ' + h.end,
        shortHours: String(parseInt(h.start, 10)) + '–' + String(parseInt(h.end, 10))
      };
    }
    if (day.status === 'dit') {
      return { status: 'dit', admins: [], names: 'Поддержка ДИТ', note: (day.notes.filter(function (n) { return n.type === 'dit'; })[0] || {}).text };
    }
    return { status: 'none', admins: [], names: 'Нет данных' };
  }

  function colorOf(key) {
    if (key === 'grishutkin') return 'blue';
    if (key === 'abramov') return 'green';
    return 'none';
  }

  function initials(key) {
    var a = window.GRAFIK.admins[key];
    if (!a) return '—';
    var parts = a.name.split(' ');
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }

  window.ECP = {
    MONTHS: MONTHS, MONTHS_NOM: MONTHS_NOM, WD: WD,
    iso: iso, moscowToday: moscowToday, parseISO: parseISO,
    humanDate: humanDate, weekday: weekday, shiftOf: shiftOf,
    colorOf: colorOf, initials: initials
  };
})();
