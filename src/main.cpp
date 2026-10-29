#include "calendar/app/AppController.hpp"
#include "calendar/app/Bridge.hpp"
#include "calendar/storage/JsonFileStorage.hpp"
#include "calendar/ui/WebViewHost.hpp"

#include <filesystem>
#include <iostream>
#include <memory>

namespace {

std::filesystem::path resolvePath(const std::filesystem::path& exeDir, const std::string& relativeTarget) {
    namespace fs = std::filesystem;

    // 1. Сначала проверяем относительно текущей рабочей директории (запуск из корня проекта)
    fs::path cwdCandidate = fs::current_path() / relativeTarget;
    if (fs::exists(cwdCandidate) || relativeTarget.rfind("data/", 0) == 0) {
        return cwdCandidate;
    }

    // 2. Иначе ищем рядом с бинарником (куда CMake скопировал frontend/ на этапе POST_BUILD)
    return exeDir / relativeTarget;
}

} // namespace

int main(int argc, char* argv[]) {
    try {
        namespace fs = std::filesystem;
        const fs::path exePath = (argc > 0 && argv[0]) ? fs::absolute(argv[0]).parent_path() : fs::current_path();

        const fs::path dataFile = resolvePath(exePath, "data/calendar.json");
        fs::path indexHtml = fs::current_path() / "frontend/index.html";
        if (!fs::exists(indexHtml)) {
            indexHtml = exePath / "frontend/index.html";
        }

        auto storage = std::make_shared<calendar::storage::JsonFileStorage>(dataFile);
        calendar::app::AppController controller(storage);
        calendar::app::Bridge bridge(controller);

        calendar::ui::WebViewHost host(bridge, indexHtml);
        host.run();

        return 0;
    } catch (const std::exception& ex) {
        std::cerr << "[Fatal Error]: " << ex.what() << std::endl;
        return 1;
    }
}