import { Controller } from "./controller.js";
import { previewColor, setBatteryCapacity, connectController, presetColors } from "./index.js";

class JoyConApp {
    constructor() {
        this.controller = null;
        this.originalColors = {};
        this.initializeApp();
    }

    initializeApp() {
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
        const presetContainers = document.querySelectorAll('.preset-colors');
        
        presetContainers.forEach(container => {
            const targetId = container.dataset.target;
            
            presetColors.forEach(color => {
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
                connectBtn.textContent = 'Connected';
            }
        } catch (error) {
            console.error('Connection failed:', error);
            this.showError(`Failed to connect: ${error}`);
            connectBtn.disabled = false;
            connectBtn.textContent = 'Connect Controller';
        }
    }

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