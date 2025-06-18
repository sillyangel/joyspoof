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

async function loadPresets() {
  try {
    const response = await fetch('./presets.json');
    const presets = await response.json();
    return presets;
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

class JoyConApp {
    constructor() {
        this.controllers = [];
        this.presets = null;
        this.controllerCount = 0;
        this.initializeApp();
    }

    async initializeApp() {
        this.presets = await loadPresets();
        this.setupEventListeners();
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
    }

    createControllerSection(controller, index) {
    const controllerSection = document.createElement('div');
    controllerSection.className = 'controller-section';
    controllerSection.id = `controller-section-${index}`;

    // Add HR divider if not the first controller
    if (index > 0) {
        const divider = document.createElement('hr');
        divider.className = 'controller-divider';
        document.getElementById('controllers-container').appendChild(divider);
    }

    // Generate controller title based on type
    const getControllerTitle = (type) => {
        switch(type) {
            case 'left-joycon':
                return 'Joy-Con Left';
            case 'right-joycon':
                return 'Joy-Con Right';
            case 'procon':
                return 'Pro Controller';
            default:
                return 'Unknown Controller';
        }
    };

    const controllerTitle = getControllerTitle(controller.type);

    controllerSection.innerHTML = `
        <div class="main-container">
            <div class="left-panel">
                <div class="controller-info">
                    <h2>${controllerTitle} Information</h2>
                    <div class="controller-details">
                        <div><strong>Name:</strong> <span id="product-name-${index}"></span></div>
                        <div><strong>Type:</strong> <span id="controller-type-${index}"></span></div>
                        <div><strong>MAC Address:</strong> <span id="mac-address-${index}"></span></div>
                        <div><strong>Serial Number:</strong> <span id="serial-number-${index}"></span></div>
                        <div><strong>Firmware:</strong> <span id="firmware-${index}"></span></div>
                        <div class="battery-info">
                            <strong>Battery:</strong> 
                            <span id="voltage-${index}"></span>V
                            <object id="battery-icon-${index}" data="images/battery.svg" type="image/svg+xml" style="width: 50px; height: 20px;"></object>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="middle-panel">
                <div class="controller-preview">
                    <object id="controller-image-${index}" type="image/svg+xml" class="controller-image"></object>
                </div>
            </div>
            
            <div class="right-panel">
                <div class="color-customization">
                    <h2>Color Customization</h2>
                    <div class="color-inputs">
                        <div class="color-input">
                            <label for="body-color-${index}">Body Color</label>
                            <input type="color" id="body-color-${index}" value="#828282">
                            <div class="preset-colors" data-target="body-color-${index}"></div>
                        </div>
                        <div class="color-input">
                            <label for="button-color-${index}">Button Color</label>
                            <input type="color" id="button-color-${index}" value="#828282">
                            <div class="preset-colors" data-target="button-color-${index}"></div>
                        </div>
                        <div class="color-input" id="left-grip-section-${index}">
                            <label for="left-grip-color-${index}">Left Grip Color</label>
                            <input type="color" id="left-grip-color-${index}" value="#828282">
                            <div class="preset-colors" data-target="left-grip-color-${index}"></div>
                        </div>
                        <div class="color-input" id="right-grip-section-${index}">
                            <label for="right-grip-color-${index}">Right Grip Color</label>
                            <input type="color" id="right-grip-color-${index}" value="#828282">
                            <div class="preset-colors" data-target="right-grip-color-${index}"></div>
                        </div>
                    </div>
                    <div class="button-group">
                        <button id="submit-color-btn-${index}">Submit Colors</button>
                        <button id="reset-color-btn-${index}">Reset Colors</button>
                        <button id="disconnect-btn-${index}" class="disconnect-btn">Disconnect</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('controllers-container').appendChild(controllerSection);
    
    // Setup event listeners for this controller
    this.setupControllerEventListeners(controller, index);
    this.createPresetColors(index);
    this.displayControllerInfo(controller, index);
    this.setupControllerColors(controller, index);
}


reindexControllers() {
    const sections = document.querySelectorAll('.controller-section');
    sections.forEach((section, newIndex) => {
        section.id = `controller-section-${newIndex}`;
        
        // Update all IDs within the section
        const elementsWithIds = section.querySelectorAll('[id]');
        elementsWithIds.forEach(element => {
            const oldId = element.id;
            const baseId = oldId.replace(/-\d+$/, '');
            element.id = `${baseId}-${newIndex}`;
        });
        
        // Update data-target attributes
        const presetContainers = section.querySelectorAll('.preset-colors');
        presetContainers.forEach(container => {
            const oldTarget = container.dataset.target;
            const baseTarget = oldTarget.replace(/-\d+$/, '');
            container.dataset.target = `${baseTarget}-${newIndex}`;
        });
        
        // Update header with controller type instead of generic number
        const header = section.querySelector('h2');
        const controller = this.controllers[newIndex];
        const getControllerTitle = (type) => {
            switch(type) {
                case 'left-joycon':
                    return 'Joy-Con Left';
                case 'right-joycon':
                    return 'Joy-Con Right';
                case 'procon':
                    return 'Pro Controller';
                default:
                    return 'Unknown Controller';
            }
        };
        header.textContent = `${getControllerTitle(controller.type)} Information`;
        
        // Re-setup event listeners
        this.setupControllerEventListeners(this.controllers[newIndex], newIndex);
    });
}

    setupControllerEventListeners(controller, index) {
        ['body-color', 'button-color', 'left-grip-color', 'right-grip-color'].forEach(id => {
            const input = document.getElementById(`${id}-${index}`);
            input.addEventListener('input', (e) => {
                this.updateControllerColor(controller, id, e.target.value);
            });
        });

        document.getElementById(`submit-color-btn-${index}`).addEventListener('click', () => {
            this.submitColors(controller, index);
        });

        document.getElementById(`reset-color-btn-${index}`).addEventListener('click', () => {
            this.resetColors(controller, index);
        });

        document.getElementById(`disconnect-btn-${index}`).addEventListener('click', () => {
            this.disconnectController(index);
        });
    }

    createPresetColors(index) {
        if (!this.presets) return;
        
        const presetContainers = document.querySelectorAll(`#controller-section-${index} .preset-colors`);
        
        presetContainers.forEach(container => {
            const targetId = container.dataset.target;
            const baseTargetId = targetId.replace(`-${index}`, '');
            
            const allPresets = [
                ...this.presets.Retails,
                ...(this.presets.SpecialColors || [])
            ];
            
            allPresets.forEach(preset => {
                let color = null;
                
                if (baseTargetId === 'body-color' || baseTargetId === 'left-grip-color' || baseTargetId === 'right-grip-color') {
                    color = preset.bodyHex;
                } else if (baseTargetId === 'button-color') {
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
                        this.updateControllerColor(this.controllers[index], baseTargetId, color);
                    });
                    
                    container.appendChild(colorDiv);
                }
            });
        });
    }

    async connectToController() {
        const connectBtn = document.getElementById('connect-btn');
        
        try {
            this.hideError();
            connectBtn.disabled = true;
            
            const controller = await connectController();
            
            if (controller) {
                // Store original colors
                controller.originalColors = {
                    bodyColor: controller.bodyColor,
                    buttonColor: controller.buttonColor,
                    leftGripColor: controller.leftGripColor,
                    rightGripColor: controller.rightGripColor
                };
                
                this.controllers.push(controller);
                const index = this.controllers.length - 1;
                
                this.createControllerSection(controller, index);
                this.showControllersContainer();
            }
        } catch (error) {
            console.error('Connection failed:', error);
            this.showError(`Failed to connect: ${error}`);
        } finally {
            connectBtn.disabled = false;
            connectBtn.textContent = '';
        }
    }

    displayControllerInfo(controller, index) {
        if (!controller) return;
        document.getElementById(`product-name-${index}`).textContent = controller.productName;
        document.getElementById(`controller-type-${index}`).textContent = controller.type;
        document.getElementById(`mac-address-${index}`).textContent = controller.macAddr;
        document.getElementById(`serial-number-${index}`).textContent = controller.serialNumber;
        document.getElementById(`firmware-${index}`).textContent = controller.firmware;
        document.getElementById(`voltage-${index}`).textContent = controller.voltage.toFixed(2);
        
        const controllerImage = document.getElementById(`controller-image-${index}`);
        if (controller.image) {
            controllerImage.data = controller.image;
            controllerImage.addEventListener('load', () => {
                previewColor(controllerImage, controller);
            });
        }
        
        const batteryIcon = document.getElementById(`battery-icon-${index}`);
        batteryIcon.addEventListener('load', () => {
            setBatteryCapacity(batteryIcon, controller.voltage);
        });
    }

    setupControllerColors(controller, index) {
        if (!controller) return;
        
        document.getElementById(`body-color-${index}`).value = controller.bodyColor;
        document.getElementById(`button-color-${index}`).value = controller.buttonColor;
        document.getElementById(`left-grip-color-${index}`).value = controller.leftGripColor;
        document.getElementById(`right-grip-color-${index}`).value = controller.rightGripColor;
        
        const leftGripSection = document.getElementById(`left-grip-section-${index}`);
        const rightGripSection = document.getElementById(`right-grip-section-${index}`);
        
        if (controller.type === 'procon') {
            leftGripSection.style.display = 'block';
            rightGripSection.style.display = 'block';
        } else {
            leftGripSection.style.display = 'none';
            rightGripSection.style.display = 'none';
        }
        
        this.updatePreview(controller, index);
    }

    updateControllerColor(controller, inputId, color) {
        if (!controller) return;
        const colorMap = {
            'body-color': 'bodyColor',
            'button-color': 'buttonColor',
            'left-grip-color': 'leftGripColor',
            'right-grip-color': 'rightGripColor'
        };
        const property = colorMap[inputId];
        if (property) {
            controller[property] = color;
            const index = this.controllers.indexOf(controller);
            this.updatePreview(controller, index);
        }
    }

    updatePreview(controller, index) {
        const controllerImage = document.getElementById(`controller-image-${index}`);
        if (controllerImage.contentDocument) {
            previewColor(controllerImage, controller);
        }
    }

    async submitColors(controller, index) {
        if (!controller) return;
        const submitBtn = document.getElementById(`submit-color-btn-${index}`);
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        try {
            await controller.submitColor();
            alert('Colors submitted successfully!');
        } catch (error) {
            console.error('Submit failed:', error);
            alert(`Failed to submit colors: ${error}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Colors';
        }
    }

    resetColors(controller, index) {
        if (!controller || !controller.originalColors.bodyColor) return;
        document.getElementById(`body-color-${index}`).value = controller.originalColors.bodyColor;
        document.getElementById(`button-color-${index}`).value = controller.originalColors.buttonColor;
        document.getElementById(`left-grip-color-${index}`).value = controller.originalColors.leftGripColor;
        document.getElementById(`right-grip-color-${index}`).value = controller.originalColors.rightGripColor;
        
        controller.bodyColor = controller.originalColors.bodyColor;
        controller.buttonColor = controller.originalColors.buttonColor;
        controller.leftGripColor = controller.originalColors.leftGripColor;
        controller.rightGripColor = controller.originalColors.rightGripColor;
        
        this.updatePreview(controller, index);
    }

    disconnectController(index) {
        const controllerSection = document.getElementById(`controller-section-${index}`);
        const controller = this.controllers[index];
        
        // Close the device connection
        if (controller && controller._device) {
            controller._device.close();
        }
        
        // Remove from controllers array
        this.controllers.splice(index, 1);
        
        // Remove the controller section
        controllerSection.remove();
        
        // Remove the divider if it exists
        const dividers = document.querySelectorAll('.controller-divider');
        if (dividers.length > 0) {
            dividers[dividers.length - 1].remove();
        }
        
        // Hide container if no controllers
        if (this.controllers.length === 0) {
            document.getElementById('controllers-container').classList.add('hidden');
        }
        
        // Re-index remaining controllers
        this.reindexControllers();
    }

    reindexControllers() {
        const sections = document.querySelectorAll('.controller-section');
        sections.forEach((section, newIndex) => {
            section.id = `controller-section-${newIndex}`;
            
            // Update all IDs within the section
            const elementsWithIds = section.querySelectorAll('[id]');
            elementsWithIds.forEach(element => {
                const oldId = element.id;
                const baseId = oldId.replace(/-\d+$/, '');
                element.id = `${baseId}-${newIndex}`;
            });
            
            // Update data-target attributes
            const presetContainers = section.querySelectorAll('.preset-colors');
            presetContainers.forEach(container => {
                const oldTarget = container.dataset.target;
                const baseTarget = oldTarget.replace(/-\d+$/, '');
                container.dataset.target = `${baseTarget}-${newIndex}`;
            });
            
            // Update header
            const header = section.querySelector('h2');
            header.textContent = `Controller ${newIndex + 1} Information`;
            
            // Re-setup event listeners
            this.setupControllerEventListeners(this.controllers[newIndex], newIndex);
        });
    }

    showControllersContainer() {
        document.getElementById('controllers-container').classList.remove('hidden');
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