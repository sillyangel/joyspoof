class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
        this.applyTheme(this.currentTheme);
        this.setupThemeToggle();
    }

    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    getStoredTheme() {
        return localStorage.getItem('joyspoof-theme');
    }

    storeTheme(theme) {
        localStorage.setItem('joyspoof-theme', theme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        this.updateThemeToggleIcon();
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        this.storeTheme(newTheme);
    }

    updateThemeToggleIcon() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
            themeToggle.title = `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} mode`;
        }
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
            this.updateThemeToggleIcon();
        }

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!this.getStoredTheme()) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
}

function previewColor(object, controller) {
    const sheet = object.contentDocument?.querySelector("style")?.sheet;
    if (!sheet) return;
    
    const replaceStyle = (selector, color) => {
        const index = Array.from(sheet.rules).findIndex(
            (rule) => rule.selectorText === selector
        );
        if (index >= 0) {
            sheet.insertRule(`${selector} { fill: ${color} }`, index + 1);
            sheet.deleteRule(index);
        } else {
            sheet.insertRule(`${selector} { fill: ${color} }`);
        }
    };
    
    replaceStyle(".body-shell", controller.bodyColor);
    if (controller.type === "procon") {
        replaceStyle(".left-grip", controller.leftGripColor);
        replaceStyle(".right-grip", controller.rightGripColor);
    }
    replaceStyle(".button", controller.buttonColor);
}

class DemoController {
    constructor() {
        this.type = 'left-joycon';
        this.bodyColor = '#E6E6E6'; // OLED White
        this.buttonColor = '#323232'; // OLED White buttons
        this.leftGripColor = '#E6E6E6';
        this.rightGripColor = '#E6E6E6';
        this.image = this.getImagePath();
    }

    getImagePath() {
        const imagePaths = {
            'left-joycon': 'images/Joy-Con_Left.svg',
            'right-joycon': 'images/Joy-Con_Right.svg'
        };
        return imagePaths[this.type];
    }

    setType(type) {
        this.type = type;
        this.image = this.getImagePath();
    }
}

class JoyConDemo {
    constructor() {
        this.controller = new DemoController();
        this.presets = null;
        this.themeManager = new ThemeManager();
        this.currentPreset = null;
        this.initializeApp();
    }

    async initializeApp() {
        this.presets = await this.loadPresets();
        this.setupEventListeners();
        this.setupPresets();
        this.updateControllerImage();
        this.updateControllerInfo();
        this.updateGripVisibility();
        this.updateColorInputs();
        
        // Load shared configuration from URL if present
        this.loadFromURL();
    }

    async loadPresets() {
        try {
            const response = await fetch('./presets.json');
            return await response.json();
        } catch (error) {
            console.error('Failed to load presets:', error);
            return {
                Retails: [
                    { name: "Gray", bodyHex: "#828282", buttonHex: "#0F0F0F" },
                    { name: "Neon Blue", bodyHex: "#0AB9E6", buttonHex: "#001E1E" },
                    { name: "Neon Red", bodyHex: "#FF3C28", buttonHex: "#1E0A0A" }
                ]
            };
        }
    }

    setupEventListeners() {
        // Controller type selector
        document.getElementById('controller-type-selector').addEventListener('change', (e) => {
            this.changeControllerType(e.target.value);
        });

        // Color inputs
        document.getElementById('demo-body-color').addEventListener('input', (e) => {
            this.updateColor('body', e.target.value);
        });

        document.getElementById('demo-button-color').addEventListener('input', (e) => {
            this.updateColor('button', e.target.value);
        });

        document.getElementById('demo-left-grip-color').addEventListener('input', (e) => {
            this.updateColor('leftGrip', e.target.value);
        });

        document.getElementById('demo-right-grip-color').addEventListener('input', (e) => {
            this.updateColor('rightGrip', e.target.value);
        });

        // Hex inputs
        document.getElementById('demo-body-hex').addEventListener('change', (e) => {
            if (this.isValidHex(e.target.value)) {
                this.updateColor('body', e.target.value);
            }
        });

        document.getElementById('demo-button-hex').addEventListener('change', (e) => {
            if (this.isValidHex(e.target.value)) {
                this.updateColor('button', e.target.value);
            }
        });

        document.getElementById('demo-left-grip-hex').addEventListener('change', (e) => {
            if (this.isValidHex(e.target.value)) {
                this.updateColor('leftGrip', e.target.value);
            }
        });

        document.getElementById('demo-right-grip-hex').addEventListener('change', (e) => {
            if (this.isValidHex(e.target.value)) {
                this.updateColor('rightGrip', e.target.value);
            }
        });

        // Reset button
        document.getElementById('demo-reset-btn').addEventListener('click', () => {
            this.resetToOLEDWhite();
        });

        // Copy buttons
        document.getElementById('copy-body-color').addEventListener('click', () => {
            this.copyToClipboard(this.controller.bodyColor);
        });

        document.getElementById('copy-button-color').addEventListener('click', () => {
            this.copyToClipboard(this.controller.buttonColor);
        });

        document.getElementById('copy-left-grip-color').addEventListener('click', () => {
            this.copyToClipboard(this.controller.leftGripColor);
        });

        document.getElementById('copy-right-grip-color').addEventListener('click', () => {
            this.copyToClipboard(this.controller.rightGripColor);
        });

        // Export buttons
        document.getElementById('export-json').addEventListener('click', () => {
            this.exportAsJSON();
        });

        document.getElementById('export-css').addEventListener('click', () => {
            this.exportAsCSS();
        });

        document.getElementById('share-colors').addEventListener('click', () => {
            this.shareConfiguration();
        });
    }

    setupPresets() {
        if (!this.presets) return;
        
        const presetContainers = document.querySelectorAll('.preset-colors');
        
        presetContainers.forEach(container => {
            const targetId = container.dataset.target;
            const baseTargetId = targetId.replace('demo-', '').replace('-color', '');
            
            const allPresets = [
                ...(this.presets.Retails || []),
                ...(this.presets.SpecialColors || [])
            ];
            
            allPresets.forEach(preset => {
                let color = null;
                
                if (baseTargetId === 'body') {
                    color = preset.bodyHex;
                } else if (baseTargetId === 'button') {
                    color = preset.buttonHex;
                }
                
                if (color) {
                    const colorDiv = document.createElement('div');
                    colorDiv.className = 'preset-color';
                    colorDiv.style.backgroundColor = color;
                    
                    const tooltip = `${color}\n${preset.name}`;
                    colorDiv.setAttribute('data-tooltip', tooltip);
                    colorDiv.title = tooltip;
                    
                    colorDiv.addEventListener('click', () => {
                        document.getElementById(targetId).value = color;
                        const colorType = baseTargetId === 'body' ? 'body' : 'button';
                        this.updateColor(colorType, color);
                    });
                    
                    container.appendChild(colorDiv);
                }
            });
        });
    }

    clearActivePresets() {
        // No longer needed since we removed the preset grid
    }

    changeControllerType(type) {
        this.controller.setType(type);
        this.updateControllerImage();
        this.updateControllerInfo();
        this.updateGripVisibility();
        this.updatePreview();
    }

    resetToOLEDWhite() {
        this.controller.bodyColor = '#E6E6E6';
        this.controller.buttonColor = '#323232';
        this.controller.leftGripColor = '#E6E6E6';
        this.controller.rightGripColor = '#E6E6E6';
        
        this.updateColorInputs();
        this.updatePreview();
        this.updateColorSchemeIndicator('OLED Edition White');
    }

    exportAsJSON() {
        const config = {
            controllerType: this.controller.type,
            colors: {
                body: this.controller.bodyColor,
                button: this.controller.buttonColor,
                leftGrip: this.controller.leftGripColor,
                rightGrip: this.controller.rightGripColor
            },
            preset: this.currentPreset?.name || 'Custom',
            timestamp: new Date().toISOString()
        };
        
        this.downloadFile('joycon-colors.json', JSON.stringify(config, null, 2));
    }

    exportAsCSS() {
        const css = `:root {
    --joycon-body-color: ${this.controller.bodyColor};
    --joycon-button-color: ${this.controller.buttonColor};
    --joycon-left-grip-color: ${this.controller.leftGripColor};
    --joycon-right-grip-color: ${this.controller.rightGripColor};
}`;
        
        this.downloadFile('joycon-colors.css', css);
    }

    shareConfiguration() {
        const config = {
            type: this.controller.type,
            body: this.controller.bodyColor,
            button: this.controller.buttonColor,
            leftGrip: this.controller.leftGripColor,
            rightGrip: this.controller.rightGripColor
        };
        
        const encoded = btoa(JSON.stringify(config));
        const url = `${window.location.origin}${window.location.pathname}?config=${encoded}`;
        
        navigator.clipboard.writeText(url).then(() => {
            this.showToast('Configuration URL copied to clipboard!');
        });
    }

    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast(`Copied ${text} to clipboard!`);
        });
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    isValidHex(hex) {
        return /^#[0-9A-F]{6}$/i.test(hex);
    }

    // Load configuration from URL
    loadFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const configParam = urlParams.get('config');
        
        if (configParam) {
            try {
                const config = JSON.parse(atob(configParam));
                this.controller.setType(config.type);
                this.controller.bodyColor = config.body;
                this.controller.buttonColor = config.button;
                this.controller.leftGripColor = config.leftGrip;
                this.controller.rightGripColor = config.rightGrip;
                
                document.getElementById('controller-type-selector').value = config.type;
                this.updateControllerImage();
                this.updateControllerInfo();
                this.updateGripVisibility();
                this.updateColorInputs();
                this.updatePreview();
                this.updateColorSchemeIndicator('Shared Configuration');
            } catch (error) {
                console.error('Failed to load shared configuration:', error);
            }
        }
    }

    updateControllerImage() {
        const image = document.getElementById('demo-controller-image');
        image.data = this.controller.image;
        
        // Add a small delay to ensure the SVG loads properly
        setTimeout(() => {
            if (image.contentDocument) {
                this.updatePreview();
            } else {
                image.addEventListener('load', () => {
                    this.updatePreview();
                });
            }
        }, 100);
    }

    updateControllerInfo() {
        const typeNames = {
            'left-joycon': 'Joy-Con Left',
            'right-joycon': 'Joy-Con Right'
        };
        
        document.getElementById('demo-controller-type').textContent = typeNames[this.controller.type];
    }

    updateGripVisibility() {
        const leftGripSection = document.getElementById('demo-left-grip-section');
        const rightGripSection = document.getElementById('demo-right-grip-section');
        
        // Always hide grip sections since we removed Pro Controller
        leftGripSection.style.display = 'none';
        rightGripSection.style.display = 'none';
    }

    updateColor(type, color) {
        const colorMap = {
            'body': 'bodyColor',
            'button': 'buttonColor',
            'leftGrip': 'leftGripColor',
            'rightGrip': 'rightGripColor'
        };
        
        this.controller[colorMap[type]] = color;
        this.updateColorInputs();
        this.updatePreview();
        this.currentPreset = null;
        this.updateColorSchemeIndicator('Custom');
        this.clearActivePresets();
    }

    updateColorInputs() {
        document.getElementById('demo-body-color').value = this.controller.bodyColor;
        document.getElementById('demo-body-hex').value = this.controller.bodyColor;
        
        document.getElementById('demo-button-color').value = this.controller.buttonColor;
        document.getElementById('demo-button-hex').value = this.controller.buttonColor;
        
        document.getElementById('demo-left-grip-color').value = this.controller.leftGripColor;
        document.getElementById('demo-left-grip-hex').value = this.controller.leftGripColor;
        
        document.getElementById('demo-right-grip-color').value = this.controller.rightGripColor;
        document.getElementById('demo-right-grip-hex').value = this.controller.rightGripColor;
    }

    updatePreview() {
        const image = document.getElementById('demo-controller-image');
        if (image.contentDocument) {
            previewColor(image, this.controller);
        }
    }

    updateColorSchemeIndicator(name) {
        document.getElementById('demo-color-scheme').textContent = name;
    }
}

// Initialize the demo when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new JoyConDemo();
});
