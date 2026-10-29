#include "calendar/ui/WebViewHost.hpp"
#include "webview.h"

#include <stdexcept>

namespace calendar::ui {

WebViewHost::WebViewHost(app::Bridge& bridge, std::filesystem::path frontendIndexHtml)
    : bridge_(bridge)
    , frontendIndexHtml_(std::move(frontendIndexHtml)) {}

std::string WebViewHost::toFileUrl(const std::filesystem::path& path) {
    const auto absPath = std::filesystem::weakly_canonical(path);
    std::string generic = absPath.generic_string();
    if (!generic.empty() && generic.front() != '/') {
        // Для Windows путей вида C:/...
        return "file:///" + generic;
    }
    return "file://" + generic;
}

void WebViewHost::run() {
    if (!std::filesystem::exists(frontendIndexHtml_)) {
        throw std::runtime_error(
            "Файл интерфейса не найден: " + frontendIndexHtml_.string()
        );
    }

    // Первый параметр debug = true (разрешает открытие DevTools по правому клику при отладке)
    webview::webview w(true, nullptr);
    w.set_title("Локальный календарь");
    w.set_size(1280, 820, WEBVIEW_HINT_NONE);

    // Регистрируем нативный биндинг invoke(jsonString) -> Bridge::handle
    w.bind("invoke", [this](const std::string& seqArgs) -> std::string {
        return bridge_.handle(seqArgs);
    });

    // Прокидываем совместимый алиас window.external.invoke согласно архитектурной схеме
    w.init(R"JS(
        window.external = window.external || {};
        window.external.invoke = function(payload) {
            return window.invoke(payload);
        };
    )JS");

    w.navigate(toFileUrl(frontendIndexHtml_));
    w.run();
}

} // namespace calendar::ui