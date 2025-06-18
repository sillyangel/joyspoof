import { Controller } from "./controller.js";

export function previewColor(object, controller) {
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

export function setBatteryCapacity(object, voltage) {
  const level = (voltage - 3.3) / (4.2 - 3.3);
  const capacity = object.contentDocument?.querySelector("#capacity");
  capacity?.setAttribute("width", String(416 * level));
}

export async function connectController() {
  if (!navigator.hid) {
    throw new Error("unavailable");
  }
  const devices = await navigator.hid.requestDevice({ filters: [{ vendorId: 0x057e }] });
  if (devices.length === 1) {
    const device = devices[0];
    await device.close();
    await device.open();
    const controller = new Controller(device);
    await controller.startConnection();
    await controller.fetchDeviceInfo();
    return controller;
  }
  if (devices.length > 1) {
    throw new Error("Please select only one controller.");
  }
}

export const presetColors = [
  "#828282",
  "#0AB9E6",
  "#FF3C28",
  "#E6FF00",
  "#1EDC00",
  "#FF3278",
  "#E10F00",
  "#4655F5",
  "#B400E6",
  "#FAA005",
  "#FFFFFF",
];
