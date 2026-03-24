// ======================== ANTI-DEBUGGING PROTECTION ========================

(function() {
    // YouTube redirect URL
    const REDIRECT_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    
    function redirect() {
        window.location.href = REDIRECT_URL;
    }
    
    // Detect DevTools by window size difference
    function detectDevToolsBySize() {
        const widthThreshold = window.outerWidth - window.innerWidth > 160;
        const heightThreshold = window.outerHeight - window.innerHeight > 160;
        if (widthThreshold || heightThreshold) {
            redirect();
        }
    }
    
    // Detect by console.log behavior
    let devtools = false;
    const element = new Image();
    Object.defineProperty(element, 'id', {
        get: function() {
            devtools = true;
            redirect();
        }
    });
    
    function detectDevToolsByConsole() {
        console.log(element);
        console.clear();
        if (devtools) redirect();
    }
    
    // Detect by debugger timing
    function detectDevToolsByDebugger() {
        const startTime = performance.now();
        debugger;
        const endTime = performance.now();
        if (endTime - startTime > 100) {
            redirect();
        }
    }
    
    // Detect by element inspection
    function detectDevToolsByInspection() {
        const before = new Date();
        (function() {
            const check = () => {
                const after = new Date();
                if (after - before > 100) {
                    redirect();
                }
            };
            check();
        })();
    }
    
    // Detect if console is open
    function detectConsoleOpen() {
        let element = document.createElement('div');
        element.setAttribute('onclick', 'return;');
        if (element.toString().indexOf('return;') !== -1) {
            redirect();
        }
    }
    
    // Disable right-click (view source attempt)
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        redirect();
        return false;
    });
    
    // Disable keyboard shortcuts for DevTools
    document.addEventListener('keydown', function(e) {
        const shortcuts = ['F12', 'I', 'J', 'U', 'C'];
        const isDevToolShortcut = (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && shortcuts.includes(e.key)) ||
            (e.ctrlKey && e.key === 'u')
        );
        
        if (isDevToolShortcut) {
            e.preventDefault();
            redirect();
            return false;
        }
    });
    
    // Periodic checks
    setInterval(() => {
        detectDevToolsBySize();
        detectDevToolsByDebugger();
        detectConsoleOpen();
    }, 1000);
    
    // Initial checks
    setTimeout(() => {
        detectDevToolsBySize();
        detectDevToolsByConsole();
        detectDevToolsByDebugger();
        detectDevToolsByInspection();
        detectConsoleOpen();
    }, 100);
    
    // Disable copy-paste
    document.addEventListener('copy', (e) => { e.preventDefault(); redirect(); });
    document.addEventListener('cut', (e) => { e.preventDefault(); redirect(); });
    document.addEventListener('selectstart', (e) => { e.preventDefault(); });
    
    // Override console methods to break debugging
    const noop = () => {};
    if (typeof window.console !== 'undefined') {
        console.log = noop;
        console.warn = noop;
        console.error = noop;
        console.debug = noop;
        console.info = noop;
        console.table = noop;
        console.group = noop;
        console.groupEnd = noop;
    }
})();
