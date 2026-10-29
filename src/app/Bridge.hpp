#pragma once

#include "calendar/app/AppController.hpp"
#include <string>

namespace calendar::app {

class Bridge {
public:
    explicit Bridge(AppController& controller);

    // Принимает JSON-запрос от JS и возвращает JSON-ответ строкой
    std::string handle(const std::string& requestJson);

private:
    AppController& controller_;
};

} // namespace calendar::app