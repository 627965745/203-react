import instance from './request';

// Task Management
// V6: 响应中 tasks 的 category → commission_type、delivered_by → delivery_type（纯改名，取值不变）
export const readTestingTask = data => instance.post("/TestingManager/Task/read", data);
// V5: 导出的 Excel 中每个结果字段新增 device_id / device_name / created_at / updated_at 列，
//     导出入口与请求参数不变
export const exportTestingTask = data => instance.post("/TestingManager/Task/export", data, { responseType: 'blob' });

// Sample Management
// V5: 响应每行样品新增 batch（批次，null 表示未分批）；参比样字段由 reference_material_id /
//     reference_material_name 改名为 reference_sample_id / reference_sample_name。
//     请求体新增可选 batch：不传=不过滤；0=仅未分批(batch IS NULL)；N(≥1)=仅第 N 批
// V6: 请求体新增可选 is_creator（0/1，不传同 0）——
//       不传/0：原逻辑，返回"分配给我的方法的样品"或"我创建的样品"
//       1：仅返回我创建的样品
//     响应中 methods[].results[] 的每个结果对象新增 experimented_at（实验时间，YYYY-MM-DD 或 null）。
export const readTestingSample = data => instance.post("/TestingManager/Sample/read", data);
// V6.1: 实测该接口的 batch 同样无效 —— 整条记录原样回传、只改 batch，返回 status=0 但写不进去。
//     只有 WorkflowManager/Sample/update 会真正写入。前端已把该模块的批次号输入框置灰。
export const updateTestingSample = data => instance.post("/TestingManager/Sample/update", data);
export const deleteTestingSample = data => instance.post("/TestingManager/Sample/delete", data);
export const comboTestingSample = data => instance.post("/TestingManager/Sample/combo", data);
// V4: 业务逻辑同 WorkflowManager —— task_id 必传；重复样(type=3)必须传 parent_id；
//     client_code 由后端自动生成
// V5: 参比样字段 reference_material_id 改名为 reference_sample_id（指向标准样品）；
//     新增可选 batch（整数 ≥1），指定新建对照样所属批次
// V6.1: 实测该接口的 batch 参数无效 —— 传 batch=9 返回 status=0，但建出来的样品 batch 仍为 null。
//     只有 WorkflowManager/Sample/reference 会真正写入。前端已隐藏该模块的批次号输入框，
//     待后端修复后可恢复（见 SpecialSampleModal 的 supportsBatch）。
export const referenceTestingSample = data => instance.post("/TestingManager/Sample/reference", data);
// V4: 新增接口 —— 按比例(ratio)生成重复样，基于 tester_id 做权限隔离；
//     检测维度生成的重复样，其方法初始 status=2（已分配检测人）。
//     task_id 必传：即使已经给了 sample_ids 缩小范围，也要一并带上 task_id。
export const duplicateTestingSample = data => instance.post("/TestingManager/Sample/duplicate", data);

// V5: 以下批量操作新增可选参数 batch —— 仅在与 task_id 联用时生效，把作用范围收窄到该批次：
//     methodCreate / methodDelete / approve / rollback / template。
//     这里的 batch 没有"0 = 未分批"的特殊语义，要么不传（全部批次）、要么传实际批次号(≥1)。

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
// V5: 请求体新增必填 device_id —— 检测结果关联所用设备（关联 devices 表），
//     设备下拉沿用现有设备管理接口 DeviceAdmin/Device/combo
// V6: 请求体新增必填 experimented_at —— 实验时间，日期格式 YYYY-MM-DD
//     （对应 sample_results 新增的 experimented_at 列）
export const resultCreateTestingSample = data => instance.post("/TestingManager/Sample/resultCreate", data);
// V3: 请求体新增必填 item_id
export const resultDeleteTestingSample = data => instance.post("/TestingManager/Sample/resultDelete", data);
// V3: method_id 由 int 改为 {item_id, method_id} 对象；下载文件名固定为 结果录入模板.xlsx（前端自行命名，不受影响）
export const templateTestingSample = data => instance.post("/TestingManager/Sample/template", data, { responseType: 'blob' });
// V5: multipart 表单新增字段 device_ids —— JSON 字符串，结果字段ID → 设备ID 的映射，
//     如 '{"3": 5, "4": 7}'；该次上传中对应字段的结果会记上设备。
//     （文档提到的后端键类型不匹配问题，注解中已标注修复。）
// V6: multipart 表单新增必填字段 experimented_at —— 实验时间 YYYY-MM-DD，
//     本次上传的全部结果统一使用该日期。
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