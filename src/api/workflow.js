import instance from './request';

export const createTask = data => instance.post("/WorkflowManager/Task/create", data);
export const readTask = data => instance.post("/WorkflowManager/Task/read", data);
export const updateTask = data => instance.post("/WorkflowManager/Task/update", data);
export const deleteTask = data => instance.post("/WorkflowManager/Task/delete", data);
export const comboTask = data => instance.post("/WorkflowManager/Task/combo", data);
// V3: 请求体 item_ids: [int] 改为 method_ids: [{item_id, method_id}]
export const templateTask = data => instance.post("/WorkflowManager/Task/template", data, { responseType: 'blob' });
export const uploadTask = data => instance.post("/WorkflowManager/Task/upload", data);
export const exportTask = data => instance.post("/WorkflowManager/Task/export", data);
export const createSample = data => instance.post("/WorkflowManager/Sample/create", data);
export const readSample = data => instance.post("/WorkflowManager/Sample/read", data);
export const updateSample = data => instance.post("/WorkflowManager/Sample/update", data);
export const deleteSample = data => instance.post("/WorkflowManager/Sample/delete", data);
export const comboSample = data => instance.post("/WorkflowManager/Sample/combo", data);
export const inputCreateSample = data => instance.post("/WorkflowManager/Sample/inputCreate", data);
export const inputUpdateSample = data => instance.post("/WorkflowManager/Sample/inputUpdate", data);
export const inputDeleteSample = data => instance.post("/WorkflowManager/Sample/inputDelete", data);
// V3: itemCreate/itemDelete 接口已删除 —— item 与 method 强绑定，不再有独立的"分配项目"操作，
//     改为通过 methodCreate/methodDelete 分配/移除 {item_id, method_id} 组合
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const methodCreateSample = data => instance.post("/WorkflowManager/Sample/methodCreate", data);
export const methodUpdateSample = data => instance.post("/WorkflowManager/Sample/methodUpdate", data);
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const methodDeleteSample = data => instance.post("/WorkflowManager/Sample/methodDelete", data);
export const processCreateSample = data => instance.post("/WorkflowManager/Sample/processCreate", data);
export const processUpdateSample = data => instance.post("/WorkflowManager/Sample/processUpdate", data);
export const processDeleteSample = data => instance.post("/WorkflowManager/Sample/processDelete", data);
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const distributeSample = data => instance.post("/WorkflowManager/Sample/distribute", data);
export const referenceSample = data => instance.post("/WorkflowManager/Sample/reference", data);
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const approveSample = data => instance.post("/WorkflowManager/Sample/approve", data);
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const rejectSample = data => instance.post("/WorkflowManager/Sample/reject", data);


