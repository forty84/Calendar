#include <catch2/catch_test_macros.hpp>
#include "calendar/core/Calendar.hpp"
#include "calendar/core/TimeUtils.hpp"

using namespace calendar::core;

TEST_CASE("TimeUtils parsing and formatting", "[core][time]") {
    const std::string iso = "2026-10-17T15:30:00";
    auto tpOpt = TimeUtils::parseIsoLocal(iso);
    REQUIRE(tpOpt.has_value());

    std::string formatted = TimeUtils::formatIsoLocal(*tpOpt);
    REQUIRE(formatted == iso);

    // Проверка неверного формата
    auto invalidOpt = TimeUtils::parseIsoLocal("invalid-date");
    REQUIRE_FALSE(invalidOpt.has_value());
}

TEST_CASE("Calendar CRUD operations", "[core][calendar]") {
    Calendar cal;
    REQUIRE(cal.all().empty());

    auto start1 = *TimeUtils::parseIsoLocal("2026-10-17T10:00:00");
    auto end1 = *TimeUtils::parseIsoLocal("2026-10-17T11:00:00");

    Event ev1;
    ev1.title = "Встреча 1";
    ev1.start = start1;
    ev1.end = end1;
    ev1.location = "Zoom";

    Event created = cal.add(ev1);
    REQUIRE_FALSE(created.id.empty());
    REQUIRE(cal.all().size() == 1);

    // Попытка добавить событие, где конец раньше начала
    Event invalidEv;
    invalidEv.title = "Ошибка";
    invalidEv.start = end1;
    invalidEv.end = start1;
    REQUIRE_THROWS_AS(cal.add(invalidEv), std::invalid_argument);

    // Обновление события
    Event updated = created;
    updated.title = "Встреча 1 (обновленная)";
    auto updateResult = cal.update(updated);
    REQUIRE(updateResult.has_value());
    REQUIRE(updateResult->title == "Встреча 1 (обновленная)");

    // Получение по ID
    auto fetched = cal.getById(created.id);
    REQUIRE(fetched.has_value());
    REQUIRE(fetched->title == "Встреча 1 (обновленная)");

    // Удаление
    bool removed = cal.remove(created.id);
    REQUIRE(removed);
    REQUIRE(cal.all().empty());
}

TEST_CASE("Calendar search and conflict detection", "[core][calendar]") {
    Calendar cal;

    auto t1 = *TimeUtils::parseIsoLocal("2026-10-17T10:00:00");
    auto t2 = *TimeUtils::parseIsoLocal("2026-10-17T11:00:00");
    auto t3 = *TimeUtils::parseIsoLocal("2026-10-17T12:00:00");

    cal.add({"id_1", "Лекция по C++", "STL контейнеры", t1, t2, "Ауд. 302", 15});
    cal.add({"id_2", "Практика", "Пишем код", t2, t3, "Компьютерный класс", 10});

    // Поиск
    auto found = cal.find("C++");
    REQUIRE(found.size() == 1);
    REQUIRE(found[0].title == "Лекция по C++");

    auto foundLoc = cal.find("компьютерный");
    REQUIRE(foundLoc.size() == 1);

    // Проверка конфликтов (пересечений)
    auto conflictTimeStart = *TimeUtils::parseIsoLocal("2026-10-17T10:30:00");
    auto conflictTimeEnd = *TimeUtils::parseIsoLocal("2026-10-17T11:30:00");

    Event conflictingEvent{"", "Пересечение", "", conflictTimeStart, conflictTimeEnd, "", 15};
    REQUIRE(cal.hasConflict(conflictingEvent));

    Event safeEvent{"", "Без конфликта", "", t3, *TimeUtils::parseIsoLocal("2026-10-17T13:00:00"), "", 15};
    REQUIRE_FALSE(cal.hasConflict(safeEvent));
}