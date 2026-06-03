import instance from './request';

export const createControl = data => instance.post("/SystemAdmin/Control/create", data);
export const readControl = (params) => instance.get("/SystemAdmin/Control/read", { params });
export const updateControl = data => instance.post("/SystemAdmin/Control/update", data);
export const deleteControl = data => instance.post("/SystemAdmin/Control/delete", data);
export const comboControl = data => instance.post("/SystemAdmin/Control/combo", data);
export const arrangeControl = data => instance.post("/SystemAdmin/Control/arrange", data);
