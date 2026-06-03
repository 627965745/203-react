import instance from './request';

export const createRole = data => instance.post("/SystemAdmin/Role/create", data);
export const readRole = data => instance.post("/SystemAdmin/Role/read", data);
export const updateRole = data => instance.post("/SystemAdmin/Role/update", data);
export const deleteRole = data => instance.post("/SystemAdmin/Role/delete", data);
export const comboRole = data => instance.post("/SystemAdmin/Role/combo", data);
export const controlArrangeRole = data => instance.post("/SystemAdmin/Role/controlArrange", data);
export const userArrangeRole = data => instance.post("/SystemAdmin/Role/userArrange", data);
