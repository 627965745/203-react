import instance from './request';

export const readTaskProcessingManager = data => instance.post("/ProcessingManager/Task/read", data);
// V2: 过滤条件由 sample_items.processing_status>0 改为 samples.processing_status>0；返回 processing 上提到样品级
export const readSampleProcessingManager = data => instance.post("/ProcessingManager/Sample/read", data);
// V2: 请求体移除 item_ids，完成加工直接更新 samples.processing_status=2
export const approveSampleProcessingManager = data => instance.post("/ProcessingManager/Sample/approve", data);