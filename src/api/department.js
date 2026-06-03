import instance from './request';

export const createDepartment = data => instance.post("/ResourceAdmin/Department/create", data);
export const readDepartment = (params) => instance.get("/ResourceAdmin/Department/read", { params });
export const updateDepartment = data => instance.post("/ResourceAdmin/Department/update", data);
export const deleteDepartment = data => instance.post("/ResourceAdmin/Department/delete", data);
export const comboDepartment = data => instance.post("/ResourceAdmin/Department/combo", data);

// Department Manager Task APIs
export const readDepartmentTask = data => instance.post("/DepartmentManager/Task/read", data);
export const exportDepartmentTask = data => instance.post("/DepartmentManager/Task/export", data, { responseType: 'blob' });

// Department Manager Sample APIs
export const readDepartmentSample = data => instance.post("/DepartmentManager/Sample/read", data);
export const updateDepartmentSample = data => instance.post("/DepartmentManager/Sample/update", data);
export const deleteDepartmentSample = data => instance.post("/DepartmentManager/Sample/delete", data);
export const referenceDepartmentSample = data => instance.post("/DepartmentManager/Sample/reference", data);

// Department Manager Sample Input/Item/Method APIs
export const inputCreateDepartmentSample = data => instance.post("/DepartmentManager/Sample/inputCreate", data);
export const inputUpdateDepartmentSample = data => instance.post("/DepartmentManager/Sample/inputUpdate", data);
export const inputDeleteDepartmentSample = data => instance.post("/DepartmentManager/Sample/inputDelete", data);
export const itemCreateDepartmentSample = data => instance.post("/DepartmentManager/Sample/itemCreate", data);
export const itemDeleteDepartmentSample = data => instance.post("/DepartmentManager/Sample/itemDelete", data);
export const methodCreateDepartmentSample = data => instance.post("/DepartmentManager/Sample/methodCreate", data);
export const methodDeleteDepartmentSample = data => instance.post("/DepartmentManager/Sample/methodDelete", data);

// Department Manager Distribution & Helper APIs
export const distributeDepartmentSample = data => instance.post("/DepartmentManager/Sample/distribute", data);
export const helperCreateDepartmentSample = data => instance.post("/DepartmentManager/Sample/helperCreate", data);
export const helperDeleteDepartmentSample = data => instance.post("/DepartmentManager/Sample/helperDelete", data);
export const approveDepartmentSample = data => instance.post("/DepartmentManager/Sample/approve", data);
export const rejectDepartmentSample = data => instance.post("/DepartmentManager/Sample/reject", data);
export const rollbackDepartmentSample = data => instance.post("/DepartmentManager/Sample/rollback", data);
