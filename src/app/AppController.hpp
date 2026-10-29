#pragma once

#include "calendar/core/Calendar.hpp"
#include "calendar/storage/IStorage.hpp"

#include <memory>
#include <nlohmann/json.hpp>

namespace calendar::app {

class AppController {
public:
    explicit AppController(std::shared_ptr<storage::IStorage> storage);

    nlohmann::json getEvents(const nlohmann::json& payload) const;
    nlohmann::json addEvent(const nlohmann::json& payload);
    nlohmann::json updateEvent(const nlohmann::json& payload);
    nlohmann::json deleteEvent(const nlohmann::json& payload);
    nlohmann::json search(const nlohmann::json& payload) const;

private:
    std::shared_ptr<storage::IStorage> storage_;
    core::Calendar calendar_;

    static nlohmann::json eventToJson(const core::Event& ev);
    static core::Event jsonToEvent(const nlohmann::json& j, bool requireId);
};

} // namespace calendar::app