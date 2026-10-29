#include "TimeUtils.hpp"
#include <ctime>

namespace CalendarApp::Core {

bool TimeUtils::isSameDay(const std::chrono::system_clock::time_point& t1, const std::chrono::system_clock::time_point& t2) {
    std::time_t tt1 = std::chrono::system_clock::to_time_t(t1);
    std::time_t tt2 = std::chrono::system_clock::to_time_t(t2);
    std::tm tm1{}, tm2{};
    
#if defined(_MSC_VER)
    localtime_s(&tm1, &tt1);
    localtime_s(&tm2, &tt2);
#else
    localtime_r(&tt1, &tm1);
    localtime_r(&tt2, &tm2);
#endif

    return tm1.tm_year == tm2.tm_year &&
           tm1.tm_mon == tm2.tm_mon &&
           tm1.tm_mday == tm2.tm_mday;
}

}