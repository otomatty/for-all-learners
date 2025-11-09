"use strict";
(() => {
  let pluginInstance = null;
  let requestId = 0;
  const pendingRequests = /* @__PURE__ */ new Map();
  const pendingWorkerMethods = /* @__PURE__ */ new Map();
  const registerWorkerMethod = (methodName, fn) => {
    if (pluginInstance) {
      pluginInstance.methods[methodName] = fn;
    } else {
      pendingWorkerMethods.set(methodName, fn);
    }
  };
  const MessageTypes = {
    INIT: "INIT",
    CALL_METHOD: "CALL_METHOD",
    DISPOSE: "DISPOSE",
    API_CALL: "API_CALL",
    API_RESPONSE: "API_RESPONSE",
    ERROR: "ERROR",
    CONSOLE_LOG: "CONSOLE_LOG"
  };
  const serializeArg = (arg) => {
    try {
      return typeof arg === "object" ? JSON.stringify(arg) : String(arg);
    } catch {
      return String(arg);
    }
  };
  const forwardLog = (level, args) => {
    self.postMessage({
      type: MessageTypes.CONSOLE_LOG,
      payload: { level, args: args.map(serializeArg) }
    });
  };
  const originalConsole = {
    // biome-ignore lint/suspicious/noConsole: Preserving original console methods for forwarding logs
    log: console.log,
    // biome-ignore lint/suspicious/noConsole: Preserving original console methods for forwarding logs
    error: console.error,
    // biome-ignore lint/suspicious/noConsole: Preserving original console methods for forwarding logs
    warn: console.warn,
    // biome-ignore lint/suspicious/noConsole: Preserving original console methods for forwarding logs
    info: console.info,
    // biome-ignore lint/suspicious/noConsole: Preserving original console methods for forwarding logs
    debug: console.debug
  };
  console.log = (...args) => {
    forwardLog("log", args);
    originalConsole.log.apply(console, args);
  };
  console.error = (...args) => {
    forwardLog("error", args);
    originalConsole.error.apply(console, args);
  };
  console.warn = (...args) => {
    forwardLog("warn", args);
    originalConsole.warn.apply(console, args);
  };
  console.info = (...args) => {
    forwardLog("info", args);
    originalConsole.info.apply(console, args);
  };
  console.debug = (...args) => {
    forwardLog("debug", args);
    originalConsole.debug.apply(console, args);
  };
  const sendError = (error) => {
    self.postMessage({
      type: MessageTypes.ERROR,
      payload: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : void 0
      }
    });
  };
  const callHostAPI = (namespace, method, args) => {
    return new Promise((resolve, reject) => {
      const reqId = `req_${++requestId}`;
      pendingRequests.set(reqId, { resolve, reject });
      self.postMessage({
        type: MessageTypes.API_CALL,
        requestId: reqId,
        payload: { namespace, method, args }
      });
      setTimeout(() => {
        if (pendingRequests.has(reqId)) {
          pendingRequests.delete(reqId);
          reject(new Error(`API call timeout: ${namespace}.${method}`));
        }
      }, 3e4);
    });
  };
  const createPluginAPIProxy = () => ({
    app: {
      getVersion: () => callHostAPI("app", "getVersion", []),
      getName: () => callHostAPI("app", "getName", []),
      getUserId: () => callHostAPI("app", "getUserId", [])
    },
    storage: {
      get: (key) => callHostAPI("storage", "get", [key]),
      set: (key, value) => callHostAPI("storage", "set", [key, value]),
      delete: (key) => callHostAPI("storage", "delete", [key]),
      keys: () => callHostAPI("storage", "keys", []),
      clear: () => callHostAPI("storage", "clear", [])
    },
    notifications: {
      show: (message, type) => callHostAPI("notifications", "show", [message, type]),
      info: (message) => callHostAPI("notifications", "info", [message]),
      success: (message) => callHostAPI("notifications", "success", [message]),
      error: (message) => callHostAPI("notifications", "error", [message]),
      warning: (message) => callHostAPI("notifications", "warning", [message])
    },
    ui: {
      registerCommand: (command) => callHostAPI("ui", "registerCommand", [
        (() => {
          if (!command || typeof command !== "object") {
            return command;
          }
          const commandOptions = command;
          if (!commandOptions.id) {
            return command;
          }
          const handler = typeof commandOptions.handler === "function" ? commandOptions.handler : typeof commandOptions.execute === "function" ? commandOptions.execute : null;
          if (!handler) {
            return command;
          }
          const methodName = `__command_handler_${commandOptions.id}`;
          registerWorkerMethod(
            methodName,
            handler
          );
          const { handler: _handler, execute: _execute, ...rest } = commandOptions;
          return rest;
        })()
      ]),
      unregisterCommand: (commandId) => callHostAPI("ui", "unregisterCommand", [commandId]),
      showDialog: (options) => callHostAPI("ui", "showDialog", [options]),
      registerWidget: (options) => {
        const widgetOptions = options || {};
        if (widgetOptions.render && typeof widgetOptions.render === "function") {
          const methodName = `__widget_render_${widgetOptions.id}`;
          registerWorkerMethod(methodName, widgetOptions.render);
          const { render, ...optionsWithoutRender } = widgetOptions;
          return callHostAPI("ui", "registerWidget", [optionsWithoutRender]);
        }
        return callHostAPI("ui", "registerWidget", [options]);
      },
      unregisterWidget: (widgetId) => callHostAPI("ui", "unregisterWidget", [widgetId]),
      registerPage: (options) => callHostAPI("ui", "registerPage", [options]),
      unregisterPage: (pageId) => callHostAPI("ui", "unregisterPage", [pageId]),
      registerSidebarPanel: (options) => callHostAPI("ui", "registerSidebarPanel", [options]),
      unregisterSidebarPanel: (panelId) => callHostAPI("ui", "unregisterSidebarPanel", [panelId])
    },
    calendar: {
      registerExtension: (options) => callHostAPI("calendar", "registerExtension", [
        (() => {
          if (!options || typeof options !== "object") {
            return options;
          }
          const extensionOptions = options;
          if (!extensionOptions.id || typeof extensionOptions.getDailyData !== "function") {
            return options;
          }
          const methodName = `__calendar_getDailyData_${extensionOptions.id}`;
          registerWorkerMethod(
            methodName,
            extensionOptions.getDailyData
          );
          const { getDailyData: _getDailyData, ...rest } = extensionOptions;
          return rest;
        })()
      ]),
      unregisterExtension: (extensionId) => callHostAPI("calendar", "unregisterExtension", [extensionId])
    },
    integration: {
      registerOAuthProvider: (options) => callHostAPI("integration", "registerOAuthProvider", [options]),
      unregisterOAuthProvider: (providerId) => callHostAPI("integration", "unregisterOAuthProvider", [providerId]),
      registerWebhook: (options) => callHostAPI("integration", "registerWebhook", [options]),
      unregisterWebhook: (webhookId) => callHostAPI("integration", "unregisterWebhook", [webhookId]),
      registerExternalAPI: (options) => callHostAPI("integration", "registerExternalAPI", [options]),
      unregisterExternalAPI: (apiId) => callHostAPI("integration", "unregisterExternalAPI", [apiId]),
      callExternalAPI: (apiId, request) => callHostAPI("integration", "callExternalAPI", [apiId, request])
    },
    editor: {
      registerExtension: (options) => callHostAPI("editor", "registerExtension", [options]),
      unregisterExtension: (extensionId) => callHostAPI("editor", "unregisterExtension", [extensionId]),
      executeCommand: (command, ...args) => callHostAPI("editor", "executeCommand", [command, ...args]),
      getContent: (editorId) => callHostAPI("editor", "getContent", [editorId]),
      setContent: (content, editorId) => callHostAPI("editor", "setContent", [content, editorId]),
      getSelection: (editorId) => callHostAPI("editor", "getSelection", [editorId]),
      setSelection: (from, to, editorId) => callHostAPI("editor", "setSelection", [from, to, editorId]),
      canExecuteCommand: (command, editorId) => callHostAPI("editor", "canExecuteCommand", [command, editorId])
    }
  });
  const handleInit = async (payload) => {
    try {
      const { manifest, code, config } = payload;
      const api = createPluginAPIProxy();
      const wrappedCode = `(() => {
  "use strict";
  ${code}
  if (typeof activate === "function") {
    self.__pluginActivate = activate;
  } else if (typeof plugin !== "undefined") {
    self.__pluginObject = plugin;
  }
})();`;
      const blob = new Blob([wrappedCode], { type: "application/javascript" });
      const blobUrl = URL.createObjectURL(blob);
      try {
        self.importScripts(blobUrl);
        const globalScope = self;
        let plugin = {};
        if (typeof globalScope.__pluginActivate === "function") {
          plugin = await globalScope.__pluginActivate(api, config || {}) || {};
        } else if (globalScope.__pluginObject) {
          plugin = globalScope.__pluginObject;
        }
        delete globalScope.__pluginActivate;
        delete globalScope.__pluginObject;
        pluginInstance = {
          id: manifest.id,
          name: manifest.name,
          version: manifest.version,
          methods: {
            ...plugin.methods || {},
            ...Object.fromEntries(pendingWorkerMethods)
          },
          dispose: plugin.dispose
        };
        pendingWorkerMethods.clear();
        self.postMessage({
          type: MessageTypes.INIT,
          payload: { success: true, pluginId: manifest.id }
        });
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      sendError(error);
    }
  };
  const handleCallMethod = async (payload) => {
    try {
      if (!pluginInstance) {
        throw new Error("Plugin not initialized");
      }
      const { method, args } = payload;
      const fn = pluginInstance.methods[method];
      if (!fn || typeof fn !== "function") {
        throw new Error(`Method ${method} not found in plugin`);
      }
      const result = await fn(...args);
      self.postMessage({
        type: MessageTypes.CALL_METHOD,
        payload: { success: true, result }
      });
    } catch (error) {
      sendError(error);
    }
  };
  const handleDispose = async () => {
    try {
      if (pluginInstance?.dispose) {
        await pluginInstance.dispose();
      }
      pluginInstance = null;
      pendingRequests.clear();
      self.postMessage({
        type: MessageTypes.DISPOSE,
        payload: { success: true }
      });
    } catch (error) {
      sendError(error);
    }
  };
  const handleAPIResponse = (requestId2, payload) => {
    const pending = pendingRequests.get(requestId2);
    if (!pending) {
      return;
    }
    pendingRequests.delete(requestId2);
    if (payload === void 0 || payload === null) {
      pending.reject(new Error("API response payload is missing"));
      return;
    }
    if (typeof payload !== "object") {
      pending.reject(new Error("Invalid API response payload type"));
      return;
    }
    if (!("success" in payload)) {
      pending.reject(new Error("API response payload missing success property"));
      return;
    }
    const apiResponse = payload;
    if (!apiResponse || typeof apiResponse !== "object") {
      pending.reject(new Error("Invalid API response object"));
      return;
    }
    if (apiResponse.success) {
      pending.resolve(apiResponse.result);
    } else {
      const errorMessage = apiResponse.error && typeof apiResponse.error === "string" ? apiResponse.error : "API call failed";
      pending.reject(new Error(errorMessage));
    }
  };
  self.onmessage = async (event) => {
    const { type, requestId: requestId2, payload } = event.data;
    try {
      switch (type) {
        case MessageTypes.INIT:
          await handleInit(
            payload
          );
          break;
        case MessageTypes.CALL_METHOD:
          await handleCallMethod(payload);
          break;
        case MessageTypes.DISPOSE:
          await handleDispose();
          break;
        case MessageTypes.API_RESPONSE:
          if (requestId2) {
            handleAPIResponse(
              requestId2,
              payload
            );
          }
          break;
      }
    } catch (error) {
      sendError(error);
    }
  };
  self.onerror = ((event) => {
    const error = typeof event === "string" ? new Error(event) : event.error || event;
    sendError(error);
  });
  self.onunhandledrejection = (event) => {
    sendError(event.reason);
  };
})();
