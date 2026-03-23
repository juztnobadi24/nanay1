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
        
        // Check initial orientation
        setTimeout(() => this.checkAndApplyFullscreen(), 500);
        
        console.log("Fullscreen Manager initialized");
    }
    
    handleOrientationChange() {
        setTimeout(() => {
            this.checkAndApplyFullscreen();
        }, 200);
    }
    
    checkAndApplyFullscreen() {
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isLandscape = window.innerWidth > window.innerHeight;
        
        if (!isMobile) return;
        
        // Get user settings
        const autoFullscreen = localStorage.getItem('autoFullscreen') === 'true';
        const portraitFullscreen = localStorage.getItem('mobileFullscreenPortrait') !== 'false';
        
        console.log(`Orientation: ${isLandscape ? 'Landscape' : 'Portrait'}, AutoFullscreen: ${autoFullscreen}, PortraitFullscreen: ${portraitFullscreen}`);
        
        if (isLandscape) {
            // LANDSCAPE MODE: Video fullscreen if enabled
            if (autoFullscreen && !this.isVideoFullscreen) {
                // Exit website fullscreen first
                if (this.isWebsiteFullscreen) {
                    this.exitWebsiteFullscreen();
                }
                this.enterVideoFullscreen();
            } else if (!autoFullscreen && this.isVideoFullscreen) {
                this.exitVideoFullscreen();
            }
        } else {
            // PORTRAIT MODE: Website fullscreen if enabled
            if (portraitFullscreen && !this.isWebsiteFullscreen) {
                // Exit video fullscreen first
                if (this.isVideoFullscreen) {
                    this.exitVideoFullscreen();
                }
                this.enterWebsiteFullscreen();
            } else if (!portraitFullscreen && this.isWebsiteFullscreen) {
                this.exitWebsiteFullscreen();
            }
        }
    }
    
    enterVideoFullscreen() {
        if (!this.videoContainer) {
            console.error("Video container not found");
            return;
        }
        
        console.log("Entering video fullscreen...");
        
        // Hide sidebar and header
        if (this.sidebar) this.sidebar.style.display = 'none';
        if (this.header) this.header.style.display = 'none';
        
        // Request fullscreen on video container
        const element = this.videoContainer;
        
        if (element.requestFullscreen) {
            element.requestFullscreen().catch(err => {
                console.error("Video fullscreen failed:", err);
            });
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
        
        this.isVideoFullscreen = true;
        this.isWebsiteFullscreen = false;
    }
    
    exitVideoFullscreen() {
        console.log("Exiting video fullscreen...");
        
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        
        // Restore sidebar and header
        if (this.sidebar) this.sidebar.style.display = '';
        if (this.header) this.header.style.display = '';
        
        this.isVideoFullscreen = false;
        
        // Reapply website fullscreen if needed
        setTimeout(() => {
            this.checkAndApplyFullscreen();
        }, 100);
    }
    
    enterWebsiteFullscreen() {
        console.log("Entering website fullscreen...");
        
        // Request fullscreen on document element
        const element = document.documentElement;
        
        if (element.requestFullscreen) {
            element.requestFullscreen().catch(err => {
                console.error("Website fullscreen failed:", err);
            });
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
        
        this.isWebsiteFullscreen = true;
        this.isVideoFullscreen = false;
        document.body.classList.add('website-fullscreen');
    }
    
    exitWebsiteFullscreen() {
        console.log("Exiting website fullscreen...");
        
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        
        this.isWebsiteFullscreen = false;
        document.body.classList.remove('website-fullscreen');
        
        // Reapply video fullscreen if needed
        setTimeout(() => {
            this.checkAndApplyFullscreen();
        }, 100);
    }
    
    handleFullscreenChange() {
        const isFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
        
        console.log("Fullscreen change event, isFullscreen:", isFullscreen);
        
        if (!isFullscreen) {
            // We exited fullscreen, reset states
            this.isVideoFullscreen = false;
            this.isWebsiteFullscreen = false;
            document.body.classList.remove('website-fullscreen');
            
            // Restore UI
            if (this.sidebar) this.sidebar.style.display = '';
            if (this.header) this.header.style.display = '';
            
            // Reapply correct mode
            setTimeout(() => {
                this.checkAndApplyFullscreen();
            }, 200);
        } else {
            // Check which element is fullscreen
            const fsElement = document.fullscreenElement || document.webkitFullscreenElement;
            
            if (fsElement === this.videoContainer) {
                this.isVideoFullscreen = true;
                this.isWebsiteFullscreen = false;
                console.log("Video is fullscreen");
            } else if (fsElement === document.documentElement) {
                this.isWebsiteFullscreen = true;
                this.isVideoFullscreen = false;
                console.log("Website is fullscreen");
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
        }
    }
    
    destroy() {
        window.removeEventListener('orientationchange', this.orientationHandler);
        window.removeEventListener('resize', this.orientationHandler);
    }
}

window.FullscreenManager = FullscreenManager;
