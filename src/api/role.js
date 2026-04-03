import instance from './request';

export const createRole = data => instance.post("/Admin/Role/create", data);
export const readRole = data => instance.post("/Admin/Role/read", data);
export const updateRole = data => instance.post("/Admin/Role/update", data);
export const deleteRole = data => instance.post("/Admin/Role/delete", data);
export const comboRole = data => instance.post("/Admin/Role/combo", data);
