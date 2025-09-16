// Anti-tamper protection - must be loaded before main application
// This script provides immediate console protection and prevents tampering

(function() {
  'use strict';

  // Only apply protection in production
  if (window.location.search.includes('dev=true') || 
      (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development')) {
    return;
  }

  // Detect if running in production Electron app
  const isElectron = typeof window !== 'undefined' && window.process && window.process.type;
  if (!isElectron) {
    return; // Only protect Electron builds
  }

  const protectionActive = true;
  
  // Immediately disable console
  const noop = function() {};
  const consoleMethods = [
    'log', 'debug', 'info', 'warn', 'error', 'assert', 'clear',
    'count', 'countReset', 'dir', 'dirxml', 'group', 'groupCollapsed',
    'groupEnd', 'table', 'time', 'timeEnd', 'timeLog', 'trace', 'profile', 'profileEnd'
  ];

  // Store original console methods
  const originalConsole = {};
  consoleMethods.forEach(method => {
    if (window.console && window.console[method]) {
      originalConsole[method] = window.console[method];
      window.console[method] = noop;
    }
  });

  // Block console property access entirely
  try {
    Object.defineProperty(window, 'console', {
      get: function() {
        return originalConsole; // Return neutered console
      },
      set: noop,
      configurable: false
    });
  } catch (e) {
    // Fallback if property definition fails
    window.console = {};
  }

  // Disable common debugging shortcuts immediately
  document.addEventListener('keydown', function(e) {
    if (!protectionActive) return;

    // F12
    if (e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+U (view source)
    if (e.ctrlKey && e.keyCode === 85) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Mac shortcuts: Cmd+Alt+I, Cmd+Alt+J, Cmd+Alt+C
    if (e.metaKey && e.altKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);

  // Block right-click immediately
  document.addEventListener('contextmenu', function(e) {
    if (!protectionActive) return;
    e.preventDefault();
    return false;
  }, true);

  // Block text selection
  document.addEventListener('selectstart', function(e) {
    if (!protectionActive) return;
    e.preventDefault();
    return false;
  }, true);

  // Disable drag operations
  document.addEventListener('dragstart', function(e) {
    if (!protectionActive) return;
    e.preventDefault();
    return false;
  }, true);

  // Block print operations
  document.addEventListener('keydown', function(e) {
    if (!protectionActive) return;
    if (e.ctrlKey && e.keyCode === 80) { // Ctrl+P
      e.preventDefault();
      return false;
    }
    if (e.metaKey && e.keyCode === 80) { // Cmd+P
      e.preventDefault();
      return false;
    }
  }, true);

  // Override window.print
  window.print = noop;

  // Block common developer tools detection evasion
  let devtoolsOpen = false;
  const detectDevTools = function() {
    const threshold = 160; // If window is resized beyond this threshold, devtools might be open
    setInterval(function() {
      if (window.outerHeight - window.innerHeight > threshold ||
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtoolsOpen) {
          devtoolsOpen = true;
          // Clear the page content
          document.body.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif; color: #666;">Access denied</div>';
        }
      }
    }, 500);
  };

  // Start devtools detection after page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', detectDevTools);
  } else {
    detectDevTools();
  }

  // Block debugger statements with timing check
  setInterval(function() {
    const start = Date.now();
    debugger;
    const duration = Date.now() - start;
    if (duration > 100) {
      // Likely in debugger, clear page
      document.body.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif; color: #666;">Debug tools detected</div>';
    }
  }, 2000);

  // Prevent function inspection
  const originalToString = Function.prototype.toString;
  Function.prototype.toString = function() {
    if (this.toString === Function.prototype.toString) {
      return 'function () { [native code] }';
    }
    return originalToString.call(this);
  };

  // Block React DevTools
  if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object') {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = undefined;
  }

  // Freeze the protection
  Object.freeze(window.console);
  
})();