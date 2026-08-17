import instance from './request';

export const createDepartment = data => instance.post("/SystemAdmin/Department/create", data);
export const readDepartment = (params) => instance.get("/SystemAdmin/Department/read", { params });
export const updateDepartment = data => instance.post("/SystemAdmin/Department/update", data);
export const deleteDepartment = data => instance.post("/SystemAdmin/Department/delete", data);
export const comboDepartment = data => instance.post("/SystemAdmin/Department/combo", data);

// Department Manager Task APIs
export const readDepartmentTask = data => instance.post("/DepartmentManager/Task/read", data);
export const exportDepartmentTask = data => instance.post("/DepartmentManager/Task/export", data, { responseType: 'blob' });

// Department Manager Sample APIs
export const readDepartmentSample = data => instance.post("/DepartmentManager/Sample/read", data);
export const updateDepartmentSample = data => instance.post("/DepartmentManager/Sample/update", data);
export const deleteDepartmentSample = data => instance.post("/DepartmentManager/Sample/delete", data);
export const comboDepartmentSample = data => instance.post("/DepartmentManager/Sample/combo", data);
// V4: 业务逻辑同 WorkflowManager —— task_id 必传；重复样(type=3)必须传 parent_id；
//     client_code 由后端自动生成
export const referenceDepartmentSample = data => instance.post("/DepartmentManager/Sample/reference", data);
// V4: 新增接口 —— 按比例(ratio)生成重复样，与 WorkflowManager/Sample/duplicate 类似，
//     但基于 department_id 做权限隔离；部门维度生成的重复样，其方法初始 status=1（已分配部门）。
//     task_id 必传：即使已经给了 sample_ids 缩小范围，也要一并带上 task_id。
export const duplicateDepartmentSample = data => instance.post("/DepartmentManager/Sample/duplicate", data);

// Department Manager Sample Input/Method APIs
export const inputCreateDepartmentSample = data => instance.post("/DepartmentManager/Sample/inputCreate", data);
export const inputUpdateDepartmentSample = data => instance.post("/DepartmentManager/Sample/inputUpdate", data);
export const inputDeleteDepartmentSample = data => instance.post("/DepartmentManager/Sample/inputDelete", data);
// V3: itemCreate/itemDelete 接口已删除 —— item 与 method 强绑定，不再有独立的"分配项目"操作，
//     改为通过 methodCreate/methodDelete 分配/移除 {item_id, method_id} 组合
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const methodCreateDepartmentSample = data => instance.post("/DepartmentManager/Sample/methodCreate", data);
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const methodDeleteDepartmentSample = data => instance.post("/DepartmentManager/Sample/methodDelete", data);

// Department Manager Distribution & Helper APIs
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const distributeDepartmentSample = data => instance.post("/DepartmentManager/Sample/distribute", data);
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const helperCreateDepartmentSample = data => instance.post("/DepartmentManager/Sample/helperCreate", data);
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const helperDeleteDepartmentSample = data => instance.post("/DepartmentManager/Sample/helperDelete", data);
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const approveDepartmentSample = data => instance.post("/DepartmentManager/Sample/approve", data);
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const rejectDepartmentSample = data => instance.post("/DepartmentManager/Sample/reject", data);
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const rollbackDepartmentSample = data => instance.post("/DepartmentManager/Sample/rollback", data);
