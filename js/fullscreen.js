// ======================== FULLSCREEN MANAGER ========================

class FullscreenManager {
    constructor() {
        this.videoContainer = null;
        this.videoPlayer = null;
        this.sidebar = null;
        this.header = null;
        this.isVideoFullscreen = false;
        this.orientationHandler = this.handleOrientationChange.bind(this);
        this.resizeTimer = null;
        this.isEnteringFullscreen = false;
        this.forceCheckInterval = null;
        this.lastOrientation = null;
        this.fullscreenAttempts = 0;
        this.manualFullscreen = false; // Track if fullscreen was triggered manually
    }
    
    init(videoContainer, videoPlayer, sidebar, header) {
        this.videoContainer = videoContainer;
        this.videoPlayer = videoPlayer;
        this.sidebar = sidebar;
        this.header = header;
        
        // Store initial orientation
        this.lastOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
        
        // Listen for orientation changes
        window.addEventListener('orientationchange', this.orientationHandler);
        window.addEventListener('resize', this.orientationHandler);
        
        // Listen for fullscreen change events
        document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
        document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange.bind(this));
        document.addEventListener('mozfullscreenchange', this.handleFullscreenChange.bind(this));
        
        // Force check orientation every 500ms to ensure fullscreen stays active in landscape
        this.forceCheckInterval = setInterval(() => {
            this.forceCheckOrientation();
        }, 500);
        
        // Check initial orientation after a short delay
        setTimeout(() => this.forceCheckOrientation(), 500);
        
        console.log("Fullscreen Manager initialized - Force video fullscreen on landscape");
    }
    
    handleOrientationChange() {
        console.log("Orientation change detected");
        
        // Clear any pending resize timer
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }
        
        // Immediately check orientation
        this.forceCheckOrientation();
        
        // Also check again after short delays to ensure it takes effect
        setTimeout(() => this.forceCheckOrientation(), 100);
        setTimeout(() => this.forceCheckOrientation(), 300);
        setTimeout(() => this.forceCheckOrientation(), 500);
    }
    
    forceCheckOrientation() {
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        // For desktop, do nothing
        if (!isMobile) {
            return;
        }
        
        const isLandscape = window.innerWidth > window.innerHeight;
        const currentOrientation = isLandscape ? 'landscape' : 'portrait';
        
        // Log orientation change
        if (this.lastOrientation !== currentOrientation) {
            console.log(`Orientation: ${this.lastOrientation} -> ${currentOrientation}`);
            this.lastOrientation = currentOrientation;
            // Reset attempts on orientation change
            this.fullscreenAttempts = 0;
        }
        
        if (isLandscape) {
            // LANDSCAPE: Force video container fullscreen (only if not manually controlled)
            const isVideoFullscreenNow = document.fullscreenElement === this.videoContainer ||
                                         document.webkitFullscreenElement === this.videoContainer ||
                                         document.mozFullScreenElement === this.videoContainer;
            
            if (!isVideoFullscreenNow && !this.isEnteringFullscreen && !this.manualFullscreen) {
                console.log("LANDSCAPE: Forcing video container fullscreen...");
                this.enterVideoFullscreen();
            } else if (isVideoFullscreenNow) {
                console.log("LANDSCAPE: Video container already in fullscreen");
                this.fullscreenAttempts = 0;
            }
        } else {
            // PORTRAIT: Exit video container fullscreen (only if not manually controlled)
            if ((document.fullscreenElement === this.videoContainer || 
                document.webkitFullscreenElement === this.videoContainer ||
                document.mozFullScreenElement === this.videoContainer || 
                this.isVideoFullscreen) && !this.manualFullscreen) {
                console.log("PORTRAIT: Exiting video container fullscreen...");
                this.exitVideoFullscreen();
            }
        }
    }
    
    enterVideoFullscreen() {
        if (!this.videoContainer) {
            console.error("Video container not found");
            return;
        }
        
        // Don't enter if already in video fullscreen
        if (document.fullscreenElement === this.videoContainer ||
            document.webkitFullscreenElement === this.videoContainer ||
            document.mozFullScreenElement === this.videoContainer) {
            console.log("Video container already in fullscreen");
            this.isVideoFullscreen = true;
            this.isEnteringFullscreen = false;
            this.fullscreenAttempts = 0;
            return;
        }
        
        // Prevent multiple simultaneous entries
        if (this.isEnteringFullscreen) {
            console.log("Already entering fullscreen, skipping...");
            return;
        }
        
        // Limit attempts to prevent infinite loops
        if (this.fullscreenAttempts > 5) {
            console.log("Too many fullscreen attempts, giving up temporarily");
            setTimeout(() => {
                this.fullscreenAttempts = 0;
            }, 2000);
            return;
        }
        
        this.isEnteringFullscreen = true;
        this.fullscreenAttempts++;
        
        console.log(`Entering video container fullscreen (attempt ${this.fullscreenAttempts})...`);
        
        // Hide sidebar and header immediately
        if (this.sidebar) this.sidebar.style.display = 'none';
        if (this.header) this.header.style.display = 'none';
        
        // Add class for styling
        document.body.classList.add('video-fullscreen-mode');
        
        // Request fullscreen on video container
        const element = this.videoContainer;
        
        const requestFullscreen = () => {
            // Try different fullscreen methods
            const requestMethod = element.requestFullscreen || 
                                 element.webkitRequestFullscreen || 
                                 element.mozRequestFullScreen || 
                                 element.msRequestFullscreen;
            
            if (requestMethod) {
                // Try to lock orientation to landscape
                if (screen.orientation && screen.orientation.lock) {
                    screen.orientation.lock('landscape').catch(err => {
                        console.log("Screen orientation lock not supported:", err);
                    });
                }
                
                const promise = requestMethod.call(element);
                
                if (promise && promise.then) {
                    promise.then(() => {
                        console.log("Video container fullscreen entered successfully");
                        this.isVideoFullscreen = true;
                        this.isEnteringFullscreen = false;
                        this.fullscreenAttempts = 0;
                    }).catch(err => {
                        console.error("Video container fullscreen failed:", err);
                        // Restore UI if fullscreen fails
                        if (this.sidebar) this.sidebar.style.display = '';
                        if (this.header) this.header.style.display = '';
                        document.body.classList.remove('video-fullscreen-mode');
                        this.isVideoFullscreen = false;
                        this.isEnteringFullscreen = false;
                        
                        // Try again if still in landscape
                        setTimeout(() => {
                            if (window.innerWidth > window.innerHeight) {
                                this.forceCheckOrientation();
                            }
                        }, 500);
                    });
                } else {
                    // Fallback for browsers without Promise support
                    this.isVideoFullscreen = true;
                    this.isEnteringFullscreen = false;
                }
            } else {
                console.error("No fullscreen API available");
                this.isEnteringFullscreen = false;
            }
        };
        
        // Request fullscreen immediately
        requestFullscreen();
        
        // Also try again after short delays if it didn't work
        if (!this.isVideoFullscreen) {
            setTimeout(() => {
                if (!this.isVideoFullscreen && !this.isEnteringFullscreen && window.innerWidth > window.innerHeight) {
                    console.log("Retrying fullscreen request...");
                    this.isEnteringFullscreen = true;
                    requestFullscreen();
                }
            }, 200);
            
            setTimeout(() => {
                if (!this.isVideoFullscreen && !this.isEnteringFullscreen && window.innerWidth > window.innerHeight) {
                    console.log("Second retry fullscreen request...");
                    this.isEnteringFullscreen = true;
                    requestFullscreen();
                }
            }, 500);
        }
    }
    
    exitVideoFullscreen() {
        console.log("Exiting video container fullscreen...");
        
        // Reset flags
        this.isEnteringFullscreen = false;
        this.fullscreenAttempts = 0;
        
        // Exit fullscreen using all possible methods
        const exitFullscreen = () => {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        };
        
        exitFullscreen();
        
        // Unlock screen orientation
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        } else if (screen.unlockOrientation) {
            screen.unlockOrientation();
        }
        
        // Restore sidebar and header
        if (this.sidebar) this.sidebar.style.display = '';
        if (this.header) this.header.style.display = '';
        document.body.classList.remove('video-fullscreen-mode');
        
        this.isVideoFullscreen = false;
    }
    
    handleFullscreenChange() {
        const fsElement = document.fullscreenElement || 
                         document.webkitFullscreenElement || 
                         document.mozFullScreenElement;
        const isFullscreen = !!fsElement;
        
        console.log("Fullscreen change event, isFullscreen:", isFullscreen, "element:", fsElement);
        
        if (!isFullscreen) {
            // We exited fullscreen
            console.log("Exited fullscreen");
            this.isVideoFullscreen = false;
            this.isEnteringFullscreen = false;
            this.manualFullscreen = false; // Reset manual flag
            
            // Restore UI
            if (this.sidebar) this.sidebar.style.display = '';
            if (this.header) this.header.style.display = '';
            document.body.classList.remove('video-fullscreen-mode');
            
            // Check if we're still in landscape after exit (should re-enter)
            setTimeout(() => {
                const isLandscape = window.innerWidth > window.innerHeight;
                if (isLandscape) {
                    console.log("Still in landscape after exit, re-entering fullscreen");
                    this.forceCheckOrientation();
                }
            }, 200);
        } else {
            // We entered fullscreen on some element
            if (fsElement === this.videoContainer) {
                this.isVideoFullscreen = true;
                console.log("Video container is fullscreen");
                
                // Ensure UI is hidden when video container is fullscreen
                if (this.sidebar) this.sidebar.style.display = 'none';
                if (this.header) this.header.style.display = 'none';
            }
        }
    }
    
    // Method to be called from player button to set manual fullscreen
    setManualFullscreen(value) {
        this.manualFullscreen = value;
        if (value) {
            // If manual fullscreen is enabled, temporarily disable auto checks
            console.log("Manual fullscreen mode activated");
        } else {
            console.log("Manual fullscreen mode deactivated");
        }
    }
    
    destroy() {
        // Clear the force check interval
        if (this.forceCheckInterval) {
            clearInterval(this.forceCheckInterval);
            this.forceCheckInterval = null;
        }
        
        window.removeEventListener('orientationchange', this.orientationHandler);
        window.removeEventListener('resize', this.orientationHandler);
        
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }
        
        // Exit any active fullscreen
        if (this.isVideoFullscreen) {
            this.exitVideoFullscreen();
        }
        
        // Restore UI
        if (this.sidebar) this.sidebar.style.display = '';
        if (this.header) this.header.style.display = '';
        document.body.classList.remove('video-fullscreen-mode');
    }
}

window.FullscreenManager = FullscreenManager;
