import instance from './request';

export const createDepartment = data => instance.post("/Admin/Department/create", data);
export const readDepartment = (params) => instance.get("/Admin/Department/read", { params });
export const updateDepartment = data => instance.post("/Admin/Department/update", data);
export const deleteDepartment = data => instance.post("/Admin/Department/delete", data);
export const comboDepartment = data => instance.post("/Admin/Department/combo", data);
