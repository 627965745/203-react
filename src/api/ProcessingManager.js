import instance from './request';

// V4: 样品统计子查询新增 processor_id = 当前登录用户ID —— 只返回"当前用户有加工样品"的任务
export const readTaskProcessingManager = data => instance.post("/ProcessingManager/Task/read", data);
// V2: 过滤条件由 sample_items.processing_status>0 改为 samples.processing_status>0；返回 processing 上提到样品级
// V4: 查询条件新增 processor_id = 当前登录用户ID —— 只返回当前用户负责加工的样品。
//     列表为空通常是没有样品分配给该用户加工，而不是系统错误。
export const readSampleProcessingManager = data => instance.post("/ProcessingManager/Sample/read", data);
// V2: 请求体移除 item_ids，完成加工直接更新 samples.processing_status=2
// V4: 更新条件新增 processor_id = 当前登录用户ID —— 只有作为加工责任人才能完成审批。
//     请求体不变，但需处理后端返回的"无权审批 / 无改动"类提示。
export const approveSampleProcessingManager = data => instance.post("/ProcessingManager/Sample/approve", data);