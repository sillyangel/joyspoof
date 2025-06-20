function bufferToHexString(buffer, start = 0, length, separator = "") {
  const view = new Uint8Array(buffer).slice(start, start + length);
  return Array.from(view)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(separator);
}

function hexStringToNumberArray(hex) {
  if (hex.startsWith("#")) hex = hex.slice(1);
  const arr = [];
  for (let i = 0; i < hex.length; i += 2) {
    arr.push(parseInt(hex.substr(i, 2), 16));
  }
  return arr;
}

const types = ["unknown", "left-joycon", "right-joycon", "procon"];
const images = [
  "",
  "images/Joy-Con_Left.svg",
  "images/Joy-Con_Right.svg",
  "images/Pro-Controller.svg",
];

const SubCommand = {
  DeviceInfo: 0x02,
  ReadSPI: 0x10,
  WriteSPI: 0x11,
  Voltage: 0x50,
};

const SPIAddr = {
  SerialNumber: 0x6000,
  TypeInfo: 0x6012,
  ColorType: 0x601b,
  DeviceColor: 0x6050,
};

const ColorType = {
  Default: 0,
  BodyAndButton: 1,
  FullCustom: 2,
};

export class NSControllers {
  _device;
  macAddr = "";
  bodyColor;
  buttonColor;
  leftGripColor;
  rightGripColor;
  constructor(device) {
    this._device = device;
  }
  get productName() {
    return this._device.productName;
  }
  async sendSubCommand(
    scmd,
    body = [],
    optionFilter = () => 1,
    timeout = 1000,
    retry = 3
  ) {
    const reportId = 0x01;
    const data = new Uint8Array([1, 0, 1, 64, 64, 0, 1, 64, 64, scmd, ...body]);
    const filter = (reportId, data) =>
      reportId == 0x21 && data.getUint8(13) == scmd && optionFilter(data);
    return new Promise((resolve, reject) =>
      this.sendReport(reportId, data, filter, timeout, retry)
        .then((data) => resolve(new DataView(data.buffer.slice(14))))
        .catch(() => reject(`request failed: subCommand=${scmd}`))
    );
  }

  async sendReport(reportId, sendData, filter, timeout = 0, retry = 0) {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this._device.removeEventListener("inputreport", reporter);
        if (retry > 0) {
          this.sendReport(reportId, sendData, filter, timeout, retry - 1)
            .then(resolve)
            .catch(reject);
        } else {
          reject(`request timeout: reportId=${reportId}`);
        }
      }, timeout);
      const reporter = ({ target, reportId, data }) => {
        if (filter?.(reportId, data)) {
          clearTimeout(timeoutHandle);
          target.removeEventListener("inputreport", reporter);
          resolve(data);
        }
      };
      this._device.addEventListener("inputreport", reporter);
      this._device.sendReport(reportId, sendData);
    });
  }

  async startConnection() {
    if (this._device.collections[0]?.outputReports.find(({ reportId }) => reportId == 0x80) == undefined) {
      return;
    }
    await this._device.sendReport(0x80, new Uint8Array([0x05]));
    const filter = (id, data) => id == 0x81 && data?.getUint8(0) == 0x02;
    await this.sendReport(0x80, new Uint8Array([0x02]), filter, 500, 3)
      .catch(() => console.warn("Failed to start connection. Ignore;"));
    await this._device.sendReport(0x80, new Uint8Array([0x04]));
  }

  async fetchDeviceInfo() {
    const deviceInfo = await this.sendSubCommand(SubCommand.DeviceInfo);

    this.macAddr = bufferToHexString(deviceInfo.buffer, 4, 6, ":");
    this.type = types[deviceInfo.getUint8(2)];
    this.image = images[deviceInfo.getUint8(2)];
    this.firmware = `${deviceInfo.getUint8(0)}.${deviceInfo.getUint8(1)}`;

    const colorType = await this.readSPIFlash(SPIAddr.ColorType, 1);
    this.colorType = new Uint8Array(colorType)[0];

    const deviceColor = await this.readSPIFlash(SPIAddr.DeviceColor, 12);
    this.bodyColor = `#${bufferToHexString(deviceColor, 0, 3)}`;
    this.buttonColor = `#${bufferToHexString(deviceColor, 3, 3)}`;
    this.leftGripColor = `#${bufferToHexString(deviceColor, 6, 3)}`;
    this.rightGripColor = `#${bufferToHexString(deviceColor, 9, 3)}`;
    if (this.type == "procon" && this.colorType != ColorType.FullCustom) {
      this.leftGripColor = this.bodyColor;
      this.rightGripColor = this.bodyColor;
    }

    if (this.buttonColor == "#ffffff" && this.bodyColor == "#313232") {
      this.leftGripColor = "#1edc00";
      this.rightGripColor = "#ff3278";
    } else if (this.buttonColor == "#ffffff" && this.bodyColor == "#323132") {
      this.leftGripColor = "#b04256";
      this.rightGripColor = "#b04256";
    }

    const serialNumber = await this.readSPIFlash(SPIAddr.SerialNumber, 16);
    this.serialNumber = String.fromCharCode
      .apply("", new Uint8Array(serialNumber))
      .replace(/\xff/g, "*")
      .replace(/\0/g, "");

    const voltage = await this.sendSubCommand(SubCommand.Voltage);
    this.voltage = voltage.getUint16(0, true) / 400;
  }

  async readSPIFlash(address, length) {
    const sendData = new Uint8Array(5);
    const dataView = new DataView(sendData.buffer);
    dataView.setUint16(0, address, true);
    dataView.setUint8(4, length);
    const filter = (data) => {
      const addr = data.getUint16(14, true);
      const len = data.getUint8(18);
      return addr == address && len == length;
    };
    const flashData = await this.sendSubCommand(
      SubCommand.ReadSPI,
      sendData,
      filter
    );
    return flashData.buffer.slice(5);
  }

  async writeSPIFlash(address, data) {
    const sendData = new Uint8Array([0, 0, 0, 0, 0, ...data]);
    const dataView = new DataView(sendData.buffer);
    dataView.setUint16(0, address, true);
    dataView.setUint8(4, data.length);
    const flashData = await this.sendSubCommand(SubCommand.WriteSPI, sendData);
    if (flashData.getUint8(0) != 0) {
      return Promise.reject("Write SPI Error");
    }
    return Promise.resolve();
  }

  async submitColor() {
    const buffer = new Uint8Array([
      ...hexStringToNumberArray(this.bodyColor),
      ...hexStringToNumberArray(this.buttonColor),
      ...hexStringToNumberArray(this.leftGripColor),
      ...hexStringToNumberArray(this.rightGripColor),
    ]);

    if (this.type == "procon" && this.colorType != ColorType.FullCustom) {
      if (
        this.leftGripColor != this.bodyColor ||
        this.rightGripColor != this.bodyColor
      ) {
        await this.writeSPIFlash(SPIAddr.ColorType, [2]).catch((e) => {
          alert(e);
        });
      }
    }

    this.writeSPIFlash(SPIAddr.DeviceColor, buffer).catch((e) => {
      alert(e);
    });
  }
}
