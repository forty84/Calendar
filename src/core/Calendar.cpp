#include "Calendar.hpp"
#include "TimeUtils.hpp"
#include <algorithm>

namespace CalendarApp::Core {

void Calendar::addEvent(const Event& event) {
    m_events.push_back(event);
}

bool Calendar::removeEvent(const std::string& id) {
    auto it = std::remove_if(m_events.begin(), m_events.end(), [&id](const Event& e) {
        return e.getId() == id;
    });
    if (it != m_events.end()) {
        m_events.erase(it, m_events.end());
        return true;
    }
    return false;
}

std::vector<Event> Calendar::getEventsForDay(const std::chrono::system_clock::time_point& date) const {
    std::vector<Event> result;
    for (const auto& e : m_events) {
        if (TimeUtils::isSameDay(e.getStartTime(), date)) {
            result.push_back(e);
        }
    }
    return result;
}

const std::vector<Event>& Calendar::getAllEvents() const {
    return m_events;
}

void Calendar::loadEvents(const std::vector<Event>& events) {
    m_events = events;
}

}