import instance from './request';

export const createDevice = data => instance.post("/DeviceAdmin/Device/create", data);
export const readDevice = data => instance.post("/DeviceAdmin/Device/read", data);
export const updateDevice = data => instance.post("/DeviceAdmin/Device/update", data);
export const deleteDevice = data => instance.post("/DeviceAdmin/Device/delete", data);
export const comboDevice = data => instance.post("/DeviceAdmin/Device/combo", data);
export const calibrateDevice = data => instance.post("/DeviceAdmin/Device/calibrate", data);
export const batchCalibrateDevice = data => instance.post("/DeviceAdmin/Device/batchCalibrate", data);
