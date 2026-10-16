// Días de descanso obligatorio en México (Ley Federal del Trabajo, art. 74).
// La BD no tiene catálogo de festivos, así que se calculan aquí.

// Fecha local -> "YYYY-MM-DD".
function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// n-ésimo lunes del mes (month: 0-11).
function nthMonday(year, month, n) {
  const first = new Date(year, month, 1);
  const offset = (8 - first.getDay()) % 7; // días hasta el primer lunes
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

function getHolidays(year) {
  const list = [
    { date: new Date(year, 0, 1), name: "Año Nuevo" },
    { date: nthMonday(year, 1, 1), name: "Día de la Constitución" },
    { date: nthMonday(year, 2, 3), name: "Natalicio de Benito Juárez" },
    { date: new Date(year, 4, 1), name: "Día del Trabajo" },
    { date: new Date(year, 8, 16), name: "Día de la Independencia" },
    { date: nthMonday(year, 10, 3), name: "Día de la Revolución" },
    { date: new Date(year, 11, 25), name: "Navidad" },
  ];
  // Transmisión del Poder Ejecutivo Federal (cada 6 años desde 2024).
  if (year >= 2024 && (year - 2024) % 6 === 0) {
    list.push({ date: new Date(year, 9, 1), name: "Transmisión del Poder Ejecutivo" });
  }
  return list
    .map((h) => ({ date: toIsoDate(h.date), name: h.name }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = { getHolidays, toIsoDate };
