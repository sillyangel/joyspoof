class ColorUtils {
    static hexToHsl(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return [h * 360, s * 100, l * 100];
    }

    static hslToHex(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;

        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        const toHex = (c) => {
            const hex = Math.round(c * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    static generateComplementary(hex) {
        const [h, s, l] = this.hexToHsl(hex);
        return this.hslToHex((h + 180) % 360, s, l);
    }

    static generateTriadic(hex) {
        const [h, s, l] = this.hexToHsl(hex);
        return [
            this.hslToHex((h + 120) % 360, s, l),
            this.hslToHex((h + 240) % 360, s, l)
        ];
    }

    static generateAnalogous(hex) {
        const [h, s, l] = this.hexToHsl(hex);
        return [
            this.hslToHex((h + 30) % 360, s, l),
            this.hslToHex((h - 30 + 360) % 360, s, l)
        ];
    }

    static generateMonochromatic(hex) {
        const [h, s, l] = this.hexToHsl(hex);
        return [
            this.hslToHex(h, s, Math.max(0, l - 20)),
            this.hslToHex(h, s, Math.min(100, l + 20))
        ];
    }

    static getRandomColor() {
        return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    }
}

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
            'right-joycon': 'images/Joy-Con_Right.svg',
            'procon': 'images/Pro-Controller.svg'
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
        this.updateControllerImage();
        this.updateControllerInfo();
        this.updateGripVisibility();
        this.updateColorInputs();
        this.setupPresets();
        
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

        // Randomize button
        document.getElementById('randomize-btn').addEventListener('click', () => {
            this.randomizeColors();
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

        // Harmony buttons
        document.getElementById('generate-complementary').addEventListener('click', () => {
            this.generateComplementaryColors();
        });

        document.getElementById('generate-triadic').addEventListener('click', () => {
            this.generateTriadicColors();
        });

        document.getElementById('generate-analogous').addEventListener('click', () => {
            this.generateAnalogousColors();
        });

        document.getElementById('generate-monochromatic').addEventListener('click', () => {
            this.generateMonochromaticColors();
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

        // OLED Edition presets
        const oledPresets = this.presets.SpecialColors?.filter(preset => 
            preset.name.includes('OLED')
        ) || [];
        this.createPresetSection('oled-presets', oledPresets);

        // Retail presets
        this.createPresetSection('retail-presets', this.presets.Retails || []);

        // Special presets (excluding OLED)
        const specialPresets = this.presets.SpecialColors?.filter(preset => 
            !preset.name.includes('OLED')
        ) || [];
        this.createPresetSection('special-presets', specialPresets);
    }

    createPresetSection(containerId, presets) {
        const container = document.getElementById(containerId);
        if (!container) return;

        presets.forEach(preset => {
            const presetItem = document.createElement('div');
            presetItem.className = 'preset-item';
            presetItem.dataset.name = preset.name;
            presetItem.title = `${preset.name}\\nBody: ${preset.bodyHex}\\nButton: ${preset.buttonHex}`;
            
            const bodyDiv = document.createElement('div');
            bodyDiv.className = 'preset-body';
            bodyDiv.style.backgroundColor = preset.bodyHex;
            
            const buttonDiv = document.createElement('div');
            buttonDiv.className = 'preset-button';
            buttonDiv.style.backgroundColor = preset.buttonHex;
            
            presetItem.appendChild(bodyDiv);
            presetItem.appendChild(buttonDiv);
            
            presetItem.addEventListener('click', () => {
                this.applyPreset(preset);
            });
            
            container.appendChild(presetItem);
        });
    }

    applyPreset(preset) {
        this.controller.bodyColor = preset.bodyHex;
        this.controller.buttonColor = preset.buttonHex;
        this.controller.leftGripColor = preset.bodyHex;
        this.controller.rightGripColor = preset.bodyHex;
        
        this.currentPreset = preset;
        this.updateColorInputs();
        this.updatePreview();
        this.updateColorSchemeIndicator(preset.name);
        this.updateActivePreset(preset);
    }

    updateActivePreset(preset) {
        document.querySelectorAll('.preset-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.name === preset.name) {
                item.classList.add('active');
            }
        });
    }

    changeControllerType(type) {
        this.controller.setType(type);
        this.updateControllerImage();
        this.updateControllerInfo();
        this.updateGripVisibility();
        this.updatePreview();
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
            'right-joycon': 'Joy-Con Right',
            'procon': 'Pro Controller'
        };
        
        document.getElementById('demo-controller-type').textContent = typeNames[this.controller.type];
    }

    updateGripVisibility() {
        const leftGripSection = document.getElementById('demo-left-grip-section');
        const rightGripSection = document.getElementById('demo-right-grip-section');
        
        if (this.controller.type === 'procon') {
            leftGripSection.style.display = 'block';
            rightGripSection.style.display = 'block';
        } else {
            leftGripSection.style.display = 'none';
            rightGripSection.style.display = 'none';
        }
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

    clearActivePresets() {
        document.querySelectorAll('.preset-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    resetToOLEDWhite() {
        const oledWhite = { name: "OLED Edition White", bodyHex: "#E6E6E6", buttonHex: "#323232" };
        this.applyPreset(oledWhite);
    }

    randomizeColors() {
        this.controller.bodyColor = ColorUtils.getRandomColor();
        this.controller.buttonColor = ColorUtils.getRandomColor();
        this.controller.leftGripColor = ColorUtils.getRandomColor();
        this.controller.rightGripColor = ColorUtils.getRandomColor();
        
        this.updateColorInputs();
        this.updatePreview();
        this.currentPreset = null;
        this.updateColorSchemeIndicator('Random');
        this.clearActivePresets();
    }

    generateComplementaryColors() {
        const complementary = ColorUtils.generateComplementary(this.controller.bodyColor);
        this.controller.buttonColor = complementary;
        this.updateColorInputs();
        this.updatePreview();
        this.updateColorSchemeIndicator('Complementary');
        this.clearActivePresets();
    }

    generateTriadicColors() {
        const triadic = ColorUtils.generateTriadic(this.controller.bodyColor);
        this.controller.buttonColor = triadic[0];
        if (this.controller.type === 'procon') {
            this.controller.leftGripColor = triadic[1];
            this.controller.rightGripColor = triadic[0];
        }
        this.updateColorInputs();
        this.updatePreview();
        this.updateColorSchemeIndicator('Triadic');
        this.clearActivePresets();
    }

    generateAnalogousColors() {
        const analogous = ColorUtils.generateAnalogous(this.controller.bodyColor);
        this.controller.buttonColor = analogous[0];
        if (this.controller.type === 'procon') {
            this.controller.leftGripColor = analogous[1];
            this.controller.rightGripColor = analogous[0];
        }
        this.updateColorInputs();
        this.updatePreview();
        this.updateColorSchemeIndicator('Analogous');
        this.clearActivePresets();
    }

    generateMonochromaticColors() {
        const monochromatic = ColorUtils.generateMonochromatic(this.controller.bodyColor);
        this.controller.buttonColor = monochromatic[0];
        if (this.controller.type === 'procon') {
            this.controller.leftGripColor = monochromatic[1];
            this.controller.rightGripColor = monochromatic[0];
        }
        this.updateColorInputs();
        this.updatePreview();
        this.updateColorSchemeIndicator('Monochromatic');
        this.clearActivePresets();
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
}

// Initialize the demo when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new JoyConDemo();
});
