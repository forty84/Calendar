import { api, IS_WEBVIEW } from "./api.js";
import {
  formatPeriodTitle,
  renderCalendarView,
  renderMiniCalendar,
} from "./calendar.js";
import {
  createModalController,
  renderSearchResults,
  renderUpcomingReminders,
  showToast,
} from "./ui.js";

const state = {
  view: "week", // 'day' | 'week' | 'month'
  currentDate: new Date(),
  miniCalMonth: new Date(),
  events: [],
  isFirstLoad: true,
};

// Элементы DOM
const periodTitleEl = document.getElementById("current-period-title");
const viewportEl = document.getElementById("calendar-viewport");
const searchPanelEl = document.getElementById("search-results-panel");
const searchInputEl = document.getElementById("search-input");
const btnClearSearch = document.getElementById("btn-clear-search");
const btnCloseSearch = document.getElementById("btn-close-search");
const runtimeBadgeEl = document.getElementById("runtime-mode-badge");

const miniTitleEl = document.getElementById("mini-cal-title");
const miniGridEl = document.getElementById("mini-cal-grid");

/**
 * Отображает текущий режим работы (C++ WebView или Браузер Mock)
 */
function setupRuntimeBadge() {
  if (IS_WEBVIEW) {
    runtimeBadgeEl.textContent = "C++ WebView";
    runtimeBadgeEl.classList.add("webview");
  } else {
    runtimeBadgeEl.textContent = "Браузер (Mock)";
  }
}

/**
 * Загружает все события через api.js и обновляет интерфейс
 */
async function refreshEventsAndRender() {
  const response = await api.call("getEvents", {});
  if (!response.ok) {
    showToast(response.error || "Ошибка загрузки событий", "error");
    return;
  }

  state.events = response.data || [];
  renderAll();

  renderUpcomingReminders(
    state.events,
    (ev) => modal.openForEdit(ev),
    state.isFirstLoad
  );
  state.isFirstLoad = false;
}

/**
 * Перерисовывает шапку, основную сетку и мини-календарь
 */
function renderAll() {
  periodTitleEl.textContent = formatPeriodTitle(state.view, state.currentDate);

  renderCalendarView({
    container: viewportEl,
    view: state.view,
    currentDate: state.currentDate,
    events: state.events,
    onSlotClick: (slotDate) => modal.openForCreate(slotDate),
    onEventClick: (eventObj) => modal.openForEdit(eventObj),
    onDayNumberClick: (dayDate) => {
      state.currentDate = new Date(dayDate);
      setView("day");
    },
  });

  renderMiniCalendar({
    titleEl: miniTitleEl,
    gridEl: miniGridEl,
    displayMonthDate: state.miniCalMonth,
    selectedDate: state.currentDate,
    onSelectDate: (pickedDate) => {
      state.currentDate = new Date(pickedDate);
      state.miniCalMonth = new Date(pickedDate.getFullYear(), pickedDate.getMonth(), 1);
      closeSearchPanel();
      renderAll();
    },
  });
}

function setView(newView) {
  state.view = newView;
  document.querySelectorAll(".btn-view").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === newView);
  });
  closeSearchPanel();
  renderAll();
}

function shiftPeriod(direction) {
  const d = new Date(state.currentDate);
  if (state.view === "day") {
    d.setDate(d.getDate() + direction);
  } else if (state.view === "week") {
    d.setDate(d.getDate() + direction * 7);
  } else {
    d.setMonth(d.getMonth() + direction);
  }
  state.currentDate = d;
  state.miniCalMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  renderAll();
}

function closeSearchPanel() {
  searchPanelEl.classList.add("hidden");
  viewportEl.classList.remove("hidden");
}

// Инициализация модального окна
const modal = createModalController({
  onSave: async (payload) => {
    const isEdit = Boolean(payload.id);
    const action = isEdit ? "updateEvent" : "addEvent";
    const res = await api.call(action, payload);
    if (res.ok) {
      showToast(isEdit ? "Событие обновлено" : "Событие создано");
      await refreshEventsAndRender();
    }
    return res;
  },
  onDelete: async (id) => {
    const res = await api.call("deleteEvent", { id });
    if (res.ok) {
      showToast("Событие удалено");
      await refreshEventsAndRender();
    }
    return res;
  },
});

// Навигация и обработчики кнопок
document.getElementById("btn-today").addEventListener("click", () => {
  const now = new Date();
  state.currentDate = now;
  state.miniCalMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  closeSearchPanel();
  renderAll();
});

document.getElementById("btn-prev").addEventListener("click", () => shiftPeriod(-1));
document.getElementById("btn-next").addEventListener("click", () => shiftPeriod(1));

document.getElementById("btn-create-event").addEventListener("click", () => {
  modal.openForCreate(state.currentDate);
});

document.querySelectorAll(".btn-view").forEach((btn) => {
  btn.addEventListener("click", () => setView(btn.dataset.view));
});

// Навигация мини-календаря
document.getElementById("mini-prev").addEventListener("click", () => {
  state.miniCalMonth.setMonth(state.miniCalMonth.getMonth() - 1);
  renderAll();
});

document.getElementById("mini-next").addEventListener("click", () => {
  state.miniCalMonth.setMonth(state.miniCalMonth.getMonth() + 1);
  renderAll();
});

// Поиск событий
let searchTimeout = null;
searchInputEl.addEventListener("input", () => {
  const query = searchInputEl.value.trim();
  btnClearSearch.classList.toggle("hidden", query.length === 0);

  clearTimeout(searchTimeout);
  if (!query) {
    closeSearchPanel();
    return;
  }

  searchTimeout = setTimeout(async () => {
    const res = await api.call("search", { query });
    if (res.ok) {
      viewportEl.classList.add("hidden");
      searchPanelEl.classList.remove("hidden");
      renderSearchResults(res.data || [], query, (ev) => modal.openForEdit(ev));
    }
  }, 180);
});

btnClearSearch.addEventListener("click", () => {
  searchInputEl.value = "";
  btnClearSearch.classList.add("hidden");
  closeSearchPanel();
});

btnCloseSearch.addEventListener("click", () => {
  searchInputEl.value = "";
  btnClearSearch.classList.add("hidden");
  closeSearchPanel();
});

// Запуск при загрузке страницы
setupRuntimeBadge();
refreshEventsAndRender();