function toggleDropdown(id, others) {
  const el = document.getElementById(id);
  const willOpen = !el.classList.contains("open");
  others.forEach((o) => document.getElementById(o).classList.remove("open"));
  el.classList.toggle("open", willOpen);
}

document.getElementById("bellBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  toggleDropdown("bellPanel", ["userPanel"]);
});
document.getElementById("avatarBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  toggleDropdown("userPanel", ["bellPanel"]);
});
document.getElementById("userNotifItem").addEventListener("click", () => {
  document.getElementById("userPanel").classList.remove("open");
  document.getElementById("bellPanel").classList.add("open");
});
document.addEventListener("click", () => {
  document.getElementById("bellPanel").classList.remove("open");
  document.getElementById("userPanel").classList.remove("open");
});

async function loadNotifications() {
  const res = await fetch("/api/notifications");
  const items = await res.json();
  const unread = items.filter((n) => !n.read);
  const badge = document.getElementById("bellBadge");
  if (unread.length) { badge.style.display = "block"; badge.textContent = unread.length; }
  else { badge.style.display = "none"; }
  document.getElementById("unreadLabel").textContent = unread.length ? unread.length + " sin leer" : "Todo al día";

  const list = document.getElementById("notifList");
  list.innerHTML = items.map((n) =>
    '<div class="notif-item ' + (n.read ? "" : "unread") + '">' +
      '<div><p>' + n.title + '</p><span class="desc">' + n.desc + '</span><br><span class="time">' + n.time + '</span></div>' +
    '</div>'
  ).join("");
}

document.getElementById("markAllRead").addEventListener("click", async (e) => {
  e.preventDefault();
  await fetch("/api/notifications/read-all", { method: "PATCH" });
  loadNotifications();
});

loadNotifications();
