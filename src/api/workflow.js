import instance from './request';

export const createTask = data => instance.post("/WorkflowManager/Task/create", data);
export const readTask = data => instance.post("/WorkflowManager/Task/read", data);
export const updateTask = data => instance.post("/WorkflowManager/Task/update", data);
export const deleteTask = data => instance.post("/WorkflowManager/Task/delete", data);
export const comboTask = data => instance.post("/WorkflowManager/Task/combo", data);
// V3: 请求体 item_ids: [int] 改为 method_ids: [{item_id, method_id}]
export const templateTask = data => instance.post("/WorkflowManager/Task/template", data, { responseType: 'blob' });
// V4: 样品插入由 INSERT 改为 INSERT IGNORE —— 同一任务下 client_code 已存在时不再报错，
//     后端会取已有样品ID并对其 sample_inputs / sample_methods 执行 ON DUPLICATE KEY UPDATE，
//     即"已存在的样品会被更新"。新增样品的 processor_id 为 NULL。
export const uploadTask = data => instance.post("/WorkflowManager/Task/upload", data);
export const exportTask = data => instance.post("/WorkflowManager/Task/export", data);
export const createSample = data => instance.post("/WorkflowManager/Sample/create", data);
// V4: 响应每行样品新增 processor_id（加工责任人ID，samples.processor_id）
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
// 需求变更：processCreate 接口已取消 —— 加工的添加/修改统一用 processUpdate（整体覆盖当前
// 配置；option_ids 为空等同于清空加工），processDelete 仍保留，两者删除效果等价，用哪个都可以。
// V4: 请求体新增 processor_id（加工人ID）与 default（是否使用默认加工选项，bool）。
//     只有同时满足 ①processor_id 非空 ②deadline 非空 ③default=true 或 option_ids 非空
//     三个条件，后端才会把样品置为加工中（processing_status=1）；否则会清空这些样品的
//     processor_id / processing_status / processing_deadline（等同于取消加工）。
//     default=true 时后端按样品已关联的检测方法从 test_methods_processing_options 自动
//     匹配默认加工选项，前端无需在 option_ids 中传值。
export const processUpdateSample = data => instance.post("/WorkflowManager/Sample/processUpdate", data);
// V4: 行为变化 —— 除 processing_status / processing_deadline 外，同时清空 processor_id
export const processDeleteSample = data => instance.post("/WorkflowManager/Sample/processDelete", data);
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const distributeSample = data => instance.post("/WorkflowManager/Sample/distribute", data);
// V4: task_id 必传。业务逻辑变化 —— 空白样(type=1) reference_material_id / parent_id 均为空；
//     标准样(type=2) 必传 reference_material_id 且 parent_id 为空；
//     重复样(type=3) 必传 parent_id 且 reference_material_id 为空（v3 的"留空随机分配父样品"已取消）。
//     client_code 不再由前端传固定名称，改由后端 helper.frankID() 自动生成。
//     部分非法输入的错误码由 102 调整为 101，前端按统一错误处理展示 message 即可。
export const referenceSample = data => instance.post("/WorkflowManager/Sample/reference", data);
// V4: 新增接口 —— 按比例(ratio)从任务或指定样品的普通样(type=0)复制生成重复样(type=3)，
//     复制对应方法的 item_id / method_id，client_code 由后端生成。
//     task_id 必传：即使已经给了 sample_ids 缩小范围，也要一并带上 task_id。
//     工作流维度生成的重复样，其方法初始 status=0（待分配）。
export const duplicateSample = data => instance.post("/WorkflowManager/Sample/duplicate", data);
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const approveSample = data => instance.post("/WorkflowManager/Sample/approve", data);
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const rejectSample = data => instance.post("/WorkflowManager/Sample/reject", data);


