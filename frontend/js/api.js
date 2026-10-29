import { mockApi } from "./mock-data.js";

/**
 * Определяем, запущен ли фронтенд внутри C++ WebView.
 * Библиотека webview/webview при вызове bind("invoke", ...) создаёт window.invoke,
 * а также мы проверяем window.external.invoke согласно спецификации проекта.
 */
const hasNativeInvoke =
  typeof window.invoke === "function" ||
  (typeof window.external !== "undefined" && typeof window.external.invoke === "function");

export const IS_WEBVIEW = hasNativeInvoke;

const webviewApi = {
  async call(action, payload = {}) {
    const requestStr = JSON.stringify({ action, payload });

    try {
      let rawResponse;
      if (typeof window.invoke === "function") {
        // Стандартный биндинг webview/webview (возвращает Promise)
        rawResponse = await window.invoke(requestStr);
      } else {
        // Вызов через window.external.invoke
        rawResponse = await window.external.invoke(requestStr);
      }

      if (typeof rawResponse === "string") {
        return JSON.parse(rawResponse);
      }
      return rawResponse;
    } catch (err) {
      console.error("[WebView API Error]:", err);
      return {
        ok: false,
        error: err?.message || "Ошибка связи с C++ бэкендом",
      };
    }
  },
};

export const api = IS_WEBVIEW ? webviewApi : mockApi;