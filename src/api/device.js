import instance from './request';

export const createDevice = data => instance.post("/DeviceAdmin/Device/create", data);
export const readDevice = data => instance.post("/DeviceAdmin/Device/read", data);
export const updateDevice = data => instance.post("/DeviceAdmin/Device/update", data);
export const deleteDevice = data => instance.post("/DeviceAdmin/Device/delete", data);
// V6: combo 响应的 name 由「设备名称」变为「设备名称 (资产编号)」，便于区分同名设备。
//     仅展示文案变化，结构不变 —— 前端直接展示 name 即可，不要再自行拼接资产/序列号。
export const comboDevice = data => instance.post("/DeviceAdmin/Device/combo", data);
export const calibrateDevice = data => instance.post("/DeviceAdmin/Device/calibrate", data);
export const batchCalibrateDevice = data => instance.post("/DeviceAdmin/Device/batchCalibrate", data);
