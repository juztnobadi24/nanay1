// ======================== FULLSCREEN MANAGER ========================

class FullscreenManager {
    constructor() {
        this.videoContainer = null;
        this.videoPlayer = null;
        this.sidebar = null;
        this.header = null;
        this.isVideoFullscreen = false;
        this.isWebsiteFullscreen = false;
        this.orientationHandler = this.handleOrientationChange.bind(this);
        this.resizeTimer = null;
    }
    
    init(videoContainer, videoPlayer, sidebar, header) {
        this.videoContainer = videoContainer;
        this.videoPlayer = videoPlayer;
        this.sidebar = sidebar;
        this.header = header;
        
        // Listen for orientation changes
        window.addEventListener('orientationchange', this.orientationHandler);
        window.addEventListener('resize', this.orientationHandler);
        
        // Listen for fullscreen change events
        document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
        document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange.bind(this));
        document.addEventListener('mozfullscreenchange', this.handleFullscreenChange.bind(this));
        
        // Listen for video play events to handle auto-fullscreen
        if (this.videoPlayer) {
            this.videoPlayer.addEventListener('play', () => {
                // Small delay to let video start playing
                setTimeout(() => this.checkAndApplyFullscreen(), 100);
            });
        }
        
        // Check initial orientation after a short delay
        setTimeout(() => this.checkAndApplyFullscreen(), 500);
        
        console.log("Fullscreen Manager initialized");
    }
    
    handleOrientationChange() {
        console.log("Orientation change detected");
        
        // Clear any pending resize timer
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }
        
        // Wait for the orientation change to complete and layout to stabilize
        this.resizeTimer = setTimeout(() => {
            this.checkAndApplyFullscreen();
            this.resizeTimer = null;
        }, 300);
    }
    
    checkAndApplyFullscreen() {
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        // For desktop, don't auto-fullscreen
        if (!isMobile) {
            console.log("Desktop device - no auto-fullscreen");
            return;
        }
        
        const isLandscape = window.innerWidth > window.innerHeight;
        
        // Get user settings
        const autoFullscreen = localStorage.getItem('autoFullscreen') === 'true';
        const portraitFullscreen = localStorage.getItem('mobileFullscreenPortrait') !== 'false';
        
        // Default autoFullscreen to true for mobile if not set
        const finalAutoFullscreen = autoFullscreen === null ? true : autoFullscreen;
        
        console.log(`Orientation: ${isLandscape ? 'Landscape' : 'Portrait'}, AutoFullscreen: ${finalAutoFullscreen}, PortraitFullscreen: ${portraitFullscreen}`);
        
        if (isLandscape) {
            // LANDSCAPE MODE: Video fullscreen if enabled
            if (finalAutoFullscreen && !this.isVideoFullscreen && !this.isWebsiteFullscreen) {
                console.log("Entering video fullscreen (landscape)");
                this.enterVideoFullscreen();
            } else if (!finalAutoFullscreen && this.isVideoFullscreen) {
                console.log("Exiting video fullscreen (auto-fullscreen disabled)");
                this.exitVideoFullscreen();
            } else if (this.isWebsiteFullscreen) {
                // If in website fullscreen and landscape, switch to video fullscreen
                console.log("Switching from website fullscreen to video fullscreen");
                this.exitWebsiteFullscreen();
                setTimeout(() => {
                    if (finalAutoFullscreen) {
                        this.enterVideoFullscreen();
                    }
                }, 100);
            }
        } else {
            // PORTRAIT MODE: Exit video fullscreen and optionally enter website fullscreen
            if (this.isVideoFullscreen) {
                console.log("Exiting video fullscreen (portrait mode)");
                this.exitVideoFullscreen();
            }
            
            // Check if we should enter website fullscreen
            if (portraitFullscreen && !this.isWebsiteFullscreen && !document.fullscreenElement) {
                console.log("Entering website fullscreen (portrait)");
                this.enterWebsiteFullscreen();
            } else if (!portraitFullscreen && this.isWebsiteFullscreen) {
                console.log("Exiting website fullscreen (portrait fullscreen disabled)");
                this.exitWebsiteFullscreen();
            }
        }
    }
    
    enterVideoFullscreen() {
        if (!this.videoContainer) {
            console.error("Video container not found");
            return;
        }
        
        // Don't enter if already in fullscreen
        if (document.fullscreenElement === this.videoContainer) {
            console.log("Already in video fullscreen");
            return;
        }
        
        console.log("Entering video fullscreen...");
        
        // Hide sidebar and header
        if (this.sidebar) this.sidebar.style.display = 'none';
        if (this.header) this.header.style.display = 'none';
        
        // Add class for styling
        document.body.classList.add('video-fullscreen-mode');
        
        // Request fullscreen on video container
        const element = this.videoContainer;
        
        const fullscreenPromise = element.requestFullscreen ? element.requestFullscreen() :
                                  element.webkitRequestFullscreen ? element.webkitRequestFullscreen() :
                                  element.mozRequestFullScreen ? element.mozRequestFullScreen() :
                                  element.msRequestFullscreen ? element.msRequestFullscreen() : null;
        
        if (fullscreenPromise) {
            fullscreenPromise.catch(err => {
                console.error("Video fullscreen failed:", err);
                // Restore UI if fullscreen fails
                if (this.sidebar) this.sidebar.style.display = '';
                if (this.header) this.header.style.display = '';
                document.body.classList.remove('video-fullscreen-mode');
            });
        }
        
        this.isVideoFullscreen = true;
        this.isWebsiteFullscreen = false;
    }
    
    exitVideoFullscreen() {
        console.log("Exiting video fullscreen...");
        
        // Exit fullscreen if video container is fullscreen
        if (document.fullscreenElement === this.videoContainer || 
            document.webkitFullscreenElement === this.videoContainer ||
            document.mozFullScreenElement === this.videoContainer) {
            
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
        
        // Restore sidebar and header
        if (this.sidebar) this.sidebar.style.display = '';
        if (this.header) this.header.style.display = '';
        document.body.classList.remove('video-fullscreen-mode');
        
        this.isVideoFullscreen = false;
        
        // After exiting, check if we need to reapply any fullscreen
        setTimeout(() => {
            this.checkAndApplyFullscreen();
        }, 100);
    }
    
    enterWebsiteFullscreen() {
        console.log("Entering website fullscreen...");
        
        // Don't enter if already in fullscreen
        if (document.fullscreenElement === document.documentElement) {
            console.log("Already in website fullscreen");
            return;
        }
        
        // Request fullscreen on document element
        const element = document.documentElement;
        
        const fullscreenPromise = element.requestFullscreen ? element.requestFullscreen() :
                                  element.webkitRequestFullscreen ? element.webkitRequestFullscreen() :
                                  element.mozRequestFullScreen ? element.mozRequestFullScreen() :
                                  element.msRequestFullscreen ? element.msRequestFullscreen() : null;
        
        if (fullscreenPromise) {
            fullscreenPromise.catch(err => {
                console.error("Website fullscreen failed:", err);
            });
        }
        
        this.isWebsiteFullscreen = true;
        this.isVideoFullscreen = false;
        document.body.classList.add('website-fullscreen');
    }
    
    exitWebsiteFullscreen() {
        console.log("Exiting website fullscreen...");
        
        // Exit fullscreen if document is fullscreen
        if (document.fullscreenElement === document.documentElement ||
            document.webkitFullscreenElement === document.documentElement ||
            document.mozFullScreenElement === document.documentElement) {
            
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
        
        this.isWebsiteFullscreen = false;
        document.body.classList.remove('website-fullscreen');
    }
    
    handleFullscreenChange() {
        const fsElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
        const isFullscreen = !!fsElement;
        
        console.log("Fullscreen change event, isFullscreen:", isFullscreen, "fsElement:", fsElement);
        
        if (!isFullscreen) {
            // We exited fullscreen completely
            const wasVideoFullscreen = this.isVideoFullscreen;
            const wasWebsiteFullscreen = this.isWebsiteFullscreen;
            
            this.isVideoFullscreen = false;
            this.isWebsiteFullscreen = false;
            document.body.classList.remove('website-fullscreen');
            document.body.classList.remove('video-fullscreen-mode');
            
            // Restore UI
            if (this.sidebar) this.sidebar.style.display = '';
            if (this.header) this.header.style.display = '';
            
            // If we exited due to orientation change, let orientation handler handle it
            // Otherwise, reapply based on current orientation
            setTimeout(() => {
                this.checkAndApplyFullscreen();
            }, 100);
        } else {
            // We entered fullscreen on some element
            if (fsElement === this.videoContainer) {
                this.isVideoFullscreen = true;
                this.isWebsiteFullscreen = false;
                console.log("Video is fullscreen");
                
                // Ensure UI is hidden when video is fullscreen
                if (this.sidebar) this.sidebar.style.display = 'none';
                if (this.header) this.header.style.display = 'none';
            } else if (fsElement === document.documentElement) {
                this.isWebsiteFullscreen = true;
                this.isVideoFullscreen = false;
                console.log("Website is fullscreen");
                document.body.classList.add('website-fullscreen');
            }
        }
    }
    
    toggleFullscreen() {
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isLandscape = window.innerWidth > window.innerHeight;
        
        if (isMobile && isLandscape) {
            if (this.isVideoFullscreen) {
                this.exitVideoFullscreen();
            } else {
                this.enterVideoFullscreen();
            }
        } else if (isMobile && !isLandscape) {
            if (this.isWebsiteFullscreen) {
                this.exitWebsiteFullscreen();
            } else {
                this.enterWebsiteFullscreen();
            }
        } else {
            // Desktop - toggle website fullscreen
            if (this.isWebsiteFullscreen) {
                this.exitWebsiteFullscreen();
            } else {
                this.enterWebsiteFullscreen();
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
        if (this.isVideoFullscreen || this.isWebsiteFullscreen) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
        
        // Restore UI
        if (this.sidebar) this.sidebar.style.display = '';
        if (this.header) this.header.style.display = '';
        document.body.classList.remove('website-fullscreen');
        document.body.classList.remove('video-fullscreen-mode');
    }
}

window.FullscreenManager = FullscreenManager;
