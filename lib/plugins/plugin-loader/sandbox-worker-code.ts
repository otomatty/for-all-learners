/**
 * Sandbox Worker Code Generator
 *
 * Generates the sandbox worker code as a string for inline worker creation.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ lib/plugins/plugin-loader/worker-manager.ts
 *
 * Dependencies:
 *   └─ None (pure string generation)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase1-core-system.md
 */

/**
 * Get sandbox worker code as string
 *
 * This method returns the sandbox worker code as a string.
 * In production, this should be loaded from a separate file or bundle.
 *
 * @returns Worker code as string
 */
export function getSandboxWorkerCode(): string {
	// For now, we'll inline the essential parts of sandbox-worker.ts
	// In production, this should be loaded from a bundled worker file
	// or use importScripts with a public URL
	return `
(function() {
  'use strict';
  
  // Worker state
  let pluginInstance = null;
  let requestId = 0;
  const pendingRequests = new Map();
  
  // Message types
  const MessageTypes = {
    INIT: 'INIT',
    CALL_METHOD: 'CALL_METHOD',
    DISPOSE: 'DISPOSE',
    API_CALL: 'API_CALL',
    API_RESPONSE: 'API_RESPONSE',
    EVENT: 'EVENT',
    ERROR: 'ERROR'
  };
  
  // Call host API via postMessage
  function callHostAPI(namespace, method, args) {
    return new Promise((resolve, reject) => {
      const reqId = 'req_' + (++requestId);
      pendingRequests.set(reqId, { resolve, reject });
      
      self.postMessage({
        type: MessageTypes.API_CALL,
        requestId: reqId,
        payload: {
          namespace: namespace,
          method: method,
          args: args
        }
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingRequests.has(reqId)) {
          pendingRequests.delete(reqId);
          reject(new Error('API call timeout: ' + namespace + '.' + method));
        }
      }, 30000);
    });
  }
  
  // Create Plugin API proxy
  function createPluginAPIProxy() {
    return {
      app: {
        getVersion: function() { return callHostAPI('app', 'getVersion', []); },
        getName: function() { return callHostAPI('app', 'getName', []); },
        getUserId: function() { return callHostAPI('app', 'getUserId', []); }
      },
      storage: {
        get: function(key) { return callHostAPI('storage', 'get', [key]); },
        set: function(key, value) { return callHostAPI('storage', 'set', [key, value]); },
        delete: function(key) { return callHostAPI('storage', 'delete', [key]); },
        keys: function() { return callHostAPI('storage', 'keys', []); },
        clear: function() { return callHostAPI('storage', 'clear', []); }
      },
      notifications: {
        show: function(message, type) { callHostAPI('notifications', 'show', [message, type]); },
        info: function(message) { callHostAPI('notifications', 'info', [message]); },
        success: function(message) { callHostAPI('notifications', 'success', [message]); },
        error: function(message) { callHostAPI('notifications', 'error', [message]); },
        warning: function(message) { callHostAPI('notifications', 'warning', [message]); }
      },
      ui: {
        registerCommand: function(command) { return callHostAPI('ui', 'registerCommand', [command]); },
        unregisterCommand: function(commandId) { return callHostAPI('ui', 'unregisterCommand', [commandId]); },
        showDialog: function(options) { return callHostAPI('ui', 'showDialog', [options]); }
      }
    };
  }
  
  // Handle INIT message
  // Security: Uses Blob URL + importScripts instead of eval/new Function
  async function handleInit(payload) {
    try {
      const { manifest, code, config } = payload;
      const api = createPluginAPIProxy();
      
      // Create Blob URL for plugin code (avoiding eval)
      // Wrap plugin code in IIFE to isolate scope and expose activate function
      const wrappedCode = '(() => {\\n' +
        '  "use strict";\\n' +
        '\\n' +
        '  // Plugin code executed in isolated scope\\n' +
        code + '\\n' +
        '\\n' +
        '  // Expose activate function or plugin object to global scope for this worker\\n' +
        '  if (typeof activate === "function") {\\n' +
        '    self.__pluginActivate = activate;\\n' +
        '  } else if (typeof plugin !== "undefined") {\\n' +
        '    self.__pluginObject = plugin;\\n' +
        '  }\\n' +
        '})();\\n';

      // Create Blob URL
      const blob = new Blob([wrappedCode], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);

      try {
        // Load plugin code using importScripts (safer than eval)
        // @ts-expect-error - importScripts is available in WorkerGlobalScope
        self.importScripts(blobUrl);

        // Get plugin from global scope
        let plugin = {};
        
        if (typeof self.__pluginActivate === 'function') {
          // Call activate function with API and config
          plugin = await self.__pluginActivate(api, config || {}) || {};
        } else if (self.__pluginObject) {
          plugin = self.__pluginObject || {};
        }

        // Clean up global scope
        delete self.__pluginActivate;
        delete self.__pluginObject;
      
        pluginInstance = {
          id: manifest.id,
          name: manifest.name,
          version: manifest.version,
          methods: plugin.methods || {},
          dispose: plugin.dispose
        };
        
        self.postMessage({
          type: MessageTypes.INIT,
          payload: { success: true, pluginId: manifest.id }
        });
      } finally {
        // Cleanup blob URL
        URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      self.postMessage({
        type: MessageTypes.ERROR,
        payload: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }
  
  // Handle CALL_METHOD message
  async function handleCallMethod(payload) {
    try {
      if (!pluginInstance) {
        throw new Error('Plugin not initialized');
      }
      
      const { method, args } = payload;
      const fn = pluginInstance.methods[method];
      
      if (!fn || typeof fn !== 'function') {
        throw new Error('Method ' + method + ' not found in plugin');
      }
      
      const result = await fn(...args);
      
      self.postMessage({
        type: MessageTypes.CALL_METHOD,
        payload: { success: true, result: result }
      });
    } catch (error) {
      self.postMessage({
        type: MessageTypes.ERROR,
        payload: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }
  
  // Handle DISPOSE message
  async function handleDispose() {
    try {
      if (pluginInstance && pluginInstance.dispose) {
        await pluginInstance.dispose();
      }
      
      pluginInstance = null;
      pendingRequests.clear();
      
      self.postMessage({
        type: MessageTypes.DISPOSE,
        payload: { success: true }
      });
    } catch (error) {
      self.postMessage({
        type: MessageTypes.ERROR,
        payload: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }
  
  // Handle API_RESPONSE message
  function handleAPIResponse(requestId, payload) {
    const pending = pendingRequests.get(requestId);
    if (!pending) {
      console.warn('[SandboxWorker] No pending request for ' + requestId);
      return;
    }
    
    pendingRequests.delete(requestId);
    
    if (payload.success) {
      pending.resolve(payload.result);
    } else {
      pending.reject(new Error(payload.error || 'API call failed'));
    }
  }
  
  // Main message handler
  self.onmessage = async function(event) {
    const { type, requestId, payload } = event.data;
    
    try {
      switch (type) {
        case MessageTypes.INIT:
          await handleInit(payload);
          break;
        case MessageTypes.CALL_METHOD:
          await handleCallMethod(payload);
          break;
        case MessageTypes.DISPOSE:
          await handleDispose();
          break;
        case MessageTypes.API_RESPONSE:
          if (requestId) {
            handleAPIResponse(requestId, payload);
          }
          break;
        default:
          console.warn('[SandboxWorker] Unknown message type: ' + type);
      }
    } catch (error) {
      self.postMessage({
        type: MessageTypes.ERROR,
        payload: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  };
  
  // Error handlers
  self.onerror = function(error) {
    console.error('[SandboxWorker] Uncaught error:', error);
    self.postMessage({
      type: MessageTypes.ERROR,
      payload: {
        message: error.message || String(error),
        stack: error.stack
      }
    });
  };
  
  self.onunhandledrejection = function(event) {
    console.error('[SandboxWorker] Unhandled rejection:', event.reason);
    self.postMessage({
      type: MessageTypes.ERROR,
      payload: {
        message: event.reason instanceof Error ? event.reason.message : String(event.reason),
        stack: event.reason instanceof Error ? event.reason.stack : undefined
      }
    });
  };
})();
`;
}
