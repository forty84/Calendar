import { formatDateTimeHuman, formatTimeShort } from "./calendar.js";

/**
 * Форматирует Date для поля <input type="datetime-local"> (YYYY-MM-DDTHH:mm)
 */
export function toDatetimeLocalValue(dateOrIso) {
  const d = typeof dateOrIso === "string" ? new Date(dateOrIso) : dateOrIso;
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/**
 * Показывает всплывающее уведомление в правом нижнем углу
 */
export function showToast(message, type = "info", durationMs = 4500) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, durationMs);
}

/**
 * Управление модальным окном создания/редактирования события
 */
export function createModalController({ onSave, onDelete }) {
  const backdrop = document.getElementById("event-modal-backdrop");
  const modalTitle = document.getElementById("modal-title");
  const form = document.getElementById("event-form");
  const idInput = document.getElementById("event-id");
  const titleInput = document.getElementById("event-title");
  const startInput = document.getElementById("event-start");
  const endInput = document.getElementById("event-end");
  const locationInput = document.getElementById("event-location");
  const reminderSelect = document.getElementById("event-reminder");
  const descInput = document.getElementById("event-description");
  const errorBox = document.getElementById("form-error");

  const btnClose = document.getElementById("btn-close-modal");
  const btnCancel = document.getElementById("btn-cancel-modal");
  const btnDelete = document.getElementById("btn-delete-event");

  function hideError() {
    errorBox.textContent = "";
    errorBox.classList.add("hidden");
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
  }

  function openForCreate(defaultStartDate = new Date()) {
    hideError();
    modalTitle.textContent = "Новое событие";
    idInput.value = "";
    titleInput.value = "";

    const start = new Date(defaultStartDate);
    if ( defaultStartDate.getMinutes() === 0 && defaultStartDate.getSeconds() === 0 ) {
      // уже выровнено по часу
    } else {
      start.setHours(start.getHours() + 1, 0, 0, 0);
    }

    const end = new Date(start.getTime() + 60 * 60 * 1000);

    startInput.value = toDatetimeLocalValue(start);
    endInput.value = toDatetimeLocalValue(end);
    locationInput.value = "";
    reminderSelect.value = "15";
    descInput.value = "";

    btnDelete.classList.add("hidden");
    backdrop.classList.remove("hidden");
    titleInput.focus();
  }

  function openForEdit(eventObj) {
    hideError();
    modalTitle.textContent = "Редактирование события";
    idInput.value = eventObj.id;
    titleInput.value = eventObj.title || "";
    startInput.value = toDatetimeLocalValue(eventObj.start);
    endInput.value = toDatetimeLocalValue(eventObj.end);
    locationInput.value = eventObj.location || "";
    reminderSelect.value = String(eventObj.reminderMinutes ?? 15);
    descInput.value = eventObj.description || "";

    btnDelete.classList.remove("hidden");
    backdrop.classList.remove("hidden");
    titleInput.focus();
  }

  function close() {
    backdrop.classList.add("hidden");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const payload = {
      id: idInput.value || undefined,
      title: titleInput.value,
      start: `${startInput.value}:00`,
      end: `${endInput.value}:00`,
      location: locationInput.value,
      reminderMinutes: Number(reminderSelect.value),
      description: descInput.value,
    };

    const result = await onSave(payload);
    if (!result.ok) {
      showError(result.error || "Ошибка сохранения события");
      return;
    }

    close();
  });

  btnDelete.addEventListener("click", async () => {
    const id = idInput.value;
    if (!id) return;

    const result = await onDelete(id);
    if (!result.ok) {
      showError(result.error || "Не удалось удалить событие");
      return;
    }
    close();
  });

  btnClose.addEventListener("click", close);
  btnCancel.addEventListener("click", close);

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !backdrop.classList.contains("hidden")) {
      close();
    }
  });

  return { openForCreate, openForEdit, close };
}

/**
 * Отрисовывает список ближайших событий в левом сайдбаре
 * и показывает всплывающие напоминания при старте программы.
 */
export function renderUpcomingReminders(events, onEventClick, triggerStartupToasts = false) {
  const listEl = document.getElementById("upcoming-list");
  if (!listEl) return;

  const now = new Date();
  const upcoming = events
    .map((ev) => ({
      raw: ev,
      start: new Date(ev.start),
    }))
    .filter((item) => item.start >= now)
    .sort((a, b) => a.start - b.start)
    .slice(0, 5);

  listEl.innerHTML = "";

  if (upcoming.length === 0) {
    const p = document.createElement("p");
    p.className = "empty-hint";
    p.textContent = "Нет предстоящих событий";
    listEl.appendChild(p);
    return;
  }

  upcoming.forEach(({ raw, start }) => {
    const card = document.createElement("div");
    card.className = "upcoming-item";

    const title = document.createElement("div");
    title.className = "upcoming-item-title";
    title.textContent = raw.title;

    const time = document.createElement("div");
    time.className = "upcoming-item-time";
    time.textContent = formatDateTimeHuman(raw.start);

    card.appendChild(title);
    card.appendChild(time);
    card.addEventListener("click", () => onEventClick(raw));
    listEl.appendChild(card);

    // Проверка напоминания при запуске приложения
    if (triggerStartupToasts && raw.reminderMinutes > 0) {
      const diffMinutes = (start.getTime() - now.getTime()) / (1000 * 60);
      if (diffMinutes >= 0 && diffMinutes <= raw.reminderMinutes) {
        const minsLeft = Math.ceil(diffMinutes);
        showToast(
          `🔔 Напоминание: «${raw.title}» начнётся через ${minsLeft} мин. (${formatTimeShort(start)})`,
          "reminder",
          8000
        );
      }
    }
  });
}

/**
 * Отрисовывает результаты поиска поверх сетки календаря
 */
export function renderSearchResults(results, query, onEventClick) {
  const listEl = document.getElementById("search-results-list");
  listEl.innerHTML = "";

  if (results.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-hint";
    empty.textContent = `По запросу «${query}» ничего не найдено.`;
    listEl.appendChild(empty);
    return;
  }

  results.forEach((ev) => {
    const card = document.createElement("div");
    card.className = "search-result-card";

    const info = document.createElement("div");
    info.className = "search-result-info";

    const h4 = document.createElement("h4");
    h4.textContent = ev.title;

    const meta = document.createElement("div");
    meta.className = "search-result-meta";
    meta.textContent =
      `${formatDateTimeHuman(ev.start)} — ${formatTimeShort(new Date(ev.end))}` +
      (ev.location ? ` • 📍 ${ev.location}` : "");

    info.appendChild(h4);
    info.appendChild(meta);
    card.appendChild(info);

    card.addEventListener("click", () => onEventClick(ev));
    listEl.appendChild(card);
  });
}