import instance from './request';

// V4: 样品统计子查询新增 processor_id = 当前登录用户ID —— 只返回"当前用户有加工样品"的任务
// V6: 响应中 tasks 的 category → commission_type、delivered_by → delivery_type（纯改名，取值不变）
export const readTaskProcessingManager = data => instance.post("/ProcessingManager/Task/read", data);
// V2: 过滤条件由 sample_items.processing_status>0 改为 samples.processing_status>0；返回 processing 上提到样品级
// V4: 查询条件新增 processor_id = 当前登录用户ID —— 只返回当前用户负责加工的样品。
//     列表为空通常是没有样品分配给该用户加工，而不是系统错误。
// V5: 响应每行样品新增 batch（批次，null 表示未分批）。请求体新增可选 batch：
//     不传=不过滤；0=仅未分批(batch IS NULL)；N(≥1)=仅第 N 批。
//     参比样字段：文档原文称本接口仍返回旧字段名 reference_material_id / reference_material_name，
//     注解中已标注后端修复为 reference_sample_*，前端两种字段名都做兼容。
export const readSampleProcessingManager = data => instance.post("/ProcessingManager/Sample/read", data);
// V2: 请求体移除 item_ids，完成加工直接更新 samples.processing_status=2
// V4: 更新条件新增 processor_id = 当前登录用户ID —— 只有作为加工责任人才能完成审批。
//     请求体不变，但需处理后端返回的"无权审批 / 无改动"类提示。
// V5: 新增可选参数 batch —— 仅在与 task_id 联用时生效，把作用范围收窄到该批次；
//     没有"0 = 未分批"的特殊语义，要么不传、要么传实际批次号(≥1)。
export const approveSampleProcessingManager = data => instance.post("/ProcessingManager/Sample/approve", data);