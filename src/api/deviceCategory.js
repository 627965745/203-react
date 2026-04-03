import instance from './request';

export const createDeviceCategory = data => instance.post("/Admin/DeviceCategory/create", data);
export const readDeviceCategory = data => instance.post("/Admin/DeviceCategory/read", data);
export const updateDeviceCategory = data => instance.post("/Admin/DeviceCategory/update", data);
export const deleteDeviceCategory = data => instance.post("/Admin/DeviceCategory/delete", data);
export const comboDeviceCategory = data => instance.post("/Admin/DeviceCategory/combo", data);
