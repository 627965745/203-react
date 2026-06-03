import instance from './request';

export const createDeviceCategory = data => instance.post("/DeviceAdmin/DeviceCategory/create", data);
export const readDeviceCategory = data => instance.post("/DeviceAdmin/DeviceCategory/read", data);
export const updateDeviceCategory = data => instance.post("/DeviceAdmin/DeviceCategory/update", data);
export const deleteDeviceCategory = data => instance.post("/DeviceAdmin/DeviceCategory/delete", data);
export const comboDeviceCategory = data => instance.post("/DeviceAdmin/DeviceCategory/combo", data);
