// ======================== FULLSCREEN MANAGER ========================

class FullscreenManager {
    constructor() {
        this.videoContainer = null;
        this.videoPlayer = null;
        this.isFullscreen = false;
        this.sidebar = null;
        this.header = null;
        this.originalLayout = null;
        this.orientationHandler = this.handleOrientationChange.bind(this);
        this.settingsModal = null;
    }
    
    init(videoContainer, videoPlayer, sidebar, header, settingsModal) {
        this.videoContainer = videoContainer;
        this.videoPlayer = videoPlayer;
        this.sidebar = sidebar;
        this.header = header;
        this.settingsModal = settingsModal;
        
        // Listen for orientation changes
        window.addEventListener('orientationchange', this.orientationHandler);
        window.addEventListener('resize', this.orientationHandler);
        
        // Listen for fullscreen change events
        document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
        document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange.bind(this));
        document.addEventListener('mozfullscreenchange', this.handleFullscreenChange.bind(this));
        document.addEventListener('MSFullscreenChange', this.handleFullscreenChange.bind(this));
        
        // Add double-click to fullscreen on video container
        if (this.videoContainer) {
            this.videoContainer.addEventListener('dblclick', () => this.toggleFullscreen());
        }
        
        // Initial check for landscape on mobile
        this.checkLandscapeFullscreen();
    }
    
    handleOrientationChange() {
        setTimeout(() => {
            this.checkLandscapeFullscreen();
        }, 100);
    }
    
    handleFullscreenChange() {
        this.isFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
        
        if (!this.isFullscreen) {
            // Exit fullscreen - restore layout
            this.restoreLayout();
        }
    }
    
    checkLandscapeFullscreen() {
        // Check if on mobile and in landscape
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isLandscape = window.innerWidth > window.innerHeight;
        
        // Get auto fullscreen setting
        const autoFullscreen = localStorage.getItem('autoFullscreen') === 'true';
        
        if (isMobile && isLandscape && autoFullscreen && !this.isFullscreen) {
            this.enterFullscreen();
        } else if (isMobile && !isLandscape && this.isFullscreen) {
            this.exitFullscreen();
        }
    }
    
    enterFullscreen() {
        const element = this.videoContainer;
        
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
        
        // Store original layout before fullscreen
        this.originalLayout = {
            sidebarDisplay: this.sidebar ? this.sidebar.style.display : null,
            headerDisplay: this.header ? this.header.style.display : null,
            mainLayoutClass: document.querySelector('.main-layout') ? document.querySelector('.main-layout').className : null
        };
        
        // Hide sidebar and header in fullscreen
        if (this.sidebar) this.sidebar.style.display = 'none';
        if (this.header) this.header.style.display = 'none';
        
        // Make video container take full space
        if (this.videoContainer) {
            this.videoContainer.style.position = 'fixed';
            this.videoContainer.style.top = '0';
            this.videoContainer.style.left = '0';
            this.videoContainer.style.width = '100%';
            this.videoContainer.style.height = '100%';
            this.videoContainer.style.zIndex = '9999';
            this.videoContainer.style.borderRadius = '0';
        }
        
        if (this.videoPlayer) {
            this.videoPlayer.style.objectFit = 'contain';
        }
        
        this.isFullscreen = true;
    }
    
    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        
        this.restoreLayout();
        this.isFullscreen = false;
    }
    
    restoreLayout() {
        // Restore sidebar and header
        if (this.sidebar) this.sidebar.style.display = '';
        if (this.header) this.header.style.display = '';
        
        // Restore video container
        if (this.videoContainer) {
            this.videoContainer.style.position = '';
            this.videoContainer.style.top = '';
            this.videoContainer.style.left = '';
            this.videoContainer.style.width = '';
            this.videoContainer.style.height = '';
            this.videoContainer.style.zIndex = '';
            this.videoContainer.style.borderRadius = '';
        }
        
        // Trigger a resize to refresh layout
        window.dispatchEvent(new Event('resize'));
    }
    
    toggleFullscreen() {
        if (this.isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }
    
    destroy() {
        window.removeEventListener('orientationchange', this.orientationHandler);
        window.removeEventListener('resize', this.orientationHandler);
    }
}

window.FullscreenManager = FullscreenManager;
