// ======================== SIDEBAR COMPONENT ========================

class SidebarComponent {
    constructor() {
        this.container = document.getElementById("channelSidebar");
        this.channelListDiv = null;
        this.searchInput = null;
        this.searchContainer = null;
        this.activeFilter = "all";
        this.selectedCategory = null;
        this.categories = [];
        this.dropdownOpen = false;
        this.searchOpen = false;
        this.scrollToTopBtn = null;
        this.paddingObserver = null;
    }
    
    hideAddressBar() {
        window.scrollTo(0, 1);
        if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
            setTimeout(() => {
                window.scrollTo(0, 1);
            }, 50);
        }
    }
    
    ensureChannelListPadding() {
        if (!this.channelListDiv) return;
        
        const buttonHeight = this.scrollToTopBtn ? this.scrollToTopBtn.offsetHeight : 44;
        const safeAreaBottom = window.innerHeight - document.documentElement.clientHeight;
        const extraPadding = Math.max(20, safeAreaBottom + 10);
        this.channelListDiv.style.paddingBottom = `${buttonHeight + extraPadding}px`;
    }
    
    setupChannelListPadding() {
        if (!this.channelListDiv) return;
        
        this.ensureChannelListPadding();
        
        if (this.paddingObserver) {
            this.paddingObserver.disconnect();
        }
        
        this.paddingObserver = new MutationObserver(() => {
            this.ensureChannelListPadding();
        });
        
        this.paddingObserver.observe(this.channelListDiv, {
            childList: true,
            subtree: true,
            attributes: true
        });
        
        window.addEventListener('resize', () => {
            setTimeout(() => this.ensureChannelListPadding(), 100);
        });
        
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.ensureChannelListPadding(), 100);
        });
    }
    
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="sidebar-header">
                <div class="filter-row">
                    <button class="filter-btn active" data-filter="all">All</button>
                    <div class="categories-dropdown">
                        <button class="dropdown-btn" id="categoriesDropdownBtn">
                            Categories <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="dropdown-menu" id="categoriesDropdownMenu">
                            <div class="dropdown-item" data-cat="all">All Categories</div>
                        </div>
                    </div>
                    <button class="favorites-btn" id="favoritesBtn">
                        <i class="far fa-star"></i> Favorites
                    </button>
                    <button class="search-icon-btn" id="searchIconBtn">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
                
                <div class="search-input-container" id="searchInputContainer">
                    <div class="search-input-wrapper">
                        <i class="fas fa-search"></i>
                        <input type="text" class="search-input-field" id="searchInput" placeholder="Search channels...">
                    </div>
                </div>
            </div>
            <div class="channel-list" id="channelList">
                <div class="loading-spinner"><i class="fas fa-spinner fa-pulse"></i> Loading channels...</div>
            </div>
        `;
        
        this.channelListDiv = document.getElementById("channelList");
        this.searchInput = document.getElementById("searchInput");
        this.searchContainer = document.getElementById("searchInputContainer");
        
        this.attachEvents();
        this.createScrollToTopButton();
        this.setupChannelListPadding();
    }
    
    createScrollToTopButton() {
        const existingBtn = document.getElementById('scrollToTopBtn');
        if (existingBtn) existingBtn.remove();
        
        this.scrollToTopBtn = document.createElement('button');
        this.scrollToTopBtn.id = 'scrollToTopBtn';
        this.scrollToTopBtn.className = 'scroll-to-top';
        this.scrollToTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        this.scrollToTopBtn.title = 'Scroll to top';
        
        if (this.container) {
            this.container.style.position = 'relative';
            this.container.appendChild(this.scrollToTopBtn);
        }
        
        this.scrollToTopBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideAddressBar();
            this.scrollToTop();
        });
        
        if (this.channelListDiv) {
            this.channelListDiv.addEventListener('scroll', () => {
                this.hideAddressBar();
                this.toggleScrollToTopButton();
            });
        }
        
        const updatePosition = () => {
            setTimeout(() => {
                if (this.scrollToTopBtn && this.scrollToTopBtn.classList.contains('show')) {
                    this.ensureChannelListPadding();
                }
            }, 50);
        };
        
        window.addEventListener('orientationchange', updatePosition);
        window.addEventListener('resize', updatePosition);
        document.addEventListener('fullscreenchange', updatePosition);
        document.addEventListener('webkitfullscreenchange', updatePosition);
        
        setTimeout(() => this.toggleScrollToTopButton(), 100);
    }
    
    toggleScrollToTopButton() {
        if (!this.scrollToTopBtn || !this.channelListDiv) return;
        
        const scrollTop = this.channelListDiv.scrollTop;
        const isScrolled = scrollTop > 100;
        
        if (isScrolled) {
            this.scrollToTopBtn.classList.add('show');
            this.scrollToTopBtn.style.zIndex = '1000';
            this.ensureChannelListPadding();
        } else {
            this.scrollToTopBtn.classList.remove('show');
        }
    }
    
    scrollToTop() {
        if (!this.channelListDiv) return;
        
        this.channelListDiv.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        if (this.scrollToTopBtn) {
            this.scrollToTopBtn.style.transform = 'scale(0.9)';
            setTimeout(() => {
                if (this.scrollToTopBtn) {
                    this.scrollToTopBtn.style.transform = '';
                }
            }, 200);
        }
        
        if (this.container && this.container.scrollTop > 0) {
            this.container.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    }
    
    attachEvents() {
        const allBtn = document.querySelector(".filter-btn[data-filter='all']");
        if (allBtn) {
            allBtn.addEventListener("click", () => {
                this.hideAddressBar();
                this.setActiveFilter("all");
                this.closeSearch();
                setTimeout(() => this.scrollToTop(), 100);
            });
        }
        
        const favoritesBtn = document.getElementById("favoritesBtn");
        if (favoritesBtn) {
            favoritesBtn.addEventListener("click", () => {
                this.hideAddressBar();
                this.setActiveFilter("favorites");
                this.closeSearch();
                setTimeout(() => this.scrollToTop(), 100);
            });
        }
        
        const searchIconBtn = document.getElementById("searchIconBtn");
        if (searchIconBtn) {
            searchIconBtn.addEventListener("click", (e) => {
                this.hideAddressBar();
                e.stopPropagation();
                if (this.activeFilter === "search") {
                    this.setActiveFilter("all");
                    this.closeSearch();
                } else {
                    this.setActiveFilter("search");
                    this.openSearch();
                }
                setTimeout(() => this.scrollToTop(), 100);
            });
        }
        
        const dropdownBtn = document.getElementById("categoriesDropdownBtn");
        const dropdownMenu = document.getElementById("categoriesDropdownMenu");
        
        if (dropdownBtn) {
            dropdownBtn.addEventListener("click", (e) => {
                this.hideAddressBar();
                e.stopPropagation();
                if (this.activeFilter !== "category") {
                    this.setActiveFilter("category");
                    this.closeSearch();
                }
                this.dropdownOpen = !this.dropdownOpen;
                dropdownBtn.classList.toggle("open");
                dropdownMenu.classList.toggle("show");
            });
        }
        
        document.addEventListener("click", (e) => {
            if (dropdownBtn && !dropdownBtn.contains(e.target) && 
                dropdownMenu && !dropdownMenu.contains(e.target)) {
                this.dropdownOpen = false;
                dropdownBtn.classList.remove("open");
                dropdownMenu.classList.remove("show");
            }
        });
        
        if (this.searchInput) {
            this.searchInput.addEventListener("input", (e) => {
                this.hideAddressBar();
                window.searchQuery = e.target.value;
                if (typeof window.onSearchChange === "function") {
                    window.onSearchChange();
                }
                setTimeout(() => this.scrollToTop(), 100);
            });
            
            this.searchInput.addEventListener("keyup", (e) => {
                if (e.key === "Escape") {
                    this.hideAddressBar();
                    this.setActiveFilter("all");
                    this.closeSearch();
                }
            });
            
            this.searchInput.addEventListener("focus", () => {
                this.hideAddressBar();
            });
        }
    }
    
    openSearch() {
        this.searchOpen = true;
        this.searchContainer.classList.add("show");
        const searchIconBtn = document.getElementById("searchIconBtn");
        if (searchIconBtn) searchIconBtn.classList.add("active");
        setTimeout(() => {
            if (this.searchInput) {
                this.searchInput.focus();
                this.hideAddressBar();
            }
        }, 100);
        
        if (this.searchInput) {
            this.searchInput.value = "";
            window.searchQuery = "";
        }
        
        if (typeof window.onFilterChange === "function") {
            window.onFilterChange();
        }
    }
    
    closeSearch() {
        this.searchOpen = false;
        this.searchContainer.classList.remove("show");
        const searchIconBtn = document.getElementById("searchIconBtn");
        if (searchIconBtn) searchIconBtn.classList.remove("active");
        if (this.searchInput) {
            this.searchInput.value = "";
            window.searchQuery = "";
            if (typeof window.onSearchChange === "function") {
                window.onSearchChange();
            }
        }
    }
    
    setActiveFilter(filter) {
        this.activeFilter = filter;
        
        if (filter === "all") {
            this.selectedCategory = null;
            window.currentCategory = "all";
            const dropdownBtn = document.getElementById("categoriesDropdownBtn");
            const dropdownMenu = document.getElementById("categoriesDropdownMenu");
            if (dropdownBtn) dropdownBtn.classList.remove("open");
            if (dropdownMenu) dropdownMenu.classList.remove("show");
            this.dropdownOpen = false;
        } else if (filter === "category") {
            if (!this.selectedCategory) {
                this.selectedCategory = "all";
                window.currentCategory = "all";
            }
        } else if (filter === "favorites") {
            this.selectedCategory = null;
            window.currentCategory = "all";
            const dropdownBtn = document.getElementById("categoriesDropdownBtn");
            const dropdownMenu = document.getElementById("categoriesDropdownMenu");
            if (dropdownBtn) dropdownBtn.classList.remove("open");
            if (dropdownMenu) dropdownMenu.classList.remove("show");
            this.dropdownOpen = false;
        } else if (filter === "search") {
            this.selectedCategory = null;
            window.currentCategory = "all";
            const dropdownBtn = document.getElementById("categoriesDropdownBtn");
            const dropdownMenu = document.getElementById("categoriesDropdownMenu");
            if (dropdownBtn) dropdownBtn.classList.remove("open");
            if (dropdownMenu) dropdownMenu.classList.remove("show");
            this.dropdownOpen = false;
        }
        
        this.updateFilterUI();
        
        if (typeof window.onFilterChange === "function") {
            window.onFilterChange();
        }
    }
    
    updateFilterUI() {
        const allBtn = document.querySelector(".filter-btn[data-filter='all']");
        if (allBtn) {
            if (this.activeFilter === "all") {
                allBtn.classList.add("active");
            } else {
                allBtn.classList.remove("active");
            }
        }
        
        const dropdownBtn = document.getElementById("categoriesDropdownBtn");
        if (dropdownBtn) {
            if (this.activeFilter === "category") {
                dropdownBtn.classList.add("active");
            } else {
                dropdownBtn.classList.remove("active");
            }
        }
        
        const favoritesBtn = document.getElementById("favoritesBtn");
        if (favoritesBtn) {
            if (this.activeFilter === "favorites") {
                favoritesBtn.classList.add("active");
                favoritesBtn.innerHTML = '<i class="fas fa-star"></i> Favorites';
            } else {
                favoritesBtn.classList.remove("active");
                favoritesBtn.innerHTML = '<i class="far fa-star"></i> Favorites';
            }
        }
        
        const searchIconBtn = document.getElementById("searchIconBtn");
        if (searchIconBtn) {
            if (this.activeFilter === "search") {
                searchIconBtn.classList.add("active");
            } else {
                searchIconBtn.classList.remove("active");
            }
        }
    }
    
    updateCategoriesDropdown() {
        const dropdownMenu = document.getElementById("categoriesDropdownMenu");
        if (!dropdownMenu) return;
        
        let categoriesSet = new Set();
        let tempChannels = [...window.channelsData];
        
        // Filter by current mode (TV, Radio, or Movies)
        if (window.currentMode === "tv") {
            tempChannels = tempChannels.filter(ch => ch.type === "TV");
        } else if (window.currentMode === "radio") {
            tempChannels = tempChannels.filter(ch => ch.type === "Radio");
        } else if (window.currentMode === "movies") {
            tempChannels = tempChannels.filter(ch => ch.type === "Movies");
        }
        
        tempChannels.forEach(ch => {
            if (ch.category) categoriesSet.add(ch.category);
        });
        
        this.categories = Array.from(categoriesSet).sort();
        
        let itemsHtml = `<div class="dropdown-item ${this.selectedCategory === "all" ? 'active' : ''}" data-cat="all">All Categories</div>`;
        this.categories.forEach(cat => {
            itemsHtml += `<div class="dropdown-item ${this.selectedCategory === cat ? 'active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</div>`;
        });
        dropdownMenu.innerHTML = itemsHtml;
        
        dropdownMenu.querySelectorAll(".dropdown-item").forEach(item => {
            item.addEventListener("click", () => {
                this.hideAddressBar();
                const cat = item.dataset.cat;
                this.selectedCategory = cat;
                window.currentCategory = cat;
                
                dropdownMenu.querySelectorAll(".dropdown-item").forEach(i => i.classList.remove("active"));
                item.classList.add("active");
                
                const dropdownBtn = document.getElementById("categoriesDropdownBtn");
                const dropdownMenuEl = document.getElementById("categoriesDropdownMenu");
                if (dropdownBtn) dropdownBtn.classList.remove("open");
                if (dropdownMenuEl) dropdownMenuEl.classList.remove("show");
                this.dropdownOpen = false;
                
                if (this.activeFilter !== "category") {
                    this.setActiveFilter("category");
                } else {
                    if (typeof window.onCategoryChange === "function") {
                        window.onCategoryChange();
                    }
                }
                setTimeout(() => this.scrollToTop(), 100);
            });
        });
    }
    
    getChannelLogo(channel) {
        if (channel.logo) {
            return channel.logo;
        }
        if (channel.logoLocal) {
            return `images/${channel.logoLocal}.webp`;
        }
        return null;
    }
    
    renderChannelList() {
        if (!this.channelListDiv) return;
        
        let tempChannels = [...window.channelsData];
        
        // Filter by mode (TV, Radio, or Movies)
        if (window.currentMode === "tv") {
            tempChannels = tempChannels.filter(ch => ch.type === "TV");
        } else if (window.currentMode === "radio") {
            tempChannels = tempChannels.filter(ch => ch.type === "Radio");
        } else if (window.currentMode === "movies") {
            tempChannels = tempChannels.filter(ch => ch.type === "Movies");
        }
        
        // Apply filters
        if (this.activeFilter === "favorites") {
            tempChannels = tempChannels.filter(ch => isFavorite(ch.id));
        } else if (this.activeFilter === "category" && this.selectedCategory && this.selectedCategory !== "all") {
            tempChannels = tempChannels.filter(ch => ch.category === this.selectedCategory);
        } else if (this.activeFilter === "search") {
            if (window.searchQuery.trim() !== "") {
                const q = window.searchQuery.trim().toLowerCase();
                tempChannels = tempChannels.filter(ch => ch.name.toLowerCase().includes(q));
            }
        }
        
        // Apply search query if not in search mode
        if (this.activeFilter !== "search" && window.searchQuery.trim() !== "") {
            const q = window.searchQuery.trim().toLowerCase();
            tempChannels = tempChannels.filter(ch => ch.name.toLowerCase().includes(q));
        }
        
        window.filteredChannels = tempChannels;
        
        if (window.filteredChannels.length === 0) {
            let emptyMessage = "No ";
            if (this.activeFilter === "favorites") {
                emptyMessage += "favorite ";
            } else if (this.activeFilter === "category" && this.selectedCategory && this.selectedCategory !== "all") {
                emptyMessage += `${this.selectedCategory} `;
            } else if (this.activeFilter === "search" && window.searchQuery) {
                emptyMessage += `"${window.searchQuery}" `;
            }
            
            if (window.currentMode === "tv") {
                emptyMessage += "TV channels found";
            } else if (window.currentMode === "radio") {
                emptyMessage += "radio stations found";
            } else if (window.currentMode === "movies") {
                emptyMessage += "movies found";
            } else {
                emptyMessage += "channels found";
            }
            
            this.channelListDiv.innerHTML = `
                <div class="empty-state">
                    <i class="fas ${this.activeFilter === 'favorites' ? 'fa-star' : 
                                   window.currentMode === 'movies' ? 'fa-film' : 'fa-tv'}"></i>
                    <p>${emptyMessage}</p>
                </div>
            `;
            return;
        }
        
        let html = "";
        window.filteredChannels.forEach((channel) => {
            const isActive = (window.activeChannelId === channel.id);
            const displayName = channel.name.length > 30 ? channel.name.slice(0, 28) + ".." : channel.name;
            const favIcon = isFavorite(channel.id) ? 'fas fa-star' : 'far fa-star';
            
            const isMovie = channel.type === "Movies";
            const logoUrl = this.getChannelLogo(channel);
            
            let logoHtml;
            if (logoUrl) {
                logoHtml = `<img class="channel-logo-img" src="${logoUrl}" alt="${escapeHtml(channel.name)}" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'channel-logo\'><i class=\'fas ${isMovie ? 'fa-film' : 'fa-tv'}\'></i></div>'">`;
            } else if (isMovie) {
                logoHtml = `<div class="channel-logo movie-logo"><i class="fas fa-film"></i></div>`;
            } else if (channel.type === "Radio") {
                logoHtml = `<div class="channel-logo radio-logo"><i class="fas fa-headphones"></i></div>`;
            } else {
                logoHtml = `<div class="channel-logo">${escapeHtml(channel.name.charAt(0).toUpperCase())}</div>`;
            }
            
            html += `
                <div class="channel-item ${isActive ? 'active' : ''}" data-id="${channel.id}" data-channel-name="${escapeHtml(channel.name)}">
                    <div class="channel-logo-wrapper">
                        ${logoHtml}
                    </div>
                    <div class="channel-info-side">
                        <div class="channel-name">${escapeHtml(displayName)}</div>
                        <div class="channel-category">${escapeHtml(channel.category || (channel.type === "Movies" ? "Movies" : "General"))}</div>
                    </div>
                    <div class="channel-favorite">
                        <i class="${favIcon} favorite-icon" data-id="${channel.id}"></i>
                    </div>
                </div>
            `;
        });
        this.channelListDiv.innerHTML = html;
        
        // Attach channel selection
        document.querySelectorAll(".channel-item").forEach(el => {
            el.addEventListener("click", (e) => {
                this.hideAddressBar();
                
                if (e.target.classList && e.target.classList.contains("favorite-icon")) {
                    return;
                }
                
                const channelId = parseInt(el.dataset.id);
                const channel = window.channelsData.find(c => c.id === channelId);
                
                if (channel) {
                    console.log("Channel clicked:", channel.name);
                    
                    document.querySelectorAll(".channel-item").forEach(item => {
                        item.classList.remove("active");
                    });
                    
                    el.classList.add("active");
                    
                    if (typeof window.onChannelSelect === "function") {
                        window.onChannelSelect(channel);
                    }
                }
            });
        });
        
        // Attach favorite toggle events
        document.querySelectorAll(".favorite-icon").forEach(icon => {
            icon.addEventListener("click", (e) => {
                this.hideAddressBar();
                e.stopPropagation();
                const channelId = parseInt(icon.dataset.id);
                const added = toggleFavorite(channelId);
                if (added) {
                    icon.className = "fas fa-star favorite-icon";
                } else {
                    icon.className = "far fa-star favorite-icon";
                }
                if (this.activeFilter === "favorites") {
                    this.renderChannelList();
                }
            });
        });
        
        if (this.channelListDiv) {
            this.channelListDiv.scrollTop = 0;
        }
        
        setTimeout(() => {
            this.toggleScrollToTopButton();
            this.ensureChannelListPadding();
        }, 50);
    }
    
    updateActiveChannel(channelId) {
        window.activeChannelId = channelId;
        document.querySelectorAll(".channel-item").forEach(el => {
            const id = parseInt(el.dataset.id);
            if (id === channelId) {
                el.classList.add("active");
            } else {
                el.classList.remove("active");
            }
        });
    }
    
    resetFilters() {
        this.setActiveFilter("all");
        this.selectedCategory = "all";
        window.currentCategory = "all";
        window.searchQuery = "";
        if (this.searchInput) {
            this.searchInput.value = "";
        }
        this.closeSearch();
        this.updateCategoriesDropdown();
        this.renderChannelList();
        setTimeout(() => this.scrollToTop(), 100);
    }
    
    getActiveFilter() {
        return this.activeFilter;
    }
    
    getSelectedCategory() {
        return this.selectedCategory;
    }
}

window.SidebarComponent = SidebarComponent;
