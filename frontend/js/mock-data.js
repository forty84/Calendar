const STORAGE_KEY = "local_calendar_mock_events_v1";

/**
 * Форматирует локальную дату в строку YYYY-MM-DDTHH:mm:ss (без часового пояса)
 */
function toLocalIsoString(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/**
 * Генерирует начальные тестовые события вокруг текущей даты,
 * чтобы при открытии в браузере сетка сразу выглядела живой.
 */
function createSeedEvents() {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  const makeDate = (dayOffset, hour, minute = 0) => {
    const d = new Date(base);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return toLocalIsoString(d);
  };

  return [
    {
      id: "1718974800001",
      title: "Встреча с командой по проекту",
      description: "Синхронизация по архитектуре C++ и WebView",
      start: makeDate(0, 10, 0),
      end: makeDate(0, 11, 30),
      location: "Аудитория 302",
      reminderMinutes: 15,
    },
    {
      id: "1718974800002",
      title: "Код-ревью модуля Storage",
      description: "Проверить атомарную запись и создание .bak файла",
      start: makeDate(0, 14, 0),
      end: makeDate(0, 15, 0),
      location: "Zoom",
      reminderMinutes: 30,
    },
    {
      id: "1718974800003",
      title: "Лекция по C++17 и STL",
      description: "Разбор std::chrono и умных указателей",
      start: makeDate(1, 12, 0),
      end: makeDate(1, 13, 30),
      location: "Корпус 4, ауд. 210",
      reminderMinutes: 15,
    },
    {
      id: "1718974800004",
      title: "Демонстрация прототипа календаря",
      description: "Показать работу в режиме браузера и нативного окна",
      start: makeDate(2, 16, 0),
      end: makeDate(2, 17, 30),
      location: "Лаборатория ИИТ",
      reminderMinutes: 60,
    },
  ];
}

function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedEvents();
      saveEvents(seed);
      return seed;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("Не удалось прочитать localStorage, сбрасываем:", e);
    return [];
  }
}

function saveEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function normalizeIso(str) {
  if (!str || typeof str !== "string") return "";
  // Если пришло из input[type="datetime-local"] в виде YYYY-MM-DDTHH:mm, добавляем :00
  return str.length === 16 ? `${str}:00` : str;
}

function validateEventPayload(payload) {
  const title = (payload.title || "").trim();
  if (!title) {
    return { valid: false, error: "Название события не может быть пустым" };
  }

  const startStr = normalizeIso(payload.start);
  const endStr = normalizeIso(payload.end);

  const startDate = new Date(startStr);
  const endDate = new Date(endStr);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { valid: false, error: "Некорректный формат даты и времени (ожидается ISO 8601)" };
  }

  if (endDate <= startDate) {
    return { valid: false, error: "Конец события раньше или равен началу" };
  }

  return {
    valid: true,
    clean: {
      title,
      description: (payload.description || "").trim(),
      start: startStr,
      end: endStr,
      location: (payload.location || "").trim(),
      reminderMinutes: Number.isFinite(Number(payload.reminderMinutes))
        ? Number(payload.reminderMinutes)
        : 15,
    },
  };
}

export const mockApi = {
  async call(action, payload = {}) {
    let events = loadEvents();

    switch (action) {
      case "getEvents": {
        const { from, to } = payload;
        let result = [...events];

        if (from && to) {
          const fromTime = new Date(normalizeIso(from)).getTime();
          const toTime = new Date(normalizeIso(to)).getTime();
          result = result.filter((ev) => {
            const evStart = new Date(ev.start).getTime();
            const evEnd = new Date(ev.end).getTime();
            return evStart < toTime && evEnd > fromTime;
          });
        }

        result.sort((a, b) => new Date(a.start) - new Date(b.start));
        return { ok: true, data: result };
      }

      case "addEvent": {
        const check = validateEventPayload(payload);
        if (!check.valid) {
          return { ok: false, error: check.error };
        }

        const newEvent = {
          id: String(Date.now()) + String(Math.floor(Math.random() * 1000)),
          ...check.clean,
        };

        events.push(newEvent);
        saveEvents(events);
        return { ok: true, data: newEvent };
      }

      case "updateEvent": {
        if (!payload.id) {
          return { ok: false, error: "Не указан ID события для обновления" };
        }

        const index = events.findIndex((e) => e.id === payload.id);
        if (index === -1) {
          return { ok: false, error: "Событие не найдено" };
        }

        const check = validateEventPayload(payload);
        if (!check.valid) {
          return { ok: false, error: check.error };
        }

        const updated = {
          id: payload.id,
          ...check.clean,
        };

        events[index] = updated;
        saveEvents(events);
        return { ok: true, data: updated };
      }

      case "deleteEvent": {
        if (!payload.id) {
          return { ok: false, error: "Не указан ID события для удаления" };
        }

        const initialLen = events.length;
        events = events.filter((e) => e.id !== payload.id);
        if (events.length === initialLen) {
          return { ok: false, error: "Событие для удаления не найдено" };
        }

        saveEvents(events);
        return { ok: true, data: { id: payload.id } };
      }

      case "search": {
        const query = (payload.query || "").trim().toLowerCase();
        const from = payload.from ? new Date(normalizeIso(payload.from)).getTime() : null;
        const to = payload.to ? new Date(normalizeIso(payload.to)).getTime() : null;

        const matched = events.filter((ev) => {
          const textMatch =
            !query ||
            ev.title.toLowerCase().includes(query) ||
            (ev.description && ev.description.toLowerCase().includes(query)) ||
            (ev.location && ev.location.toLowerCase().includes(query));

          if (!textMatch) return false;

          const evStart = new Date(ev.start).getTime();
          if (from !== null && evStart < from) return false;
          if (to !== null && evStart > to) return false;

          return true;
        });

        matched.sort((a, b) => new Date(a.start) - new Date(b.start));
        return { ok: true, data: matched };
      }

      default:
        return { ok: false, error: `Неизвестное действие: ${action}` };
    }
  },
};