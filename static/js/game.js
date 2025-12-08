/**
 * Infinite Adventure - Game Client
 * Handles UI interactions and API communication
 */

class InfiniteAdventure {
    constructor() {
        this.sessionId = null;
        this.isLoading = false;
        this.currentState = null;
        this.selectedCharacter = null;
        this.selectedWorld = null;

        // DOM Elements
        this.elements = {
            // Screens
            titleScreen: document.getElementById('title-screen'),
            setupScreen: document.getElementById('setup-screen'),
            gameScreen: document.getElementById('game-screen'),
            gameoverScreen: document.getElementById('gameover-screen'),
            victoryScreen: document.getElementById('victory-screen'),

            // Title screen
            playerNameInput: document.getElementById('player-name'),
            beginBtn: document.getElementById('begin-btn'),

            // Setup screen
            characterOptions: document.getElementById('character-options'),
            worldOptions: document.getElementById('world-options'),
            enterWorldBtn: document.getElementById('enter-world-btn'),

            // Game screen
            displayName: document.getElementById('display-name'),
            turnNum: document.getElementById('turn-num'),
            healthOrbs: document.getElementById('health-orbs'),
            healthText: document.getElementById('health-text'),
            phaseName: document.getElementById('phase-name'),
            clueCount: document.getElementById('clue-count'),
            narrativeScroll: document.getElementById('narrative-scroll'),
            atmosphericHint: document.getElementById('atmospheric-hint'),
            inventoryPanel: document.getElementById('inventory-panel'),
            inventoryToggle: document.getElementById('inventory-toggle'),
            inventoryList: document.getElementById('inventory-list'),
            playerInput: document.getElementById('player-input'),
            submitBtn: document.getElementById('submit-btn'),
            loadingIndicator: document.getElementById('loading-indicator'),

            // Game over screen
            gameoverTitle: document.getElementById('gameover-title'),
            gameoverSubtitle: document.getElementById('gameover-subtitle'),
            finalNarrative: document.getElementById('final-narrative'),
            finalTurns: document.getElementById('final-turns'),
            finalClues: document.getElementById('final-clues'),
            restartBtn: document.getElementById('restart-btn'),

            // Victory screen
            victoryNarrative: document.getElementById('victory-narrative'),
            victoryTurns: document.getElementById('victory-turns'),
            victoryClues: document.getElementById('victory-clues'),
            newGameBtn: document.getElementById('new-game-btn'),

            // Particles container
            particles: document.getElementById('particles')
        };

        this.init();
    }

    init() {
        this.bindEvents();
        this.createParticles();
        this.focusNameInput();
        this.handleMobileViewport();
    }

    // Handle mobile viewport height issues (iOS Safari address bar)
    handleMobileViewport() {
        const setVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        setVH();
        window.addEventListener('resize', setVH);
        window.addEventListener('orientationchange', () => {
            setTimeout(setVH, 100);
        });
    }

    bindEvents() {
        // Title screen
        this.elements.beginBtn.addEventListener('click', () => this.initiateSetup());
        this.elements.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.initiateSetup();
        });

        // Setup screen
        this.elements.enterWorldBtn.addEventListener('click', () => this.enterWorld());

        // Game screen
        this.elements.submitBtn.addEventListener('click', () => this.submitAction());
        this.elements.playerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isLoading) this.submitAction();
        });
        this.elements.inventoryToggle.addEventListener('click', () => this.toggleInventory());

        // End screens
        this.elements.restartBtn.addEventListener('click', () => this.resetToTitle());
        this.elements.newGameBtn.addEventListener('click', () => this.resetToTitle());
    }

    createParticles() {
        const container = this.elements.particles;
        if (!container) return;

        // Reduce particles on mobile for performance
        const isMobile = window.innerWidth < 600;
        const particleCount = isMobile ? 8 : 20;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.animationDelay = `${Math.random() * 20}s`;
            particle.style.animationDuration = `${15 + Math.random() * 10}s`;
            container.appendChild(particle);
        }
    }

    focusNameInput() {
        // Don't auto-focus on mobile to prevent keyboard from opening
        if (window.innerWidth >= 600 && this.elements.playerNameInput) {
            setTimeout(() => this.elements.playerNameInput.focus(), 100);
        }
    }

    // Screen Management
    showScreen(screenId) {
        const screens = ['title-screen', 'setup-screen', 'game-screen', 'gameover-screen', 'victory-screen'];
        screens.forEach(id => {
            const screen = document.getElementById(id);
            if (screen) screen.classList.toggle('active', id === screenId);
        });
    }

    // Game Flow

    // Step 1: Request Options
    async initiateSetup() {
        const playerName = this.elements.playerNameInput.value.trim() || 'Wanderer';
        this.setLoading(true);
        this.elements.beginBtn.classList.add('loading');
        this.elements.beginBtn.disabled = true;

        try {
            const response = await fetch('/api/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_name: playerName })
            });

            const data = await response.json();
            if (data.success) {
                this.renderSetupOptions(data.options);
                this.showScreen('setup-screen');
            } else {
                this.showError(data.error || 'Failed to generate options');
            }
        } catch (error) {
            console.error('Setup error:', error);
            this.showError('Connection failed.');
        } finally {
            this.setLoading(false);
            this.elements.beginBtn.classList.remove('loading');
            this.elements.beginBtn.disabled = false;
        }
    }

    renderSetupOptions(options) {
        // Render Characters
        const charContainer = this.elements.characterOptions;
        charContainer.innerHTML = '';
        options.characters.forEach((char, index) => {
            const card = document.createElement('div');
            card.className = 'setup-card';
            card.innerHTML = `
                <div class="card-header">${char.class}</div>
                <div class="card-body">
                    <p><strong>Traits:</strong> ${char.traits.join(', ')}</p>
                    <p class="card-desc">${char.background.substring(0, 100)}...</p>
                </div>
            `;
            card.addEventListener('click', () => this.selectCharacter(card, char));
            charContainer.appendChild(card);
        });

        // Render Worlds
        const worldContainer = this.elements.worldOptions;
        worldContainer.innerHTML = '';
        options.worlds.forEach((world, index) => {
            const card = document.createElement('div');
            card.className = 'setup-card';
            card.innerHTML = `
                <div class="card-header">${world.theme}</div>
                <div class="card-body">
                    <p><strong>Tone:</strong> ${world.tone}</p>
                    <p class="card-desc">${world.setting}</p>
                </div>
            `;
            card.addEventListener('click', () => this.selectWorld(card, world));
            worldContainer.appendChild(card);
        });
    }

    selectCharacter(card, data) {
        this.selectedCharacter = data;
        this.elements.characterOptions.querySelectorAll('.setup-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.checkReady();
    }

    selectWorld(card, data) {
        this.selectedWorld = data;
        this.elements.worldOptions.querySelectorAll('.setup-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.checkReady();
    }

    checkReady() {
        this.elements.enterWorldBtn.disabled = !(this.selectedCharacter && this.selectedWorld);
    }

    // Step 2: Start Game with selections
    async enterWorld() {
        if (!this.selectedCharacter || !this.selectedWorld) return;

        const playerName = this.elements.playerNameInput.value.trim() || 'Wanderer';
        this.setLoading(true);
        this.elements.enterWorldBtn.classList.add('loading');
        this.elements.enterWorldBtn.disabled = true;

        try {
            const response = await fetch('/api/new-game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player_name: playerName,
                    character: this.selectedCharacter,
                    world: this.selectedWorld
                })
            });
            // ... (rest is similar to old startNewGame)
            const data = await response.json();

            if (data.success) {
                this.sessionId = data.session_id;
                this.currentState = data.state;

                // Update UI
                this.elements.displayName.textContent = playerName;
                this.elements.narrativeScroll.innerHTML = '';

                // Add opening narrative
                this.addNarrativeEntry(data.narrative, 'narrator');

                // Update state display
                this.updateStateDisplay(data.state);

                // Switch to game screen
                this.showScreen('game-screen');

                // Enable input
                this.enableInput();

                // Focus input
                setTimeout(() => this.elements.playerInput.focus(), 600);
            } else {
                this.showError(data.error || 'Failed to start game');
            }

        } catch (error) {
            console.error('Enter world error:', error);
            this.showError('Failed to enter world.');
        } finally {
            this.setLoading(false);
            this.elements.enterWorldBtn.classList.remove('loading');
            this.elements.enterWorldBtn.disabled = false;
        }
    }


    async submitAction() {
        const action = this.elements.playerInput.value.trim();
        if (!action || this.isLoading || !this.sessionId) return;

        // Clear input
        this.elements.playerInput.value = '';

        // Add player action to narrative
        this.addNarrativeEntry(action, 'player');

        this.setLoading(true);
        this.disableInput();
        this.showTypingIndicator(); // Show indicator

        try {
            const response = await fetch('/api/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    action: action
                })
            });

            const data = await response.json();

            this.hideTypingIndicator(); // Hide indicator

            if (data.success) {
                // Check for health changes to animate
                const oldHealth = this.currentState?.health || 3;
                const newHealth = data.state.health;

                // Add narrator response
                this.addNarrativeEntry(data.narrative, 'narrator', {
                    clueFound: data.clue_found,
                    clueDescription: data.clue_description,
                    itemGained: data.item_gained,
                    itemLost: data.item_lost,
                    healthChange: newHealth - oldHealth
                });

                // Update state with animation
                this.currentState = data.state;
                this.updateStateDisplay(data.state, oldHealth !== newHealth);

                // Show atmospheric hint
                if (data.atmospheric_hint) {
                    this.showAtmosphericHint(data.atmospheric_hint);
                }

                // Check for game end
                if (data.game_ended) {
                    setTimeout(() => {
                        if (data.state.status === 'VICTORY') {
                            this.showVictory(data.narrative, data.state);
                        } else {
                            this.showGameOver(data.narrative, data.state);
                        }
                    }, 2000);
                } else {
                    this.enableInput();
                }
            } else {
                this.showError(data.error || 'Action failed');
                this.enableInput();
            }
        } catch (error) {
            console.error('Action error:', error);
            this.hideTypingIndicator();
            this.showError('Connection lost. Please try again.');
            this.enableInput();
        } finally {
            this.setLoading(false);
        }
    }

    showTypingIndicator() {
        const existing = document.getElementById('typing-indicator');
        if (existing) return;

        const indicator = document.createElement('div');
        indicator.id = 'typing-indicator';
        indicator.className = 'typing-indicator';
        indicator.innerHTML = `
            <span>The narrator is writing</span>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        this.elements.narrativeScroll.appendChild(indicator);
        // Scroll to bottom
        const scrollWrapper = this.elements.narrativeScroll.parentElement;
        setTimeout(() => {
            scrollWrapper.scrollTop = scrollWrapper.scrollHeight;
        }, 100);
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // ==========================================================================
    // UI Updates
    // ==========================================================================

    addNarrativeEntry(text, type, events = {}) {
        const entry = document.createElement('div');
        entry.className = `narrative-entry ${type}`;

        if (type === 'narrator') {
            // Parse paragraphs
            const paragraphs = text.split('\n\n').filter(p => p.trim());
            paragraphs.forEach(p => {
                const para = document.createElement('p');
                para.textContent = p.trim();
                entry.appendChild(para);
            });

            // Add event notifications
            if (events.clueFound) {
                const notification = document.createElement('div');
                notification.className = 'event-notification clue';
                notification.textContent = `Clue Discovered: ${events.clueDescription || 'A piece of the puzzle'}`;
                entry.appendChild(notification);
            }

            if (events.itemGained) {
                const notification = document.createElement('div');
                notification.className = 'event-notification item';
                notification.textContent = `Acquired: ${events.itemGained}`;
                entry.appendChild(notification);
            }

            if (events.healthChange < 0) {
                const notification = document.createElement('div');
                notification.className = 'event-notification damage';
                notification.textContent = `Wounded! (${events.healthChange} health)`;
                entry.appendChild(notification);
            }
        } else {
            entry.textContent = text;
        }

        this.elements.narrativeScroll.appendChild(entry);

        // Scroll to bottom
        const scrollWrapper = this.elements.narrativeScroll.parentElement;
        setTimeout(() => {
            scrollWrapper.scrollTop = scrollWrapper.scrollHeight;
        }, 100);
    }

    updateStateDisplay(state, animateHealth = false) {
        // Turn counter
        this.elements.turnNum.textContent = state.turn;

        // Health orbs
        const orbs = this.elements.healthOrbs.querySelectorAll('.orb');
        orbs.forEach((orb, index) => {
            const wasFilled = orb.classList.contains('filled');
            const shouldBeFilled = index < state.health;

            if (wasFilled && !shouldBeFilled && animateHealth) {
                orb.classList.add('draining');
                setTimeout(() => {
                    orb.classList.remove('filled', 'draining');
                }, 500);
            } else {
                orb.classList.toggle('filled', shouldBeFilled);
            }
        });

        // Health text
        this.elements.healthText.textContent = state.health_desc || this.getHealthText(state.health);

        // Phase
        this.elements.phaseName.textContent = state.phase;

        // Clues
        this.elements.clueCount.textContent = state.clues;

        // Inventory
        this.updateInventory(state.inventory);
    }

    getHealthText(health) {
        const texts = {
            3: 'Healthy',
            2: 'Wounded',
            1: 'Critical',
            0: 'Dead'
        };
        return texts[health] || 'Unknown';
    }

    updateInventory(items) {
        const list = this.elements.inventoryList;
        list.innerHTML = '';

        if (!items || items.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'empty-inventory';
            emptyItem.textContent = 'Your pockets are empty';
            list.appendChild(emptyItem);
        } else {
            items.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                list.appendChild(li);
            });
        }
    }

    showAtmosphericHint(hint) {
        const el = this.elements.atmosphericHint;
        el.textContent = hint;
        el.classList.remove('hidden');

        setTimeout(() => {
            el.classList.add('hidden');
        }, 4000);
    }

    toggleInventory() {
        this.elements.inventoryPanel.classList.toggle('expanded');
    }

    // ==========================================================================
    // End Game Screens
    // ==========================================================================

    showGameOver(narrative, state) {
        this.elements.finalNarrative.innerHTML = '';
        const paragraphs = narrative.split('\n\n').filter(p => p.trim());
        paragraphs.forEach(p => {
            const para = document.createElement('p');
            para.textContent = p.trim();
            this.elements.finalNarrative.appendChild(para);
        });

        this.elements.finalTurns.textContent = state.turn;
        this.elements.finalClues.textContent = state.clues;

        this.showScreen('gameover-screen');
    }

    showVictory(narrative, state) {
        this.elements.victoryNarrative.innerHTML = '';
        const paragraphs = narrative.split('\n\n').filter(p => p.trim());
        paragraphs.forEach(p => {
            const para = document.createElement('p');
            para.textContent = p.trim();
            this.elements.victoryNarrative.appendChild(para);
        });

        this.elements.victoryTurns.textContent = state.turn;
        this.elements.victoryClues.textContent = state.clues;

        this.showScreen('victory-screen');
    }

    resetToTitle() {
        this.sessionId = null;
        this.currentState = null;
        this.selectedCharacter = null;
        this.selectedWorld = null;
        this.elements.playerNameInput.value = '';
        this.elements.narrativeScroll.innerHTML = '';
        this.showScreen('title-screen');
        this.focusNameInput();
    }

    // ==========================================================================
    // Loading & Input State
    // ==========================================================================

    setLoading(loading) {
        this.isLoading = loading;
        this.elements.loadingIndicator.classList.toggle('hidden', !loading);
    }

    enableInput() {
        this.elements.playerInput.disabled = false;
        this.elements.submitBtn.disabled = false;
        this.elements.playerInput.focus();
    }

    disableInput() {
        this.elements.playerInput.disabled = true;
        this.elements.submitBtn.disabled = true;
    }

    showError(message) {
        // Add error as a system message in the narrative
        const entry = document.createElement('div');
        entry.className = 'narrative-entry narrator';
        entry.innerHTML = `<p style="color: var(--crimson-glow); font-style: italic;">[${message}]</p>`;
        this.elements.narrativeScroll.appendChild(entry);

        const scrollWrapper = this.elements.narrativeScroll.parentElement;
        scrollWrapper.scrollTop = scrollWrapper.scrollHeight;
    }
}

// Initialize game on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new InfiniteAdventure();
});
