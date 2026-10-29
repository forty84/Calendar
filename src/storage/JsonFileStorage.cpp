#include "JsonFileStorage.hpp"
#include <fstream>
#include <nlohmann/json.hpp>

namespace CalendarApp::Storage {

JsonFileStorage::JsonFileStorage(std::string filePath) : m_filePath(std::move(filePath)) {}

void JsonFileStorage::save(const std::vector<Core::Event>& events) {
    nlohmann::json jArray = nlohmann::json::array();
    for (const auto& e : events) {
        nlohmann::json j;
        j["id"] = e.getId();
        j["title"] = e.getTitle();
        j["description"] = e.getDescription();
        j["startTime"] = std::chrono::system_clock::to_time_t(e.getStartTime());
        j["endTime"] = std::chrono::system_clock::to_time_t(e.getEndTime());
        j["isAllDay"] = e.isAllDay();
        jArray.push_back(j);
    }

    std::ofstream file(m_filePath);
    if (file.is_open()) {
        file << jArray.dump(4);
    }
}

std::vector<Core::Event> JsonFileStorage::load() {
    std::vector<Core::Event> events;
    std::ifstream file(m_filePath);
    if (!file.is_open()) return events;

    try {
        nlohmann::json jArray;
        file >> jArray;
        for (const auto& j : jArray) {
            auto start = std::chrono::system_clock::from_time_t(j["startTime"].get<std::time_t>());
            auto end = std::chrono::system_clock::from_time_t(j["endTime"].get<std::time_t>());
            Core::Event e(
                j["id"].get<std::string>(),
                j["title"].get<std::string>(),
                j["description"].get<std::string>(),
                start, end,
                j["isAllDay"].get<bool>()
            );
            events.push_back(e);
        }
    } catch (...) {
        // Обработка ошибок парсинга JSON
    }

    return events;
}

}