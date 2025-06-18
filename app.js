import { NSControllers } from "./joycon-utils.js";

function previewColor(object, controller) {
  const sheet = object.contentDocument?.querySelector("style")?.sheet;
  if (!sheet) return;
  const replaceStyle = (selector, color) => {
    const index = Array.from(sheet.rules).findIndex(
      (rule) => rule.selectorText === selector
    );
    sheet.insertRule(`${selector} { fill: ${color} }`, index + 1);
    sheet.deleteRule(index);
  };
  replaceStyle(".body-shell", controller.bodyColor);
  if (controller.type === "procon") {
    replaceStyle(".left-grip", controller.leftGripColor);
    replaceStyle(".right-grip", controller.rightGripColor);
  }
  replaceStyle(".button", controller.buttonColor);
}

function setBatteryCapacity(object, voltage) {
  const level = (voltage - 3.3) / (4.2 - 3.3);
  const capacity = object.contentDocument?.querySelector("#capacity");
  capacity?.setAttribute("width", String(416 * level));
}

async function connectController() {
  if (!navigator.hid) {
    throw new Error("unavailable");
  }
  const devices = await navigator.hid.requestDevice({ filters: [{ vendorId: 0x057e }] });
  if (devices.length === 1) {
    const device = devices[0];
    await device.close();
    await device.open();
    const controller = new NSControllers(device);
    await controller.startConnection();
    await controller.fetchDeviceInfo();
    return controller;
  }
  if (devices.length > 1) {
    throw new Error("Please select only one controller.");
  }
}

// Remove the old presetColors array and add this function
async function loadPresets() {
  try {
    const response = await fetch('./presets.json');
    const presets = await response.json();
    return presets;
  } catch (error) {
    console.error('Failed to load presets:', error);
    // Fallback to basic colors if presets.json fails to load
    return {
      Retails: [
        { name: "Gray", bodyHex: "#828282", buttonHex: "#0F0F0F" },
        { name: "Neon Blue", bodyHex: "#0AB9E6", buttonHex: "#001E1E" },
        { name: "Neon Red", bodyHex: "#FF3C28", buttonHex: "#1E0A0A" }
      ]
    };
  }
}

class JoyConApp {
    constructor() {
        this.controller = null;
        this.originalColors = {};
        this.presets = null;
        this.initializeApp();
    }

    async initializeApp() {
        // Load presets first
        this.presets = await loadPresets();
        this.setupEventListeners();
        this.createPresetColors();
        this.checkHIDSupport();
    }

    checkHIDSupport() {
        if (!navigator.hid) {
            this.showError("WebHID API is not supported in this browser. Please use newer Browsers like Chrome or Edge.");
            document.getElementById('connect-btn').disabled = true;
        }
    }

    setupEventListeners() {
        document.getElementById('connect-btn').addEventListener('click', () => {
            this.connectToController();
        });

        ['body-color', 'button-color', 'left-grip-color', 'right-grip-color'].forEach(id => {
            const input = document.getElementById(id);
            input.addEventListener('input', (e) => {
                this.updateControllerColor(id, e.target.value);
            });
        });

        document.getElementById('submit-color-btn').addEventListener('click', () => {
            this.submitColors();
        });

        document.getElementById('reset-color-btn').addEventListener('click', () => {
            this.resetColors();
        });
    }

    createPresetColors() {
        if (!this.presets) return;
        
        const presetContainers = document.querySelectorAll('.preset-colors');
        
        presetContainers.forEach(container => {
            const targetId = container.dataset.target;
            
            // Combine all presets from different categories
            const allPresets = [
                ...this.presets.Retails,
                ...(this.presets.SpecialColors || [])
            ];
            
            // Create a set to avoid duplicate colors
            const uniqueColors = new Set();
            
            allPresets.forEach(preset => {
                // Add body color if it's for body-color input or general use
                if (targetId === 'body-color' || targetId === 'left-grip-color' || targetId === 'right-grip-color') {
                    uniqueColors.add(preset.bodyHex);
                }
                // Add button color if it's for button-color input
                if (targetId === 'button-color') {
                    uniqueColors.add(preset.buttonHex);
                }
            });
            
            // Convert set back to array and create color elements
            Array.from(uniqueColors).forEach(color => {
                const colorDiv = document.createElement('div');
                colorDiv.className = 'preset-color';
                colorDiv.style.backgroundColor = color;
                colorDiv.title = color;
                colorDiv.addEventListener('click', () => {
                    document.getElementById(targetId).value = color;
                    this.updateControllerColor(targetId, color);
                });
                container.appendChild(colorDiv);
            });
        });
    }

    async connectToController() {
        const connectBtn = document.getElementById('connect-btn');
        
        try {
            this.hideError();
            this.controller = await connectController();
            
            if (this.controller) {
                this.displayControllerInfo();
                this.setupControllerColors();
                this.showControllerSection();
            }
        } catch (error) {
            console.error('Connection failed:', error);
            this.showError(`Failed to connect: ${error}`);
            connectBtn.disabled = false;
            connectBtn.textContent = 'Connect Controller';
        }
    }

    // ...existing code...
    displayControllerInfo() {
        if (!this.controller) return;
        document.getElementById('product-name').textContent = this.controller.productName;
        document.getElementById('controller-type').textContent = this.controller.type;
        document.getElementById('mac-address').textContent = this.controller.macAddr;
        document.getElementById('serial-number').textContent = this.controller.serialNumber;
        document.getElementById('firmware').textContent = this.controller.firmware;
        document.getElementById('voltage').textContent = this.controller.voltage.toFixed(2);
        const controllerImage = document.getElementById('controller-image');
        if (this.controller.image) {
            controllerImage.data = this.controller.image;
            controllerImage.addEventListener('load', () => {
                previewColor(controllerImage, this.controller);
            });
        }
        const batteryIcon = document.getElementById('battery-icon');
        batteryIcon.addEventListener('load', () => {
            setBatteryCapacity(batteryIcon, this.controller.voltage);
        });
    }

    setupControllerColors() {
        if (!this.controller) return;
        this.originalColors = {
            bodyColor: this.controller.bodyColor,
            buttonColor: this.controller.buttonColor,
            leftGripColor: this.controller.leftGripColor,
            rightGripColor: this.controller.rightGripColor
        };
        document.getElementById('body-color').value = this.controller.bodyColor;
        document.getElementById('button-color').value = this.controller.buttonColor;
        document.getElementById('left-grip-color').value = this.controller.leftGripColor;
        document.getElementById('right-grip-color').value = this.controller.rightGripColor;
        const leftGripSection = document.querySelector('.color-input:has(#left-grip-color)');
        const rightGripSection = document.querySelector('.color-input:has(#right-grip-color)');
        if (this.controller.type === 'procon') {
            leftGripSection.style.display = 'block';
            rightGripSection.style.display = 'block';
        } else {
            leftGripSection.style.display = 'none';
            rightGripSection.style.display = 'none';
        }
        this.updateAllControllerColors();
    }

    updateControllerColor(inputId, color) {
        if (!this.controller) return;
        const colorMap = {
            'body-color': 'bodyColor',
            'button-color': 'buttonColor',
            'left-grip-color': 'leftGripColor',
            'right-grip-color': 'rightGripColor'
        };
        const property = colorMap[inputId];
        if (property) {
            this.controller[property] = color;
            this.updatePreview();
        }
    }

    updateAllControllerColors() {
        if (!this.controller) return;
        this.controller.bodyColor = document.getElementById('body-color').value;
        this.controller.buttonColor = document.getElementById('button-color').value;
        this.controller.leftGripColor = document.getElementById('left-grip-color').value;
        this.controller.rightGripColor = document.getElementById('right-grip-color').value;
        this.updatePreview();
    }

    updatePreview() {
        const controllerImage = document.getElementById('controller-image');
        if (controllerImage.contentDocument) {
            previewColor(controllerImage, this.controller);
        }
    }

    async submitColors() {
        if (!this.controller) return;
        const submitBtn = document.getElementById('submit-color-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        try {
            await this.controller.submitColor();
            alert('Colors submitted successfully!');
        } catch (error) {
            console.error('Submit failed:', error);
            alert(`Failed to submit colors: ${error}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Colors';
        }
    }

    resetColors() {
        if (!this.controller || !this.originalColors.bodyColor) return;
        document.getElementById('body-color').value = this.originalColors.bodyColor;
        document.getElementById('button-color').value = this.originalColors.buttonColor;
        document.getElementById('left-grip-color').value = this.originalColors.leftGripColor;
        document.getElementById('right-grip-color').value = this.originalColors.rightGripColor;
        this.updateAllControllerColors();
    }

    showControllerSection() {
        document.getElementById('controller-section').classList.remove('hidden');
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    hideError() {
        document.getElementById('error-message').classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new JoyConApp();
});