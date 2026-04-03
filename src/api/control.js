import instance from './request';

export const createControl = data => instance.post("/Admin/Control/create", data);
export const readControl = (params) => instance.get("/Admin/Control/read", { params });
export const updateControl = data => instance.post("/Admin/Control/update", data);
export const deleteControl = data => instance.post("/Admin/Control/delete", data);
export const comboControl = data => instance.post("/Admin/Control/combo", data);
export const arrangeControl = data => instance.post("/Admin/Control/arrange", data);
