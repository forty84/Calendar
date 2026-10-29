#include "calendar/app/Bridge.hpp"
#include <nlohmann/json.hpp>

namespace calendar::app {

using nlohmann::json;

Bridge::Bridge(AppController& controller)
    : controller_(controller) {}

std::string Bridge::handle(const std::string& requestJson) {
    try {
        json req = json::parse(requestJson);

        // Если вызов пришёл через webview::bind("invoke", ...), аргументы приходят массивом: ["{...}"]
        if (req.is_array() && !req.empty()) {
            if (req[0].is_string()) {
                req = json::parse(req[0].get<std::string>());
            } else if (req[0].is_object()) {
                req = req[0];
            }
        }

        if (!req.is_object() || !req.contains("action") || !req["action"].is_string()) {
            return json{{"ok", false}, {"error", "Поле 'action' обязательно"}}.dump();
        }

        const std::string action = req["action"].get<std::string>();
        const json payload = req.value("payload", json::object());

        json resultData;
        if (action == "getEvents") {
            resultData = controller_.getEvents(payload);
        } else if (action == "addEvent") {
            resultData = controller_.addEvent(payload);
        } else if (action == "updateEvent") {
            resultData = controller_.updateEvent(payload);
        } else if (action == "deleteEvent") {
            resultData = controller_.deleteEvent(payload);
        } else if (action == "search") {
            resultData = controller_.search(payload);
        } else {
            return json{{"ok", false}, {"error", "Неизвестное действие: " + action}}.dump();
        }

        return json{
            {"ok", true},
            {"data", resultData}
        }.dump();

    } catch (const std::exception& ex) {
        return json{
            {"ok", false},
            {"error", ex.what()}
        }.dump();
    }
}

} // namespace calendar::app