#include "Event.hpp"

namespace CalendarApp::Core {

Event::Event(std::string id, std::string title, std::string description, 
             std::chrono::system_clock::time_point startTime, 
             std::chrono::system_clock::time_point endTime, bool isAllDay)
    : m_id(std::move(id)), m_title(std::move(title)), m_description(std::move(description)),
      m_startTime(startTime), m_endTime(endTime), m_isAllDay(isAllDay) {}

bool Event::conflictsWith(const Event& other) const {
    return m_startTime < other.m_endTime && m_endTime > other.m_startTime;
}

std::string Event::getId() const { return m_id; }
std::string Event::getTitle() const { return m_title; }
std::string Event::getDescription() const { return m_description; }
std::chrono::system_clock::time_point Event::getStartTime() const { return m_startTime; }
std::chrono::system_clock::time_point Event::getEndTime() const { return m_endTime; }
bool Event::isAllDay() const { return m_isAllDay; }

}