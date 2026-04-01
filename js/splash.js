// ======================== SPLASH SCREEN MANAGER ========================

class SplashScreen {
    constructor(options = {}) {
        this.duration = options.duration || 3000; // 3 seconds default
        this.logoPath = options.logoPath || 'juztlogosplash.webp';
        this.onComplete = options.onComplete || null;
        this.splashElement = null;
        this.isVisible = true;
        this.startTime = null;
        this.timeoutId = null;
    }
    
    create() {
        // Check if splash already exists
        if (document.getElementById('splashScreen')) {
            return;
        }
        
        // Create splash container
        const splashDiv = document.createElement('div');
        splashDiv.id = 'splashScreen';
        splashDiv.className = 'splash-screen';
        
        // Create splash content - only logo, no spinner or text
        splashDiv.innerHTML = `
            <div class="splash-content">
                <img src="${this.logoPath}" alt="JUZT IPTV" class="splash-logo" onerror="this.onerror=null; this.src='https://via.placeholder.com/200x200?text=JUZT'">
            </div>
        `;
        
        // Add to body
        document.body.appendChild(splashDiv);
        this.splashElement = splashDiv;
        
        // Add class to body to prevent scrolling
        document.body.classList.add('splash-active');
        
        // Set start time
        this.startTime = Date.now();
        
        // Auto-hide after duration
        this.timeoutId = setTimeout(() => {
            this.hide();
        }, this.duration);
        
        // Also hide when page is fully loaded (whichever comes first)
        if (document.readyState === 'loading') {
            window.addEventListener('load', () => this.hide());
        } else {
            // If already loaded, hide after a small delay
            setTimeout(() => this.hide(), 500);
        }
        
        return this.splashElement;
    }
    
    hide() {
        // Prevent multiple hides
        if (!this.isVisible || !this.splashElement) return;
        
        // Clear the auto-hide timeout
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        
        // Calculate how long we've been showing
        const elapsed = Date.now() - this.startTime;
        const minDisplayTime = 1500; // Minimum 1.5 seconds to show splash
        
        // If we haven't shown long enough, delay the hide
        if (elapsed < minDisplayTime) {
            const remainingTime = minDisplayTime - elapsed;
            setTimeout(() => this.hide(), remainingTime);
            return;
        }
        
        // Fade out splash
        this.splashElement.classList.add('fade-out');
        
        // Remove splash after animation
        setTimeout(() => {
            if (this.splashElement && this.splashElement.parentNode) {
                this.splashElement.remove();
                this.splashElement = null;
            }
            document.body.classList.remove('splash-active');
            this.isVisible = false;
            
            // Call completion callback
            if (this.onComplete && typeof this.onComplete === 'function') {
                this.onComplete();
            }
            
            // Dispatch event
            window.dispatchEvent(new CustomEvent('splashHidden'));
        }, 500);
    }
    
    show() {
        if (!this.splashElement) {
            this.create();
        } else {
            this.splashElement.classList.remove('fade-out');
            this.splashElement.style.opacity = '1';
            this.isVisible = true;
            document.body.classList.add('splash-active');
            
            // Reset timer
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
            this.timeoutId = setTimeout(() => {
                this.hide();
            }, this.duration);
        }
    }
    
    destroy() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        
        if (this.splashElement && this.splashElement.parentNode) {
            this.splashElement.remove();
            this.splashElement = null;
        }
        
        document.body.classList.remove('splash-active');
        this.isVisible = false;
    }
}

// Auto-initialize splash screen when DOM is ready
let splashInstance = null;

function initSplashScreen(options = {}) {
    if (splashInstance) {
        splashInstance.destroy();
    }
    
    const defaultOptions = {
        duration: 3000, // 3 seconds default
        logoPath: 'juztlogosplash.webp',
        onComplete: () => {
            console.log('Splash screen completed');
        }
    };
    
    const config = { ...defaultOptions, ...options };
    splashInstance = new SplashScreen(config);
    splashInstance.create();
    
    return splashInstance;
}

// Export for use in other modules
window.SplashScreen = SplashScreen;
window.initSplashScreen = initSplashScreen;

// Auto-initialize if the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Check if auto-init is enabled (can be disabled by setting data attribute)
        const autoInit = document.body.getAttribute('data-splash-auto') !== 'false';
        if (autoInit) {
            initSplashScreen();
        }
    });
} else {
    const autoInit = document.body.getAttribute('data-splash-auto') !== 'false';
    if (autoInit) {
        initSplashScreen();
    }
}


