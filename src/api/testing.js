import instance from './request';

// Task Management
export const readTestingTask = data => instance.post("/TestingManager/Task/read", data);
export const exportTestingTask = data => instance.post("/TestingManager/Task/export", data, { responseType: 'blob' });

// Sample Management
export const readTestingSample = data => instance.post("/TestingManager/Sample/read", data);
export const updateTestingSample = data => instance.post("/TestingManager/Sample/update", data);
export const deleteTestingSample = data => instance.post("/TestingManager/Sample/delete", data);
export const referenceTestingSample = data => instance.post("/TestingManager/Sample/reference", data);
export const comboTestingSample = data => instance.post("/TestingManager/Sample/combo", data);

// Input Parameters (Limited to samples created by current user)
export const inputCreateTestingSample = data => instance.post("/TestingManager/Sample/inputCreate", data);
export const inputUpdateTestingSample = data => instance.post("/TestingManager/Sample/inputUpdate", data);
export const inputDeleteTestingSample = data => instance.post("/TestingManager/Sample/inputDelete", data);

// V3: itemCreate/itemDelete 接口已删除 —— item 与 method 强绑定，不再有独立的"分配项目"操作，
//     改为通过 methodCreate/methodDelete 分配/移除 {item_id, method_id} 组合

// Method Management (Limited to samples created by current user)
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const methodCreateTestingSample = data => instance.post("/TestingManager/Sample/methodCreate", data);
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const methodDeleteTestingSample = data => instance.post("/TestingManager/Sample/methodDelete", data);

// Result Management (Limited to samples created by current user)
// V3: 结果主键由 (sample_id, field_id) 改为 (sample_id, item_id, field_id)，请求体新增必填 item_id
export const resultCreateTestingSample = data => instance.post("/TestingManager/Sample/resultCreate", data);
// V3: 请求体新增必填 item_id
export const resultDeleteTestingSample = data => instance.post("/TestingManager/Sample/resultDelete", data);
// V3: method_id 由 int 改为 {item_id, method_id} 对象；下载文件名固定为 结果录入模板.xlsx（前端自行命名，不受影响）
export const templateTestingSample = data => instance.post("/TestingManager/Sample/template", data, { responseType: 'blob' });
export const uploadTestingSample = data => instance.post("/TestingManager/Sample/upload", data);

// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const approveTestingSample = data => instance.post("/TestingManager/Sample/approve", data);
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const rollbackTestingSample = data => instance.post("/TestingManager/Sample/rollback", data);

// Sample Helper Management
// V3: task_ids 由必填改为可选（不传表示查询全部任务）；响应 helpers[] 新增 item_id/item_name
export const readSampleHelper = data => instance.post("/TestingManager/SampleHelper/read", data);
// V3: method_id 由 int 改为 {item_id, method_id} 对象
export const approveSampleHelper = data => instance.post("/TestingManager/SampleHelper/approve", data);
// V3: 请求体不变，仍为 { sample_ids: [int] }
export const batchApproveSampleHelper = data => instance.post("/TestingManager/SampleHelper/batchApprove", data);
// V3: method_id 由 int 改为 {item_id, method_id} 对象
export const rejectSampleHelper = data => instance.post("/TestingManager/SampleHelper/reject", data);
// V3: 请求体不变，仍为 { sample_ids: [int] }
export const batchRejectSampleHelper = data => instance.post("/TestingManager/SampleHelper/batchReject", data);