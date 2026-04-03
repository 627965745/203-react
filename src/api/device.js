import instance from './request';

export const createDevice = data => instance.post("/Admin/Device/create", data);
export const readDevice = data => instance.post("/Admin/Device/read", data);
export const updateDevice = data => instance.post("/Admin/Device/update", data);
export const deleteDevice = data => instance.post("/Admin/Device/delete", data);
export const comboDevice = data => instance.post("/Admin/Device/combo", data);
