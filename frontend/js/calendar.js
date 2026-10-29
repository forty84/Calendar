const MONTHS_NOMINATIVE = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const MONTHS_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря"
];

const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/**
 * Возвращает понедельник недели для переданной даты
 */
export function getStartOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 - Вс, 1 - Пн ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatTimeShort(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function formatDateTimeHuman(isoStr) {
  const d = new Date(isoStr);
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}, ${formatTimeShort(d)}`;
}

/**
 * Формирует заголовок текущего периода для шапки
 */
export function formatPeriodTitle(view, currentDate) {
  const year = currentDate.getFullYear();
  const monthName = MONTHS_NOMINATIVE[currentDate.getMonth()];

  if (view === "month") {
    return `${monthName} ${year}`;
  }

  if (view === "day") {
    return `${currentDate.getDate()} ${MONTHS_GENITIVE[currentDate.getMonth()]} ${year}`;
  }

  // Неделя
  const start = getStartOfWeek(currentDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  if (start.getMonth() === end.getMonth()) {
    return `${MONTHS_NOMINATIVE[start.getMonth()]} ${year}`;
  }
  return `${MONTHS_NOMINATIVE[start.getMonth()].slice(0, 3)} – ${MONTHS_NOMINATIVE[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`;
}

/**
 * Главная функция рендера основной сетки календаря
 */
export function renderCalendarView({
  container,
  view,
  currentDate,
  events,
  onSlotClick,
  onEventClick,
  onDayNumberClick,
}) {
  container.innerHTML = "";

  if (view === "month") {
    renderMonthGrid(container, currentDate, events, onSlotClick, onEventClick);
  } else {
    const daysCount = view === "day" ? 1 : 7;
    renderTimeGrid(
      container,
      currentDate,
      daysCount,
      events,
      onSlotClick,
      onEventClick,
      onDayNumberClick
    );
  }
}

/**
 * Отрисовка сетки День / Неделя (24 часа, 1 мин = 1px)
 */
function renderTimeGrid(
  container,
  currentDate,
  daysCount,
  events,
  onSlotClick,
  onEventClick,
  onDayNumberClick
) {
  const startDay = daysCount === 1
    ? new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
    : getStartOfWeek(currentDate);

  const days = [];
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(startDay);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const today = new Date();

  // 1. Шапка дней недели
  const headerEl = document.createElement("div");
  headerEl.className = "time-grid-header";

  days.forEach((dayDate) => {
    const dayHeader = document.createElement("div");
    dayHeader.className = "time-grid-day-header";
    if (isSameDay(dayDate, today)) {
      dayHeader.classList.add("today");
    }

    const weekdayIdx = (dayDate.getDay() + 6) % 7;
    const nameEl = document.createElement("div");
    nameEl.className = "day-header-name";
    nameEl.textContent = WEEKDAYS_SHORT[weekdayIdx];

    const numEl = document.createElement("div");
    numEl.className = "day-header-number";
    numEl.textContent = dayDate.getDate();
    numEl.title = "Перейти к этому дню";
    numEl.addEventListener("click", () => onDayNumberClick(dayDate));

    dayHeader.appendChild(nameEl);
    dayHeader.appendChild(numEl);
    headerEl.appendChild(dayHeader);
  });

  // 2. Прокручиваемая область со шкалой часов и колонками дней
  const scrollEl = document.createElement("div");
  scrollEl.className = "time-grid-scroll";

  const labelsCol = document.createElement("div");
  labelsCol.className = "time-labels-col";

  for (let hour = 0; hour < 24; hour++) {
    const slot = document.createElement("div");
    slot.className = "time-label-slot";
    const span = document.createElement("span");
    span.textContent = hour === 0 ? "" : `${String(hour).padStart(2, "0")}:00`;
    slot.appendChild(span);
    labelsCol.appendChild(slot);
  }

  const columnsContainer = document.createElement("div");
  columnsContainer.className = "time-columns-container";

  days.forEach((dayDate) => {
    const col = document.createElement("div");
    col.className = "day-column";

    // Клик по пустому месту колонки открывает создание события на выбранный час
    col.addEventListener("click", (e) => {
      if (e.target !== col) return;
      const rect = col.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const clickedHour = Math.max(0, Math.min(23, Math.floor(offsetY / 60)));

      const slotStart = new Date(dayDate);
      slotStart.setHours(clickedHour, 0, 0, 0);
      onSlotClick(slotStart);
    });

    // Отрисовка событий, попадающих в этот день
    const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0);
    const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59);

    const dayEvents = events
      .map((ev) => ({
        raw: ev,
        start: new Date(ev.start),
        end: new Date(ev.end),
      }))
      .filter((item) => item.start <= dayEnd && item.end >= dayStart)
      .sort((a, b) => a.start - b.start);

    // Определяем пересечения (конфликты) внутри дня
    const layoutItems = computeDayEventLayout(dayEvents, dayStart, dayEnd);

    layoutItems.forEach((item) => {
      const block = document.createElement("div");
      block.className = "cal-event-block";
      if (item.hasConflict) {
        block.classList.add("conflict");
      }

      block.style.top = `${item.topPx}px`;
      block.style.height = `${item.heightPx}px`;
      block.style.width = `calc(${item.widthPercent}% - 6px)`;
      block.style.left = `calc(${item.leftPercent}% + 3px)`;

      const titleEl = document.createElement("div");
      titleEl.className = "cal-event-title";
      titleEl.textContent = item.raw.title;

      const timeEl = document.createElement("div");
      timeEl.className = "cal-event-time";
      timeEl.textContent = `${formatTimeShort(item.start)} – ${formatTimeShort(item.end)}`;

      block.appendChild(titleEl);
      block.appendChild(timeEl);

      if (item.raw.location && item.heightPx >= 48) {
        const locEl = document.createElement("div");
        locEl.className = "cal-event-loc";
        locEl.textContent = `📍 ${item.raw.location}`;
        block.appendChild(locEl);
      }

      block.addEventListener("click", (e) => {
        e.stopPropagation();
        onEventClick(item.raw);
      });

      col.appendChild(block);
    });

    // Красная линия текущего времени, если колонка — сегодняшний день
    if (isSameDay(dayDate, today)) {
      const currentMinutes = today.getHours() * 60 + today.getMinutes();
      const line = document.createElement("div");
      line.className = "current-time-line";
      line.style.top = `${currentMinutes}px`;
      col.appendChild(line);
    }

    columnsContainer.appendChild(col);
  });

  scrollEl.appendChild(labelsCol);
  scrollEl.appendChild(columnsContainer);

  container.appendChild(headerEl);
  container.appendChild(scrollEl);

  // Автопрокрутка к 08:00 утра для удобства
  requestAnimationFrame(() => {
    scrollEl.scrollTop = 8 * 60;
  });
}

/**
 * Рассчитывает вертикальную позицию (top/height) и горизонтальное смещение
 * при пересечении событий во времени.
 */
function computeDayEventLayout(dayEvents, dayStart, dayEnd) {
  const result = dayEvents.map((ev) => {
    const clampedStart = ev.start < dayStart ? dayStart : ev.start;
    const clampedEnd = ev.end > dayEnd ? dayEnd : ev.end;

    const startMin = clampedStart.getHours() * 60 + clampedStart.getMinutes();
    const endMin = clampedEnd.getHours() * 60 + clampedEnd.getMinutes();
    const duration = Math.max(22, endMin - startMin);

    return {
      ...ev,
      startMin,
      endMin: startMin + duration,
      topPx: startMin,
      heightPx: duration,
      hasConflict: false,
      colIndex: 0,
      totalCols: 1,
    };
  });

  // Поиск пересекающихся пар
  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      if (result[i].startMin < result[j].endMin && result[j].startMin < result[i].endMin) {
        result[i].hasConflict = true;
        result[j].hasConflict = true;
        if (result[j].colIndex === result[i].colIndex) {
          result[j].colIndex = result[i].colIndex + 1;
        }
      }
    }
  }

  // Нормализация ширины для пересекающихся событий
  for (let i = 0; i < result.length; i++) {
    let maxCol = result[i].colIndex;
    for (let j = 0; j < result.length; j++) {
      if (i !== j && result[i].startMin < result[j].endMin && result[j].startMin < result[i].endMin) {
        maxCol = Math.max(maxCol, result[j].colIndex);
      }
    }
    const colsCount = maxCol + 1;
    result[i].widthPercent = 100 / colsCount;
    result[i].leftPercent = result[i].colIndex * result[i].widthPercent;
  }

  return result;
}

/**
 * Отрисовка сетки Месяца (6 недель × 7 дней = 42 ячейки)
 */
function renderMonthGrid(container, currentDate, events, onSlotClick, onEventClick) {
  const wrapper = document.createElement("div");
  wrapper.className = "month-view-container";

  const header = document.createElement("div");
  header.className = "month-weekdays-header";
  WEEKDAYS_SHORT.forEach((name) => {
    const span = document.createElement("span");
    span.textContent = name;
    header.appendChild(span);
  });

  const grid = document.createElement("div");
  grid.className = "month-grid";

  const firstOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const gridStart = getStartOfWeek(firstOfMonth);
  const today = new Date();

  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(cellDate.getDate() + i);

    const cell = document.createElement("div");
    cell.className = "month-cell";
    if (cellDate.getMonth() !== currentDate.getMonth()) {
      cell.classList.add("other-month");
    }
    if (isSameDay(cellDate, today)) {
      cell.classList.add("today");
    }

    const cellHeader = document.createElement("div");
    cellHeader.className = "month-cell-header";

    const dateBadge = document.createElement("span");
    dateBadge.className = "month-cell-date";
    dateBadge.textContent = cellDate.getDate();
    cellHeader.appendChild(dateBadge);

    const eventsList = document.createElement("div");
    eventsList.className = "month-cell-events";

    const dayStart = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate(), 0, 0, 0);
    const dayEnd = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate(), 23, 59, 59);

    const cellEvents = events
      .filter((ev) => {
        const s = new Date(ev.start);
        const e = new Date(ev.end);
        return s <= dayEnd && e >= dayStart;
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    cellEvents.forEach((ev) => {
      const pill = document.createElement("div");
      pill.className = "month-event-pill";
      const s = new Date(ev.start);
      pill.textContent = `${formatTimeShort(s)} ${ev.title}`;
      pill.addEventListener("click", (e) => {
        e.stopPropagation();
        onEventClick(ev);
      });
      eventsList.appendChild(pill);
    });

    cell.addEventListener("click", () => {
      const defaultStart = new Date(cellDate);
      defaultStart.setHours(10, 0, 0, 0);
      onSlotClick(defaultStart);
    });

    cell.appendChild(cellHeader);
    cell.appendChild(eventsList);
    grid.appendChild(cell);
  }

  wrapper.appendChild(header);
  wrapper.appendChild(grid);
  container.appendChild(wrapper);
}

/**
 * Отрисовка мини-календаря в левом сайдбаре
 */
export function renderMiniCalendar({
  titleEl,
  gridEl,
  displayMonthDate,
  selectedDate,
  onSelectDate,
}) {
  const year = displayMonthDate.getFullYear();
  const month = displayMonthDate.getMonth();
  titleEl.textContent = `${MONTHS_NOMINATIVE[month]} ${year}`;

  gridEl.innerHTML = "";

  const firstDay = new Date(year, month, 1);
  const startCell = getStartOfWeek(firstDay);
  const today = new Date();

  for (let i = 0; i < 42; i++) {
    const d = new Date(startCell);
    d.setDate(d.getDate() + i);

    const cell = document.createElement("div");
    cell.className = "mini-day";
    cell.textContent = d.getDate();

    if (d.getMonth() !== month) {
      cell.classList.add("other-month");
    }
    if (isSameDay(d, selectedDate)) {
      cell.classList.add("selected");
    }
    if (isSameDay(d, today)) {
      cell.classList.add("today");
    }

    cell.addEventListener("click", () => onSelectDate(d));
    gridEl.appendChild(cell);
  }
}