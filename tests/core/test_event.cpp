#include <catch2/catch_test_macros.hpp>
#include "calendar/storage/JsonFileStorage.hpp"
#include "calendar/core/TimeUtils.hpp"

#include <filesystem>

using namespace calendar::storage;
using namespace calendar::core;

TEST_CASE("JsonFileStorage save and load", "[storage][json]") {
    namespace fs = std::filesystem;
    fs::path testFile = "data/test_calendar.json";
    fs::path testBak = "data/test_calendar.json.bak";

    // Очищаем перед тестом
    fs::remove(testFile);
    fs::remove(testBak);

    {
        JsonFileStorage storage(testFile);
        // Загрузка несуществующего файла должна вернуть пустой список
        REQUIRE(storage.load().empty());

        auto start = *TimeUtils::parseIsoLocal("2026-10-17T14:00:00");
        auto end = *TimeUtils::parseIsoLocal("2026-10-17T15:00:00");

        Event ev{"test_id_99", "Тестовое событие", "Описание", start, end, "Zoom", 15};
        storage.save({ev});

        REQUIRE(fs::exists(testFile));
    }

    // Загружаем в новом экземпляре хранилища
    {
        JsonFileStorage storage(testFile);
        auto events = storage.load();
        REQUIRE(events.size() == 1);
        REQUIRE(events[0].id == "test_id_99");
        REQUIRE(events[0].title == "Тестовое событие");
        REQUIRE(events[0].location == "Zoom");
    }

    // Очистка после теста
    fs::remove(testFile);
    fs::remove(testBak);
}