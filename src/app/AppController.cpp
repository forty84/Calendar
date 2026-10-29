#include "calendar/app/AppController.hpp"
#include "calendar/core/TimeUtils.hpp"

#include <stdexcept>

namespace calendar::app {

using nlohmann::json;

AppController::AppController(std::shared_ptr<storage::IStorage> storage)
    : storage_(std::move(storage)) {
    if (!storage_) {
        throw std::invalid_argument("Storage pointer cannot be null");
    }
    calendar_ = core::Calendar(storage_->load());
}

json AppController::eventToJson(const core::Event& ev) {
    return json{
        {"id", ev.id},
        {"title", ev.title},
        {"description", ev.description},
        {"start", core::TimeUtils::formatIsoLocal(ev.start)},
        {"end", core::TimeUtils::formatIsoLocal(ev.end)},
        {"location", ev.location},
        {"reminderMinutes", ev.reminderMinutes}
    };
}

core::Event AppController::jsonToEvent(const json& j, bool requireId) {
    if (!j.is_object()) {
        throw std::invalid_argument("Payload должен быть JSON-объектом");
    }

    const std::string id = j.value("id", "");
    if (requireId && id.empty()) {
        throw std::invalid_argument("Не указан ID события");
    }

    const std::string startStr = j.value("start", "");
    const std::string endStr = j.value("end", "");

    const auto startOpt = core::TimeUtils::parseIsoLocal(startStr);
    const auto endOpt = core::TimeUtils::parseIsoLocal(endStr);

    if (!startOpt.has_value() || !endOpt.has_value()) {
        throw std::invalid_argument("Некорректный формат даты и времени (ожидается ISO 8601)");
    }

    core::Event ev;
    ev.id = id;
    ev.title = j.value("title", "");
    ev.description = j.value("description", "");
    ev.start = *startOpt;
    ev.end = *endOpt;
    ev.location = j.value("location", "");

    if (j.contains("reminderMinutes") && j["reminderMinutes"].is_number_integer()) {
        ev.reminderMinutes = j["reminderMinutes"].get<int>();
    } else {
        ev.reminderMinutes = 15;
    }

    return ev;
}

json AppController::getEvents(const json& payload) const {
    std::vector<core::Event> list;

    if (payload.is_object() && payload.contains("from") && payload.contains("to")) {
        const auto fromOpt = core::TimeUtils::parseIsoLocal(payload.value("from", ""));
        const auto toOpt = core::TimeUtils::parseIsoLocal(payload.value("to", ""));
        if (!fromOpt || !toOpt) {
            throw std::invalid_argument("Некорректный диапазон дат from/to");
        }
        list = calendar_.inRange(*fromOpt, *toOpt);
    } else {
        list = calendar_.all();
    }

    json arr = json::array();
    for (const auto& ev : list) {
        arr.push_back(eventToJson(ev));
    }
    return arr;
}

json AppController::addEvent(const json& payload) {
    core::Event ev = jsonToEvent(payload, false);
    core::Event created = calendar_.add(std::move(ev));
    storage_->save(calendar_.all());
    return eventToJson(created);
}

json AppController::updateEvent(const json& payload) {
    core::Event ev = jsonToEvent(payload, true);
    auto updatedOpt = calendar_.update(ev);
    if (!updatedOpt.has_value()) {
        throw std::runtime_error("Событие с указанным ID не найдено");
    }
    storage_->save(calendar_.all());
    return eventToJson(*updatedOpt);
}

json AppController::deleteEvent(const json& payload) {
    if (!payload.is_object() || !payload.contains("id")) {
        throw std::invalid_argument("Не указан ID события для удаления");
    }

    const std::string id = payload.value("id", "");
    if (!calendar_.remove(id)) {
        throw std::runtime_error("Событие для удаления не найдено");
    }

    storage_->save(calendar_.all());
    return json{{"id", id}};
}

json AppController::search(const json& payload) const {
    const std::string query = payload.is_object() ? payload.value("query", "") : "";
    auto matched = calendar_.find(query);

    if (payload.is_object()) {
        if (payload.contains("from") && !payload.value("from", "").empty()) {
            if (auto fromOpt = core::TimeUtils::parseIsoLocal(payload.value("from", ""))) {
                matched.erase(
                    std::remove_if(matched.begin(), matched.end(), [&](const core::Event& e) {
                        return e.start < *fromOpt;
                    }),
                    matched.end()
                );
            }
        }
        if (payload.contains("to") && !payload.value("to", "").empty()) {
            if (auto toOpt = core::TimeUtils::parseIsoLocal(payload.value("to", ""))) {
                matched.erase(
                    std::remove_if(matched.begin(), matched.end(), [&](const core::Event& e) {
                        return e.start > *toOpt;
                    }),
                    matched.end()
                );
            }
        }
    }

    json arr = json::array();
    for (const auto& ev : matched) {
        arr.push_back(eventToJson(ev));
    }
    return arr;
}

} // namespace calendar::app