const { getHolidays, toIsoDate } = require("./holidays");

// Utilidades de fechas "YYYY-MM-DD" (sin zonas horarias).

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseIso(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isValidIso(iso) {
  return typeof iso === "string" && ISO_RE.test(iso) && toIsoDate(parseIso(iso)) === iso;
}

function addDays(iso, n) {
  const date = parseIso(iso);
  date.setDate(date.getDate() + n);
  return toIsoDate(date);
}

const holidayCache = new Map();
function holidaysOf(year) {
  if (!holidayCache.has(year)) holidayCache.set(year, new Set(getHolidays(year).map((h) => h.date)));
  return holidayCache.get(year);
}

// Lunes a viernes que no sea festivo.
function isWorkingDay(iso) {
  const weekday = parseIso(iso).getDay();
  return weekday !== 0 && weekday !== 6 && !holidaysOf(Number(iso.slice(0, 4))).has(iso);
}

// Días laborables entre dos fechas, ambas incluidas.
function workingDaysBetween(from, to) {
  const days = [];
  for (let d = from; d <= to; d = addDays(d, 1)) if (isWorkingDay(d)) days.push(d);
  return days;
}

module.exports = { isValidIso, addDays, parseIso, isWorkingDay, workingDaysBetween, toIsoDate };
