// Console protection for production builds
// This script disables dev console access and related debugging features

interface ConsoleProtection {
  init(): void;
}

class ProductionConsoleProtection implements ConsoleProtection {
  private originalConsole: Console;
  private isBlocked = false;

  constructor() {
    this.originalConsole = { ...console };
  }

  init(): void {
    if (process.env.NODE_ENV === 'development') {
      return; // Don't block in development
    }

    this.blockConsole();
    this.blockKeyboardShortcuts();
    this.blockContextMenu();
    this.preventDebugger();
    this.blockSourceInspection();
  }

  private blockConsole(): void {
    // Override console methods
    const blockedMethods = [
      'log', 'debug', 'info', 'warn', 'error', 'assert', 'clear', 
      'count', 'countReset', 'dir', 'dirxml', 'group', 'groupCollapsed', 
      'groupEnd', 'table', 'time', 'timeEnd', 'timeLog', 'trace'
    ];

    blockedMethods.forEach(method => {
      (console as any)[method] = () => {
        // Silent block - no output
      };
    });

    // Block console property access
    Object.defineProperty(window, 'console', {
      get: () => {
        this.isBlocked = true;
        return {};
      },
      set: () => {
        this.isBlocked = true;
      },
      configurable: false
    });
  }

  private blockKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // Block F12
      if (e.keyCode === 123) {
        e.preventDefault();
        return false;
      }

      // Block Ctrl+Shift+I (Windows/Linux)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        e.preventDefault();
        return false;
      }

      // Block Ctrl+Shift+J (Windows/Linux)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
        e.preventDefault();
        return false;
      }

      // Block Ctrl+Shift+C (Windows/Linux)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
        e.preventDefault();
        return false;
      }

      // Block Ctrl+U (View Source)
      if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault();
        return false;
      }

      // Block Ctrl+S (Save As)
      if (e.ctrlKey && e.keyCode === 83) {
        e.preventDefault();
        return false;
      }

      // Block Cmd+Option+I (Mac)
      if (e.metaKey && e.altKey && e.keyCode === 73) {
        e.preventDefault();
        return false;
      }

      // Block Cmd+Option+J (Mac)
      if (e.metaKey && e.altKey && e.keyCode === 74) {
        e.preventDefault();
        return false;
      }

      // Block Cmd+Option+C (Mac)
      if (e.metaKey && e.altKey && e.keyCode === 67) {
        e.preventDefault();
        return false;
      }
    }, true);
  }

  private blockContextMenu(): void {
    // Block right-click context menu
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    }, true);

    // Block text selection
    document.addEventListener('selectstart', (e) => {
      e.preventDefault();
      return false;
    }, true);

    // Block drag operations
    document.addEventListener('dragstart', (e) => {
      e.preventDefault();
      return false;
    }, true);
  }

  private preventDebugger(): void {
    // Block debugger statements
    setInterval(() => {
      const start = Date.now();
      debugger;
      if (Date.now() - start > 100) {
        // Debugger was likely open, take action
        this.handleDebuggerDetected();
      }
    }, 1000);

    // Block toString() debugging
    const originalToString = Function.prototype.toString;
    Function.prototype.toString = function() {
      if (this === ProductionConsoleProtection.prototype.blockConsole) {
        throw new Error('Access denied');
      }
      return originalToString.call(this);
    };
  }

  private blockSourceInspection(): void {
    // Block common inspection methods
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = undefined;
    (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__ = undefined;
    
    // Override Error constructor to hide stack traces
    const OriginalError = window.Error;
    window.Error = function(...args: any[]) {
      const error = new OriginalError(...args);
      error.stack = undefined;
      return error;
    } as any;

    // Block performance timing
    if ('performance' in window) {
      Object.defineProperty(window, 'performance', {
        get: () => undefined,
        configurable: false
      });
    }
  }

  private handleDebuggerDetected(): void {
    // Optionally clear the page or redirect
    document.body.innerHTML = '';
    throw new Error('Debug tools detected');
  }
}

// Auto-initialize when script loads
const consoleProtection = new ProductionConsoleProtection();
consoleProtection.init();

export default consoleProtection;