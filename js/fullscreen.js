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
        this.lastOrientation = null;
        this.isEnteringFullscreen = false;
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
        
        // Check initial orientation
        setTimeout(() => this.checkAndApplyFullscreen(), 500);
        
        console.log("Fullscreen Manager initialized - Auto fullscreen on landscape");
    }
    
    handleOrientationChange() {
        console.log("Orientation change detected");
        
        // Clear any pending resize timer
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }
        
        // Wait for orientation change to complete
        this.resizeTimer = setTimeout(() => {
            this.checkAndApplyFullscreen();
            this.resizeTimer = null;
        }, 150);
    }
    
    checkAndApplyFullscreen() {
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        // For desktop, do nothing
        if (!isMobile) {
            console.log("Desktop device - no auto-fullscreen");
            return;
        }
        
        const isLandscape = window.innerWidth > window.innerHeight;
        const currentOrientation = isLandscape ? 'landscape' : 'portrait';
        
        // Log orientation change
        if (this.lastOrientation !== currentOrientation) {
            console.log(`Orientation changed: ${this.lastOrientation} -> ${currentOrientation}`);
            this.lastOrientation = currentOrientation;
        }
        
        if (isLandscape) {
            // LANDSCAPE MODE: Enter video fullscreen
            const isVideoFullscreenNow = document.fullscreenElement === this.videoContainer;
            
            if (!isVideoFullscreenNow && !this.isEnteringFullscreen) {
                console.log("LANDSCAPE: Entering video fullscreen...");
                this.enterVideoFullscreen();
            } else {
                console.log("LANDSCAPE: Already in video fullscreen");
            }
        } else {
            // PORTRAIT MODE: Exit video fullscreen
            if (document.fullscreenElement === this.videoContainer || this.isVideoFullscreen) {
                console.log("PORTRAIT: Exiting video fullscreen...");
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
        if (document.fullscreenElement === this.videoContainer) {
            console.log("Already in video fullscreen");
            this.isVideoFullscreen = true;
            return;
        }
        
        // Prevent multiple simultaneous entries
        if (this.isEnteringFullscreen) {
            console.log("Already entering fullscreen, skipping...");
            return;
        }
        
        this.isEnteringFullscreen = true;
        
        console.log("Entering video fullscreen...");
        
        // Hide sidebar and header
        if (this.sidebar) this.sidebar.style.display = 'none';
        if (this.header) this.header.style.display = 'none';
        
        // Add class for styling
        document.body.classList.add('video-fullscreen-mode');
        
        // Request fullscreen on video container
        const element = this.videoContainer;
        
        const requestFullscreen = () => {
            const fullscreenPromise = element.requestFullscreen ? element.requestFullscreen() :
                                      element.webkitRequestFullscreen ? element.webkitRequestFullscreen() :
                                      element.mozRequestFullScreen ? element.mozRequestFullScreen() :
                                      element.msRequestFullscreen ? element.msRequestFullscreen() : null;
            
            if (fullscreenPromise) {
                fullscreenPromise.then(() => {
                    console.log("Video fullscreen entered successfully");
                    this.isVideoFullscreen = true;
                    this.isEnteringFullscreen = false;
                }).catch(err => {
                    console.error("Video fullscreen failed:", err);
                    // Restore UI if fullscreen fails
                    if (this.sidebar) this.sidebar.style.display = '';
                    if (this.header) this.header.style.display = '';
                    document.body.classList.remove('video-fullscreen-mode');
                    this.isVideoFullscreen = false;
                    this.isEnteringFullscreen = false;
                });
            } else {
                // Fallback for browsers without Promise support
                this.isVideoFullscreen = true;
                this.isEnteringFullscreen = false;
            }
        };
        
        // Small delay to ensure DOM is ready
        setTimeout(requestFullscreen, 50);
    }
    
    exitVideoFullscreen() {
        console.log("Exiting video fullscreen...");
        
        // Reset entering flag
        this.isEnteringFullscreen = false;
        
        // Exit fullscreen if video container is fullscreen
        if (document.fullscreenElement === this.videoContainer || 
            document.webkitFullscreenElement === this.videoContainer ||
            document.mozFullScreenElement === this.videoContainer) {
            
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
        }
        
        // Restore sidebar and header
        if (this.sidebar) this.sidebar.style.display = '';
        if (this.header) this.header.style.display = '';
        document.body.classList.remove('video-fullscreen-mode');
        
        this.isVideoFullscreen = false;
    }
    
    handleFullscreenChange() {
        const fsElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
        const isFullscreen = !!fsElement;
        
        console.log("Fullscreen change event, isFullscreen:", isFullscreen);
        
        if (!isFullscreen) {
            // We exited fullscreen
            console.log("Exited fullscreen");
            this.isVideoFullscreen = false;
            this.isEnteringFullscreen = false;
            
            // Restore UI
            if (this.sidebar) this.sidebar.style.display = '';
            if (this.header) this.header.style.display = '';
            document.body.classList.remove('video-fullscreen-mode');
            
            // Check if we're in landscape after exit (should re-enter)
            setTimeout(() => {
                const isLandscape = window.innerWidth > window.innerHeight;
                if (isLandscape) {
                    console.log("Still in landscape after exit, re-entering fullscreen");
                    this.checkAndApplyFullscreen();
                }
            }, 100);
        } else {
            // We entered fullscreen on some element
            if (fsElement === this.videoContainer) {
                this.isVideoFullscreen = true;
                console.log("Video is fullscreen");
                
                // Ensure UI is hidden when video is fullscreen
                if (this.sidebar) this.sidebar.style.display = 'none';
                if (this.header) this.header.style.display = 'none';
            }
        }
    }
    
    destroy() {
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
