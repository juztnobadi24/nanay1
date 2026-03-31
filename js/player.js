// ======================== PLAYER COMPONENT ========================

class PlayerComponent {
    constructor() {
        this.container = document.getElementById("playerArea");
        this.videoPlayer = null;
        this.currentChannelNameSpan = null;
        this.drmNoticeSpan = null;
        this.errorMessageDiv = null;
        this.videoContainer = null;
        this.radioLogoContainer = null;
        this.radioLogoImg = null;
        
        this.shakaPlayer = null;
        this.hlsPlayer = null;
        this.isShakaInitialized = false;
        this.currentChannel = null;
        this.isLoading = false;
        this.loadRetryCount = 0;
        this.maxRetries = 2;
        this.loaderOverlay = null;
        
        // Slideshow properties
        this.slideshowContainer = null;
        this.slideshowImages = [];
        this.currentSlideIndex = 0;
        this.slideshowInterval = null;
        this.slideshowEnabled = true;
        this.slideshowDuration = 5000; // 5 seconds per slide
        this.isLooping = true;
        
        // Fullscreen button elements
        this.fullscreenBtn = null;
        this.fullscreenTimeout = null;
        this.isFullscreenBtnVisible = false;
        this.isFullscreen = false;
    }
    
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="video-container" id="videoContainer">
                <video id="videoPlayer" playsinline disablePictureInPicture autoplay style="display: none;"></video>
                <div class="slideshow-container" id="slideshowContainer">
                    <div class="slideshow-wrapper" id="slideshowWrapper">
                        <div class="slideshow-slides" id="slideshowSlides"></div>
                        <button class="slideshow-prev" id="slideshowPrevBtn"><i class="fas fa-chevron-left"></i></button>
                        <button class="slideshow-next" id="slideshowNextBtn"><i class="fas fa-chevron-right"></i></button>
                        <div class="slideshow-dots" id="slideshowDots"></div>
                    </div>
                </div>
                <div class="radio-logo-container" id="radioLogoContainer" style="display: none;"></div>
                <button class="fullscreen-toggle-btn" id="fullscreenToggleBtn">
                    <i class="fas fa-expand"></i>
                </button>
            </div>
            <div class="error-message" id="errorMessage"></div>
        `;
        
        this.videoPlayer = document.getElementById("videoPlayer");
        this.errorMessageDiv = document.getElementById("errorMessage");
        this.videoContainer = document.getElementById("videoContainer");
        this.radioLogoContainer = document.getElementById("radioLogoContainer");
        this.slideshowContainer = document.getElementById("slideshowContainer");
        this.slideshowSlides = document.getElementById("slideshowSlides");
        this.slideshowDots = document.getElementById("slideshowDots");
        
        // Remove controls from video player
        if (this.videoPlayer) {
            this.videoPlayer.removeAttribute("controls");
            this.videoPlayer.controls = false;
            this.videoPlayer.autoplay = true;
        }
        
        // Setup slideshow
        this.setupSlideshow();
        
        // Setup fullscreen button
        this.setupFullscreenButton();
        
        window.domElements = {
            ...window.domElements,
            videoPlayer: this.videoPlayer,
            errorMessage: this.errorMessageDiv
        };
    }
    
    setupSlideshow() {
        if (!this.slideshowContainer) return;
        
        // Define slideshow images with channel links
        this.slideshowImages = [
            {
                image: "https://image.tmdb.org/t/p/original/vDQb06miaaW7C2GUPeMNDmyqWec.jpg",
                title: "The Prince of Egypt",
                channelName: "The Prince of Egypt (1998)",
                isMoviesCollection: true
            },
            {
                image: "https://images.angelstudios.com/image/upload/q_auto,w_930,h_523,f_webp,c_scale/v1762380415/studio-app/catalog/2e4f0d11-1b19-4e6b-b8c1-a961c938fe2f",
                title: "David",
                channelName: "David (2025)",
                isMoviesCollection: true
            },
            {
                image: "https://static1.colliderimages.com/wordpress/wp-content/uploads/2021/11/best-kids-family-movies-hbo-max.jpg",
                title: "HBO Family",
                channelName: "HBO Family"
            },
            {
                image: "https://i0.wp.com/anitrendz.net/news/wp-content/uploads/2019/01/Aniplus_Asia_Winter_2019_Simulcast.png",
                title: "AniPlus",
                channelName: "AniPlus"
            },
            {
                image: "https://library.sportingnews.com/styles/twitter_card_120x120/s3/2023-10/GFX-1143%20NBA%20TV%20schedule%20FTR.jpg?itok=B1xtr2Cl",
                title: "NBA TV",
                channelName: "NBA TV"
            },

            {
                image: "https://cdn-images-3.listennotes.com/podcasts/barangay-love-stories-barangay-ls-971-RKoFbLgJBxS-vTnha6cPKXt.1400x1400.jpg",
                title: "97.1 Barangay LS",
                channelName: "97.1 Barangay LS",
                isRadioCollection: true
            },
            {
                image: "https://m.media-amazon.com/images/I/81DNOVqynxL.jpg",
                title: "Kartoon Channel HD",
                channelName: "Kartoon Channel HD"
            }

        ];
        
        this.renderSlideshow();
        this.startSlideshow();
        
        // Attach navigation buttons
        const prevBtn = document.getElementById("slideshowPrevBtn");
        const nextBtn = document.getElementById("slideshowNextBtn");
        
        if (prevBtn) {
            prevBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.prevSlide();
                this.resetSlideshowTimer();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.nextSlide();
                this.resetSlideshowTimer();
            });
        }
        
        // Pause slideshow on hover
        this.slideshowContainer.addEventListener("mouseenter", () => {
            this.pauseSlideshow();
        });
        
        this.slideshowContainer.addEventListener("mouseleave", () => {
            this.resumeSlideshow();
        });
        
        // Touch events for mobile
        this.slideshowContainer.addEventListener("touchstart", (e) => {
            this.touchStartX = e.touches[0].clientX;
        });
        
        this.slideshowContainer.addEventListener("touchend", (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = this.touchStartX - touchEndX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    this.nextSlide();
                } else {
                    this.prevSlide();
                }
                this.resetSlideshowTimer();
            }
        });
    }
    
    renderSlideshow() {
        if (!this.slideshowSlides || !this.slideshowDots) return;
        
        // Create array for infinite loop by duplicating slides
        // This creates a seamless infinite loop effect
        const infiniteImages = [...this.slideshowImages, ...this.slideshowImages, ...this.slideshowImages];
        
        // Render slides
        let slidesHtml = '';
        let dotsHtml = '';
        
        // Only create dots for original images (not duplicates)
        this.slideshowImages.forEach((slide, index) => {
            dotsHtml += `
                <div class="slideshow-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>
            `;
        });
        
        // Create slides with duplicate images for infinite loop
        infiniteImages.forEach((slide, idx) => {
            const originalIndex = idx % this.slideshowImages.length;
            slidesHtml += `
                <div class="slideshow-slide" data-index="${originalIndex}" data-channel="${slide.channelName || ''}" data-is-radio="${slide.isRadioCollection || false}" data-is-movies="${slide.isMoviesCollection || false}">
                    <img src="${slide.image}" alt="${slide.title}" class="slideshow-image">
                    <div class="slideshow-caption">
                        <h3>${slide.title}</h3>
                        <p>Click to play</p>
                    </div>
                </div>
            `;
        });
        
        this.slideshowSlides.innerHTML = slidesHtml;
        this.slideshowDots.innerHTML = dotsHtml;
        
        // Set initial position to the first set of images (start at the middle set)
        const slideWidth = this.slideshowContainer ? this.slideshowContainer.clientWidth : 0;
        const startPosition = -(this.slideshowImages.length * 100);
        this.slideshowSlides.style.transform = `translateX(${startPosition}%)`;
        this.currentSlideIndex = this.slideshowImages.length;
        
        // Add click handlers to slides
        document.querySelectorAll('.slideshow-slide').forEach(slide => {
            slide.addEventListener('click', async () => {
                const originalIndex = parseInt(slide.dataset.index);
                const channelName = slide.dataset.channel;
                const isRadio = slide.dataset.isRadio === 'true';
                const isMovies = slide.dataset.isMovies === 'true';
                
                if (channelName) {
                    // Find and play the specific channel
                    const channel = window.channelsData.find(ch => ch.name === channelName);
                    if (channel && typeof window.onChannelSelect === 'function') {
                        this.stopSlideshow();
                        await window.onChannelSelect(channel);
                    }
                } else if (isRadio) {
                    // Switch to radio mode and show radio stations
                    if (typeof window.onModeChange === 'function') {
                        window.onModeChange('radio');
                        this.stopSlideshow();
                    }
                } else if (isMovies) {
                    // Switch to movies mode
                    if (typeof window.onModeChange === 'function') {
                        window.onModeChange('movies');
                        this.stopSlideshow();
                    }
                }
            });
        });
        
        // Add click handlers to dots
        document.querySelectorAll('.slideshow-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(dot.dataset.index);
                this.goToSlide(index);
                this.resetSlideshowTimer();
            });
        });
        
        // Update active dot
        this.updateActiveDot(0);
    }
    
    updateActiveSlide(index) {
        // Get the actual position based on the infinite loop
        const slideWidth = this.slideshowContainer ? this.slideshowContainer.clientWidth : 0;
        const position = -(index * 100);
        
        // Smooth transition
        this.slideshowSlides.style.transition = 'transform 0.5s ease-in-out';
        this.slideshowSlides.style.transform = `translateX(${position}%)`;
        
        // Handle infinite loop reset
        setTimeout(() => {
            if (index >= this.slideshowImages.length * 2) {
                // Reset to the beginning of the middle set
                this.slideshowSlides.style.transition = 'none';
                const resetPosition = -(this.slideshowImages.length * 100);
                this.slideshowSlides.style.transform = `translateX(${resetPosition}%)`;
                this.currentSlideIndex = this.slideshowImages.length;
                // Force reflow
                this.slideshowSlides.offsetHeight;
                this.slideshowSlides.style.transition = 'transform 0.5s ease-in-out';
            } else if (index < this.slideshowImages.length) {
                // Reset to the end of the middle set
                this.slideshowSlides.style.transition = 'none';
                const resetPosition = -(this.slideshowImages.length * 2 * 100);
                this.slideshowSlides.style.transform = `translateX(${resetPosition}%)`;
                this.currentSlideIndex = this.slideshowImages.length * 2;
                // Force reflow
                this.slideshowSlides.offsetHeight;
                this.slideshowSlides.style.transition = 'transform 0.5s ease-in-out';
            } else {
                this.currentSlideIndex = index;
            }
        }, 500);
        
        // Update active dot based on the original image index
        const originalIndex = index % this.slideshowImages.length;
        this.updateActiveDot(originalIndex);
    }
    
    updateActiveDot(originalIndex) {
        document.querySelectorAll('.slideshow-dot').forEach((dot, i) => {
            if (i === originalIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
    
    startSlideshow() {
        if (this.slideshowInterval) {
            clearInterval(this.slideshowInterval);
        }
        
        this.slideshowInterval = setInterval(() => {
            if (this.slideshowEnabled && this.slideshowContainer && this.slideshowContainer.style.display !== 'none') {
                this.nextSlide();
            }
        }, this.slideshowDuration);
    }
    
    stopSlideshow() {
        if (this.slideshowInterval) {
            clearInterval(this.slideshowInterval);
            this.slideshowInterval = null;
        }
        this.slideshowEnabled = false;
    }
    
    pauseSlideshow() {
        if (this.slideshowInterval) {
            clearInterval(this.slideshowInterval);
            this.slideshowInterval = null;
        }
    }
    
    resumeSlideshow() {
        if (!this.slideshowEnabled) return;
        
        if (this.slideshowInterval) {
            clearInterval(this.slideshowInterval);
        }
        
        this.slideshowInterval = setInterval(() => {
            if (this.slideshowEnabled && this.slideshowContainer && this.slideshowContainer.style.display !== 'none') {
                this.nextSlide();
            }
        }, this.slideshowDuration);
    }
    
    resetSlideshowTimer() {
        if (!this.slideshowEnabled) return;
        
        if (this.slideshowInterval) {
            clearInterval(this.slideshowInterval);
        }
        
        this.slideshowInterval = setInterval(() => {
            if (this.slideshowEnabled && this.slideshowContainer && this.slideshowContainer.style.display !== 'none') {
                this.nextSlide();
            }
        }, this.slideshowDuration);
    }
    
    nextSlide() {
        // Move to next slide (right to left movement)
        let nextIndex = this.currentSlideIndex + 1;
        this.updateActiveSlide(nextIndex);
    }
    
    prevSlide() {
        // Move to previous slide (left to right movement)
        let prevIndex = this.currentSlideIndex - 1;
        this.updateActiveSlide(prevIndex);
    }
    
    goToSlide(originalIndex) {
        // Calculate the actual position to show the desired original image
        const targetIndex = this.currentSlideIndex + (originalIndex - (this.currentSlideIndex % this.slideshowImages.length));
        this.updateActiveSlide(targetIndex);
    }
    
    showSlideshow() {
        if (this.slideshowContainer) {
            this.slideshowContainer.style.display = 'flex';
            // Reset to the middle set when showing
            const resetPosition = -(this.slideshowImages.length * 100);
            this.slideshowSlides.style.transition = 'none';
            this.slideshowSlides.style.transform = `translateX(${resetPosition}%)`;
            this.currentSlideIndex = this.slideshowImages.length;
            // Force reflow
            this.slideshowSlides.offsetHeight;
            this.slideshowSlides.style.transition = 'transform 0.5s ease-in-out';
        }
        if (this.videoPlayer) {
            this.videoPlayer.style.display = 'none';
        }
        if (this.radioLogoContainer) {
            this.radioLogoContainer.style.display = 'none';
        }
        this.slideshowEnabled = true;
        this.startSlideshow();
    }
    
    hideSlideshow() {
        if (this.slideshowContainer) {
            this.slideshowContainer.style.display = 'none';
        }
        if (this.videoPlayer) {
            this.videoPlayer.style.display = '';
        }
        this.slideshowEnabled = false;
        this.pauseSlideshow();
    }
    
    showRadioLogo(channel) {
        if (!this.radioLogoContainer) return;
        
        // Check if it's a radio channel
        const isRadio = channel.type === "Radio";
        
        if (!isRadio) {
            // Hide logo for TV channels
            this.radioLogoContainer.style.display = 'none';
            if (this.videoPlayer) {
                this.videoPlayer.style.opacity = '1';
            }
            return;
        }
        
        // Hide slideshow when radio is playing
        this.hideSlideshow();
        
        // Try to get logo from multiple sources
        let logoUrl = null;
        
        // Priority 1: logo from channel object
        if (channel.logo) {
            logoUrl = channel.logo;
        }
        // Priority 2: logoLocal (if you have local logos)
        else if (channel.logoLocal) {
            logoUrl = `images/${channel.logoLocal}.webp`;
        }
        // Priority 3: fallback to default radio logo
        else {
            logoUrl = 'https://via.placeholder.com/200x200/1a1e2c/f97316?text=📻';
        }
        
        // Clear existing content
        this.radioLogoContainer.innerHTML = '';
        
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'radio-logo-wrapper';
        
        // Create logo content container
        const logoContent = document.createElement('div');
        logoContent.className = 'radio-logo-content';
        
        // Create logo image
        const img = document.createElement('img');
        img.className = 'radio-logo';
        img.src = logoUrl;
        img.alt = channel.name;
        
        // Handle image load error
        img.onerror = () => {
            img.src = 'https://via.placeholder.com/200x200/1a1e2c/f97316?text=📻';
            img.alt = 'Radio';
        };
        
        logoContent.appendChild(img);
        wrapper.appendChild(logoContent);
        
        this.radioLogoContainer.appendChild(wrapper);
        
        // Add station name
        const stationName = document.createElement('div');
        stationName.className = 'station-name';
        stationName.textContent = channel.name;
        this.radioLogoContainer.appendChild(stationName);
        
        // Show logo container
        this.radioLogoContainer.style.display = 'flex';
        
        // Fade out video player for radio
        if (this.videoPlayer) {
            this.videoPlayer.style.opacity = '0.3';
        }
    }
    
    hideRadioLogo() {
        if (this.radioLogoContainer) {
            this.radioLogoContainer.style.display = 'none';
        }
        if (this.videoPlayer) {
            this.videoPlayer.style.opacity = '1';
        }
    }
    
    setupFullscreenButton() {
        this.fullscreenBtn = document.getElementById('fullscreenToggleBtn');
        if (!this.fullscreenBtn) return;
        
        // Initially hide the button
        this.hideFullscreenButton();
        
        // Add click event to toggle fullscreen
        this.fullscreenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.toggleFullscreen();
        });
        
        // Show button when video container is touched/clicked
        if (this.videoContainer) {
            this.videoContainer.addEventListener('click', (e) => {
                if (e.target === this.fullscreenBtn || this.fullscreenBtn.contains(e.target)) {
                    return;
                }
                this.showFullscreenButton();
            });
            
            this.videoContainer.addEventListener('touchstart', (e) => {
                if (e.target === this.fullscreenBtn || this.fullscreenBtn.contains(e.target)) {
                    return;
                }
                this.showFullscreenButton();
            });
        }
        
        if (this.videoPlayer) {
            this.videoPlayer.addEventListener('click', () => {
                this.showFullscreenButton();
            });
            
            this.videoPlayer.addEventListener('touchstart', () => {
                this.showFullscreenButton();
            });
        }
        
        document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.onFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.onFullscreenChange());
    }
    
    onFullscreenChange() {
        const isFullscreen = !!(document.fullscreenElement || 
                                document.webkitFullscreenElement || 
                                document.mozFullScreenElement);
        
        this.isFullscreen = isFullscreen;
        
        if (this.fullscreenBtn) {
            if (isFullscreen) {
                this.fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
                this.fullscreenBtn.title = 'Exit Fullscreen';
            } else {
                this.fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
                this.fullscreenBtn.title = 'Enter Fullscreen';
            }
        }
        
        this.showFullscreenButton();
        console.log("Fullscreen changed:", isFullscreen ? "Entered" : "Exited");
    }
    
    showFullscreenButton() {
        if (!this.fullscreenBtn) return;
        
        if (this.fullscreenTimeout) {
            clearTimeout(this.fullscreenTimeout);
        }
        
        this.fullscreenBtn.classList.add('show');
        this.isFullscreenBtnVisible = true;
        
        this.fullscreenTimeout = setTimeout(() => {
            this.hideFullscreenButton();
        }, 3000);
    }
    
    hideFullscreenButton() {
        if (!this.fullscreenBtn) return;
        
        this.fullscreenBtn.classList.remove('show');
        this.isFullscreenBtnVisible = false;
        
        if (this.fullscreenTimeout) {
            clearTimeout(this.fullscreenTimeout);
            this.fullscreenTimeout = null;
        }
    }
    
    toggleFullscreen() {
        if (!this.videoContainer) return;
        
        const isFullscreen = !!(document.fullscreenElement || 
                                document.webkitFullscreenElement || 
                                document.mozFullScreenElement);
        
        if (isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }
    
    enterFullscreen() {
        if (!this.videoContainer) return;
        
        const element = this.videoContainer;
        
        const requestFullscreen = () => {
            if (element.requestFullscreen) {
                return element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                return element.webkitRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                return element.mozRequestFullScreen();
            } else if (element.msRequestFullscreen) {
                return element.msRequestFullscreen();
            }
            return Promise.reject("Fullscreen not supported");
        };
        
        requestFullscreen().then(() => {
            console.log("Fullscreen entered successfully");
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
            console.error("Fullscreen request failed:", err);
            if (this.videoPlayer && this.videoPlayer.requestFullscreen) {
                this.videoPlayer.requestFullscreen().catch(e => {
                    console.error("Video element fullscreen also failed:", e);
                });
            }
        });
    }
    
    exitFullscreen() {
        const exitFullscreen = () => {
            if (document.exitFullscreen) {
                return document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                return document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                return document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                return document.msExitFullscreen();
            }
            return Promise.reject("Exit fullscreen not supported");
        };
        
        exitFullscreen().then(() => {
            console.log("Fullscreen exited successfully");
            setTimeout(() => {
                if (screen.orientation && screen.orientation.unlock) {
                    screen.orientation.unlock();
                } else if (screen.unlockOrientation) {
                    screen.unlockOrientation();
                }
            }, 100);
        }).catch(err => {
            console.error("Exit fullscreen failed:", err);
        });
    }
    
    async destroyPlayers() {
        this.isLoading = false;
        this.hideLoader();
        
        // Show slideshow when no channel is playing
        if (!this.currentChannel) {
            this.showSlideshow();
        }
        
        // Remove any embedded iframe
        const existingIframe = this.videoContainer?.querySelector('.embed-iframe');
        if (existingIframe) {
            existingIframe.remove();
        }
        
        // Restore custom fullscreen button when switching away from embedded content
        if (this.fullscreenBtn) {
            this.fullscreenBtn.style.display = 'flex';
        }
        
        if (this.isFullscreen) {
            this.exitFullscreen();
        }
        
        if (this.videoPlayer) {
            try {
                this.videoPlayer.pause();
                this.videoPlayer.removeAttribute("src");
                this.videoPlayer.load();
                this.videoPlayer.style.display = '';
            } catch (e) {
                console.warn("Error clearing video:", e);
            }
        }
        
        if (this.shakaPlayer) {
            try {
                await this.shakaPlayer.destroy();
            } catch (e) {
                console.warn("Error destroying Shaka player:", e);
            }
            this.shakaPlayer = null;
        }
        
        if (this.hlsPlayer) {
            try {
                this.hlsPlayer.destroy();
            } catch (e) {
                console.warn("Error destroying HLS player:", e);
            }
            this.hlsPlayer = null;
        }
        
        this.isShakaInitialized = false;
    }
    
    async initShaka() {
        if (this.shakaPlayer) return this.shakaPlayer;
        if (typeof shaka !== "undefined") {
            this.shakaPlayer = new shaka.Player(this.videoPlayer);
            await this.shakaPlayer.configure({
                drm: {
                    servers: {},
                    clearKeys: {},
                    retryParameters: { maxAttempts: 3 }
                },
                streaming: {
                    rebufferingGoal: 2,
                    bufferingGoal: 10,
                    retryParameters: { maxAttempts: 3 }
                }
            });
            this.shakaPlayer.addEventListener("error", (event) => {
                console.error("Shaka error", event.detail);
            });
            this.isShakaInitialized = true;
            return this.shakaPlayer;
        }
        return null;
    }
    
    showError(msg) {
        console.error(msg);
        this.hideLoader();
    }
    
    showLoader(message = "Loading stream...") {
        this.hideLoader();
        
        this.loaderOverlay = document.createElement('div');
        this.loaderOverlay.className = 'loader-overlay';
        this.loaderOverlay.innerHTML = `
            <div class="loader">
                <div class="loader-text">${message}</div>
            </div>
        `;
        
        if (this.videoContainer) {
            this.videoContainer.style.position = 'relative';
            this.videoContainer.appendChild(this.loaderOverlay);
        }
    }
    
    hideLoader() {
        if (this.loaderOverlay && this.loaderOverlay.parentNode) {
            this.loaderOverlay.remove();
            this.loaderOverlay = null;
        }
    }
    
    updateLoaderMessage(message) {
        if (this.loaderOverlay) {
            const loaderText = this.loaderOverlay.querySelector('.loader-text');
            if (loaderText) {
                loaderText.textContent = message;
            }
        }
    }
    
    async loadEmbeddedContent(url, channel) {
        // No loader for embedded content - just show immediately
        console.log("Loading embedded content:", channel.name);
        
        // Hide slideshow when playing content
        this.hideSlideshow();
        
        // Remove any existing iframe
        const existingIframe = this.videoContainer?.querySelector('.embed-iframe');
        if (existingIframe) {
            existingIframe.remove();
        }
        
        // Hide video player
        if (this.videoPlayer) {
            this.videoPlayer.style.display = 'none';
        }
        
        // Hide custom fullscreen button for embedded content
        if (this.fullscreenBtn) {
            this.fullscreenBtn.style.display = 'none';
        }
        
        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.className = 'embed-iframe';
        iframe.src = url;
        iframe.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
            background: #000;
            z-index: 20;
            pointer-events: auto;
        `;
        iframe.allow = 'autoplay; fullscreen; picture-in-picture; microphone; camera';
        iframe.allowFullscreen = true;
        
        iframe.onload = () => {
            console.log("Embedded content loaded:", channel.name);
        };
        
        iframe.onerror = () => {
            console.error("Failed to load embedded content");
            this.showError("Failed to load movie player");
        };
        
        this.videoContainer.appendChild(iframe);
        this.hideRadioLogo();
        
        return true;
    }
    
    async loadStream(url, drmConfig = null, headers = null, isRetry = false) {
        console.log("Loading stream:", url);
        
        // Hide slideshow when loading stream
        this.hideSlideshow();
        
        await this.destroyPlayers();
        
        const isDash = url.includes(".mpd") || url.includes("manifest.mpd");
        const isHls = url.includes(".m3u8");
        
        if (isRetry) {
            this.updateLoaderMessage(`Retrying (${this.loadRetryCount}/${this.maxRetries})...`);
        } else {
            this.showLoader("Loading stream...");
        }
        
        const loadTimeout = setTimeout(() => {
            console.warn("Stream load timeout for:", url);
            if (!isRetry && this.loadRetryCount < this.maxRetries) {
                this.loadRetryCount++;
                console.log(`Retrying stream load (${this.loadRetryCount}/${this.maxRetries})...`);
                this.updateLoaderMessage(`Timeout, retrying (${this.loadRetryCount}/${this.maxRetries})...`);
                this.loadStream(url, drmConfig, headers, true);
            } else if (this.loadRetryCount >= this.maxRetries) {
                this.hideLoader();
                console.error("Failed to load stream after multiple attempts");
            }
        }, 15000);
        
        try {
            if (isDash) {
                console.log("Loading DASH stream");
                const player = await this.initShaka();
                if (!player) throw new Error("Shaka Player not loaded");
                
                if (drmConfig) {
                    const drmObj = {};
                    if (drmConfig.keys && Array.isArray(drmConfig.keys)) {
                        const clearKeys = {};
                        drmConfig.keys.forEach(key => {
                            if (key.kid && key.k) clearKeys[key.kid] = key.k;
                        });
                        drmObj.clearKeys = clearKeys;
                    } else if (typeof drmConfig === "object") {
                        const clearKeys = {};
                        for (const [kid, key] of Object.entries(drmConfig)) {
                            clearKeys[kid] = key;
                        }
                        drmObj.clearKeys = clearKeys;
                    }
                    await player.configure({ drm: drmObj });
                } else {
                    await player.configure({ drm: { clearKeys: {} } });
                }
                
                await player.load(url);
                
                setTimeout(() => {
                    if (this.videoPlayer && !this.videoPlayer.paused) {
                        this.videoPlayer.play().catch(e => console.warn("Play attempt:", e));
                    }
                }, 100);
                
                clearTimeout(loadTimeout);
                this.loadRetryCount = 0;
                this.hideLoader();
                return true;
            } 
            else if (isHls) {
                console.log("Loading HLS stream");
                if (Hls.isSupported()) {
                    return new Promise((resolve, reject) => {
                        let resolved = false;
                        let timeoutId = null;
                        
                        this.hlsPlayer = new Hls({
                            enableWorker: true,
                            lowLatencyMode: true,
                            autoStartLoad: true,
                            startPosition: -1,
                            manifestLoadTimeOut: 15000,
                            manifestLoadingTimeOut: 15000,
                            levelLoadingTimeOut: 15000,
                            fragLoadingTimeOut: 15000,
                            xhrSetup: (xhr, url) => {
                                if (headers && headers["User-Agent"]) {
                                    xhr.setRequestHeader("User-Agent", headers["User-Agent"]);
                                }
                            }
                        });
                        
                        this.hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
                            if (!resolved) {
                                resolved = true;
                                if (timeoutId) clearTimeout(timeoutId);
                                clearTimeout(loadTimeout);
                                this.videoPlayer.play()
                                    .then(() => {
                                        console.log("HLS playback started");
                                        this.loadRetryCount = 0;
                                        this.hideLoader();
                                        resolve(true);
                                    })
                                    .catch(e => {
                                        console.warn("Autoplay blocked:", e);
                                        this.loadRetryCount = 0;
                                        this.hideLoader();
                                        resolve(true);
                                    });
                            }
                        });
                        
                        this.hlsPlayer.on(Hls.Events.ERROR, (event, data) => {
                            console.error("HLS Error:", data);
                            if (data.fatal && !resolved) {
                                if (data.type === 'networkError' && !isRetry && this.loadRetryCount < this.maxRetries) {
                                    resolved = true;
                                    if (timeoutId) clearTimeout(timeoutId);
                                    clearTimeout(loadTimeout);
                                    this.loadRetryCount++;
                                    console.log(`Retrying HLS stream (${this.loadRetryCount}/${this.maxRetries})...`);
                                    this.updateLoaderMessage(`Network error, retrying (${this.loadRetryCount}/${this.maxRetries})...`);
                                    setTimeout(() => {
                                        this.loadStream(url, drmConfig, headers, true)
                                            .then(resolve)
                                            .catch(reject);
                                    }, 2000);
                                } else if (data.type !== 'networkError') {
                                    resolved = true;
                                    if (timeoutId) clearTimeout(timeoutId);
                                    clearTimeout(loadTimeout);
                                    this.hideLoader();
                                    reject(new Error(data.details || "HLS stream error"));
                                }
                            }
                        });
                        
                        timeoutId = setTimeout(() => {
                            if (!resolved) {
                                resolved = true;
                                clearTimeout(loadTimeout);
                                if (!isRetry && this.loadRetryCount < this.maxRetries) {
                                    this.loadRetryCount++;
                                    console.log(`Manifest timeout, retrying (${this.loadRetryCount}/${this.maxRetries})...`);
                                    this.updateLoaderMessage(`Loading timeout, retrying (${this.loadRetryCount}/${this.maxRetries})...`);
                                    this.loadStream(url, drmConfig, headers, true)
                                        .then(resolve)
                                        .catch(reject);
                                } else {
                                    console.warn("HLS manifest load timeout");
                                    this.hideLoader();
                                    reject(new Error("Stream load timeout"));
                                }
                            }
                        }, 10000);
                        
                        this.hlsPlayer.loadSource(url);
                        this.hlsPlayer.attachMedia(this.videoPlayer);
                    });
                } 
                else if (this.videoPlayer.canPlayType("application/vnd.apple.mpegurl")) {
                    this.videoPlayer.src = url;
                    await this.videoPlayer.play();
                    clearTimeout(loadTimeout);
                    this.loadRetryCount = 0;
                    this.hideLoader();
                    return true;
                } else {
                    throw new Error("HLS not supported in this browser");
                }
            }
            else {
                console.log("Loading direct stream (MP3/audio)");
                this.videoPlayer.src = url;
                await this.videoPlayer.play();
                clearTimeout(loadTimeout);
                this.loadRetryCount = 0;
                this.hideLoader();
                return true;
            }
        } catch (err) {
            clearTimeout(loadTimeout);
            console.error("loadStream error:", err);
            
            if (!isRetry && this.loadRetryCount < this.maxRetries) {
                this.loadRetryCount++;
                console.log(`Retrying after error (${this.loadRetryCount}/${this.maxRetries})...`);
                this.updateLoaderMessage(`Error, retrying (${this.loadRetryCount}/${this.maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.loadStream(url, drmConfig, headers, true);
            }
            
            this.hideLoader();
            console.error(`Cannot play stream: ${err.message || "unknown error"}`);
            return false;
        }
    }
    
    async playChannel(channel) {
        if (!channel || !channel.streamUrl) {
            console.error("Invalid channel: missing stream URL");
            return false;
        }
        
        // Hide slideshow when playing a channel
        this.hideSlideshow();
        
        // Check if this is an embedded content channel
        if (channel.isEmbed === true) {
            console.log("Loading embedded content:", channel.name);
            this.currentChannel = channel;
            
            // Hide custom fullscreen button for embedded content
            if (this.fullscreenBtn) {
                this.fullscreenBtn.style.display = 'none';
            }
            
            this.hideRadioLogo();
            
            if (this.videoPlayer) {
                this.videoPlayer.style.display = 'none';
            }
            
            await this.destroyPlayers();
            
            return await this.loadEmbeddedContent(channel.streamUrl, channel);
        }
        
        // For regular streams, restore custom fullscreen button
        if (this.fullscreenBtn) {
            this.fullscreenBtn.style.display = 'flex';
        }
        
        // For regular streams, remove iframe if present
        const existingIframe = this.videoContainer?.querySelector('.embed-iframe');
        if (existingIframe) {
            existingIframe.remove();
        }
        
        if (this.videoPlayer) {
            this.videoPlayer.style.display = '';
        }
        
        if (this.isLoading) {
            console.log("Already loading a channel, waiting...");
            await new Promise(resolve => {
                const checkLoad = setInterval(() => {
                    if (!this.isLoading) {
                        clearInterval(checkLoad);
                        resolve();
                    }
                }, 100);
                setTimeout(() => {
                    clearInterval(checkLoad);
                    resolve();
                }, 3000);
            });
        }
        
        this.isLoading = true;
        this.loadRetryCount = 0;
        
        this.showLoader("Loading channel...");
        
        // Show or hide radio logo based on channel type
        if (channel.type === "Radio") {
            this.showRadioLogo(channel);
        } else {
            this.hideRadioLogo();
        }
        
        try {
            console.log("Switching to channel:", channel.name);
            this.currentChannel = channel;
            
            if (this.drmNoticeSpan) {
                this.drmNoticeSpan.innerHTML = '';
            }
            
            let drmConfig = null;
            let headers = null;
            if (channel.drm) drmConfig = channel.drm;
            if (channel.headers) headers = channel.headers;
            
            const success = await this.loadStream(channel.streamUrl, drmConfig, headers);
            
            if (success) {
                window.activeChannelId = channel.id;
                console.log("Channel playing successfully:", channel.name);
                
                if (window.sidebarComponent) {
                    window.sidebarComponent.updateActiveChannel(channel.id);
                }
            } else {
                console.error("Failed to play channel:", channel.name);
                this.hideRadioLogo();
                // Show slideshow if playback fails
                this.showSlideshow();
            }
            
            return success;
        } catch (error) {
            console.error("Error in playChannel:", error);
            this.hideRadioLogo();
            this.hideLoader();
            // Show slideshow on error
            this.showSlideshow();
            return false;
        } finally {
            setTimeout(() => {
                this.isLoading = false;
            }, 500);
        }
    }
    
    updateModeUI(mode) {
        if (this.videoContainer) {
            if (mode === "tv") {
                this.videoContainer.style.background = "#000";
                this.hideRadioLogo();
                // Show slideshow when switching to TV mode without a playing channel
                if (!this.currentChannel) {
                    this.showSlideshow();
                }
            } else {
                this.videoContainer.style.background = "linear-gradient(135deg, #1a1f2e 0%, #0f1222 100%)";
                if (this.currentChannel && this.currentChannel.type === "Radio") {
                    this.showRadioLogo(this.currentChannel);
                } else if (!this.currentChannel) {
                    this.showSlideshow();
                }
            }
        }
    }
    
    // Method to set custom slideshow images
    setSlideshowImages(images) {
        if (images && Array.isArray(images)) {
            this.slideshowImages = images;
            this.renderSlideshow();
            this.startSlideshow();
        }
    }
    
    // Method to add a slide
    addSlide(image, title, channelName) {
        this.slideshowImages.push({
            image: image,
            title: title,
            channelName: channelName
        });
        this.renderSlideshow();
        this.startSlideshow();
    }
}

window.PlayerComponent = PlayerComponent;
