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
    }
    
    init(videoContainer, videoPlayer, sidebar, header) {
        this.videoContainer = videoContainer;
        this.videoPlayer = videoPlayer;
        this.sidebar = sidebar;
        this.header = header;
        
        // Listen for orientation changes (but don't auto-fullscreen)
        window.addEventListener('orientationchange', this.orientationHandler);
        window.addEventListener('resize', this.orientationHandler);
        
        // Listen for fullscreen change events
        document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
        document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange.bind(this));
        document.addEventListener('mozfullscreenchange', this.handleFullscreenChange.bind(this));
        
        console.log("Fullscreen Manager initialized - Manual fullscreen only (no auto on landscape)");
    }
    
    handleOrientationChange() {
        console.log("Orientation change detected - no auto-fullscreen");
        // Do nothing - no auto-fullscreen on landscape
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
                    
                    // Try to lock orientation to landscape after entering fullscreen
                    setTimeout(() => {
                        if (screen.orientation && screen.orientation.lock) {
                            screen.orientation.lock('landscape').catch(err => {
                                console.log("Orientation lock failed:", err);
                            });
                        } else if (screen.lockOrientation) {
                            screen.lockOrientation('landscape').catch(err => {
                                console.log("Orientation lock failed:", err);
                            });
                        }
                    }, 100);
                    
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
        
        // Unlock orientation
        setTimeout(() => {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            } else if (screen.unlockOrientation) {
                screen.unlockOrientation();
            }
        }, 100);
        
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
    
    toggleFullscreen() {
        if (this.isVideoFullscreen) {
            this.exitVideoFullscreen();
        } else {
            this.enterVideoFullscreen();
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
