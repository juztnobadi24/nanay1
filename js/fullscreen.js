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
        this.lastOrientation = null;
        this.forceFullscreenCheck = false;
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
        
        // Listen for video play events to handle auto-fullscreen
        if (this.videoPlayer) {
            this.videoPlayer.addEventListener('play', () => {
                console.log("Video playing, checking fullscreen...");
                setTimeout(() => this.checkAndApplyFullscreen(), 100);
            });
            
            // Also check when video loads
            this.videoPlayer.addEventListener('loadeddata', () => {
                console.log("Video loaded, checking fullscreen...");
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
        }, 200);
    }
    
    checkAndApplyFullscreen() {
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        // For desktop, don't auto-fullscreen
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
        
        // Get user settings
        const autoFullscreen = localStorage.getItem('autoFullscreen');
        // Default to true for mobile if not set
        const finalAutoFullscreen = autoFullscreen === null ? true : autoFullscreen === 'true';
        
        // Portrait fullscreen setting
        const portraitFullscreen = localStorage.getItem('mobileFullscreenPortrait');
        const finalPortraitFullscreen = portraitFullscreen === null ? true : portraitFullscreen === 'true';
        
        console.log(`Orientation: ${isLandscape ? 'LANDSCAPE' : 'PORTRAIT'}, AutoFullscreen: ${finalAutoFullscreen}, Currently in fullscreen: ${!!document.fullscreenElement}`);
        
        if (isLandscape) {
            // LANDSCAPE MODE: MUST go to video fullscreen if enabled
            if (finalAutoFullscreen) {
                // Check if we're already in fullscreen with video
                const isVideoFullscreenNow = document.fullscreenElement === this.videoContainer;
                
                if (!isVideoFullscreenNow) {
                    console.log("LANDSCAPE: Entering video fullscreen...");
                    this.enterVideoFullscreen();
                } else {
                    console.log("LANDSCAPE: Already in video fullscreen");
                }
                
                // If we're in website fullscreen, exit it first
                if (document.fullscreenElement === document.documentElement) {
                    console.log("LANDSCAPE: Exiting website fullscreen before entering video fullscreen");
                    this.exitWebsiteFullscreen();
                    // Re-enter video fullscreen after exit
                    setTimeout(() => {
                        if (finalAutoFullscreen && document.fullscreenElement !== this.videoContainer) {
                            this.enterVideoFullscreen();
                        }
                    }, 100);
                }
            } else {
                // Auto-fullscreen disabled, make sure we're not in fullscreen
                if (document.fullscreenElement) {
                    console.log("LANDSCAPE: Auto-fullscreen disabled, exiting fullscreen");
                    this.exitFullscreen();
                }
            }
        } else {
            // PORTRAIT MODE: Exit video fullscreen immediately
            if (document.fullscreenElement === this.videoContainer) {
                console.log("PORTRAIT: Exiting video fullscreen");
                this.exitVideoFullscreen();
            }
            
            // Check if we should enter website fullscreen
            if (finalPortraitFullscreen && !document.fullscreenElement) {
                console.log("PORTRAIT: Entering website fullscreen");
                this.enterWebsiteFullscreen();
            } else if (!finalPortraitFullscreen && document.fullscreenElement === document.documentElement) {
                console.log("PORTRAIT: Exiting website fullscreen (disabled in settings)");
                this.exitWebsiteFullscreen();
            } else if (finalPortraitFullscreen && document.fullscreenElement === document.documentElement) {
                console.log("PORTRAIT: Already in website fullscreen");
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
        
        console.log("Entering video fullscreen...");
        
        // Hide sidebar and header immediately for better UX
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
                    this.isWebsiteFullscreen = false;
                }).catch(err => {
                    console.error("Video fullscreen failed:", err);
                    // Restore UI if fullscreen fails
                    if (this.sidebar) this.sidebar.style.display = '';
                    if (this.header) this.header.style.display = '';
                    document.body.classList.remove('video-fullscreen-mode');
                    this.isVideoFullscreen = false;
                });
            } else {
                // Fallback for browsers without Promise support
                this.isVideoFullscreen = true;
                this.isWebsiteFullscreen = false;
            }
        };
        
        // Small delay to ensure DOM is ready
        setTimeout(requestFullscreen, 50);
    }
    
    exitVideoFullscreen() {
        console.log("Exiting video fullscreen...");
        
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
        
        // After exiting, check if we need to apply portrait fullscreen
        setTimeout(() => {
            const isLandscape = window.innerWidth > window.innerHeight;
            if (!isLandscape) {
                this.checkAndApplyFullscreen();
            }
        }, 150);
    }
    
    enterWebsiteFullscreen() {
        console.log("Entering website fullscreen...");
        
        // Don't enter if already in fullscreen
        if (document.fullscreenElement === document.documentElement) {
            console.log("Already in website fullscreen");
            this.isWebsiteFullscreen = true;
            return;
        }
        
        // Request fullscreen on document element
        const element = document.documentElement;
        
        const fullscreenPromise = element.requestFullscreen ? element.requestFullscreen() :
                                  element.webkitRequestFullscreen ? element.webkitRequestFullscreen() :
                                  element.mozRequestFullScreen ? element.mozRequestFullScreen() :
                                  element.msRequestFullscreen ? element.msRequestFullscreen() : null;
        
        if (fullscreenPromise) {
            fullscreenPromise.then(() => {
                console.log("Website fullscreen entered successfully");
                this.isWebsiteFullscreen = true;
                this.isVideoFullscreen = false;
                document.body.classList.add('website-fullscreen');
            }).catch(err => {
                console.error("Website fullscreen failed:", err);
                this.isWebsiteFullscreen = false;
            });
        } else {
            this.isWebsiteFullscreen = true;
            this.isVideoFullscreen = false;
            document.body.classList.add('website-fullscreen');
        }
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
    
    exitFullscreen() {
        console.log("Exiting any fullscreen...");
        
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        
        this.isVideoFullscreen = false;
        this.isWebsiteFullscreen = false;
        
        // Restore UI
        if (this.sidebar) this.sidebar.style.display = '';
        if (this.header) this.header.style.display = '';
        document.body.classList.remove('website-fullscreen');
        document.body.classList.remove('video-fullscreen-mode');
    }
    
    handleFullscreenChange() {
        const fsElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
        const isFullscreen = !!fsElement;
        
        console.log("Fullscreen change event, isFullscreen:", isFullscreen, "fsElement:", fsElement ? fsElement.tagName : 'none');
        
        if (!isFullscreen) {
            // We exited fullscreen completely
            console.log("Exited fullscreen completely");
            
            const wasVideoFullscreen = this.isVideoFullscreen;
            const wasWebsiteFullscreen = this.isWebsiteFullscreen;
            
            this.isVideoFullscreen = false;
            this.isWebsiteFullscreen = false;
            document.body.classList.remove('website-fullscreen');
            document.body.classList.remove('video-fullscreen-mode');
            
            // Restore UI
            if (this.sidebar) this.sidebar.style.display = '';
            if (this.header) this.header.style.display = '';
            
            // Check if we need to re-enter based on current orientation
            setTimeout(() => {
                const isLandscape = window.innerWidth > window.innerHeight;
                if (isLandscape) {
                    // If we're in landscape and exited, re-enter video fullscreen
                    console.log("Re-checking fullscreen after exit...");
                    this.checkAndApplyFullscreen();
                } else {
                    // In portrait, apply website fullscreen if needed
                    this.checkAndApplyFullscreen();
                }
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
