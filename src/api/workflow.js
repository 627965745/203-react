import instance from './request';

// V6: tasks 表两个字段改名（纯改名，取值不变）——
//     category → commission_type（检测类别：0委托检测/1监督检测/2其他）
//     delivered_by → delivery_type（来样方式：0客户邮寄/1客户送检/2自采）
//     create/update 请求体与 read 响应体都改用新字段名。
export const createTask = data => instance.post("/WorkflowManager/Task/create", data);
export const readTask = data => instance.post("/WorkflowManager/Task/read", data);
export const updateTask = data => instance.post("/WorkflowManager/Task/update", data);
export const deleteTask = data => instance.post("/WorkflowManager/Task/delete", data);
export const comboTask = data => instance.post("/WorkflowManager/Task/combo", data);
// V3: 请求体 item_ids: [int] 改为 method_ids: [{item_id, method_id}]
// V5: 请求体大幅简化 —— 只保留 method_ids（必填，至少 1 项），client_id / receiver_id / task_id
//     全部移除（模板「元数据」表中的 F1/F2/F3 已删除，改由上传时以表单字段提交）。
//     下载文件名由「客户名」改为固定「送样单」；模板本身已改版（基础信息行上移一行，B2~B11），
//     v4 的旧模板文件不能再用于上传。
// V6: 请求不变（仍只传 method_ids），但模板再次改版 —— 元数据表不再输出「样品类型/分析类型」
//     下拉选项，也不再预填截止日期；基础信息只剩 B2 任务名称 / B3 联系人 / B4 联系方式 /
//     B5 物态 / B6 备注。必须使用 v6.1 新模板，旧模板上传会解析失败。
export const templateTask = data => instance.post("/WorkflowManager/Task/template", data, { responseType: 'blob' });
// V4: 样品插入由 INSERT 改为 INSERT IGNORE —— 同一任务下 client_code 已存在时不再报错，
//     后端会取已有样品ID并对其 sample_inputs / sample_methods 执行 ON DUPLICATE KEY UPDATE，
//     即"已存在的样品会被更新"。新增样品的 processor_id 为 NULL。
// V5: 元数据不再从 Excel 里读，改为 multipart 表单字段一并提交 ——
//     file(必填) / client_id(必填) / receiver_id(必填) / task_id(可选，传则追加到已有任务) /
//     batch(可选，≥1，写入本单全部样品的批次)。
// V6: 表单字段再次增加 —— 原先从 Excel B5/B6/B8/B9/B10 读取的任务级信息全部改为表单提交：
//     sample_type_id(必填) / analysis_type_id(必填) / commission_type(必填,0委托/1监督/2其他) /
//     delivery_type(必填,0邮寄/1送检/2自采) / deadline(必填, YYYY-MM-DD)。
//     task_id 传入时是"追加到已有任务"，上述任务级字段不参与建任务（但仍需通过参数校验）。
//     batch 只能传 ≥1 的整数或不传，传 0 会被参数校验拦截（status=10）。
export const uploadTask = data => instance.post("/WorkflowManager/Task/upload", data);
// V5: 导出的 Excel 中每个结果字段新增 device_id / device_name / created_at / updated_at 列，
//      导出入口与请求参数不变
export const exportTask = data => instance.post("/WorkflowManager/Task/export", data);
// V5: 请求体新增可选 batch（整数 ≥1，不传则为 NULL 表示未分批）
export const createSample = data => instance.post("/WorkflowManager/Sample/create", data);
// V4: 响应每行样品新增 processor_id（加工责任人ID，samples.processor_id）
// V5: 响应每行样品新增 batch（批次，null 表示未分批）；参比样字段由 reference_material_id /
//     reference_material_name 改名为 reference_sample_id / reference_sample_name。
//     请求体新增两个可选筛选参数：
//       · batch：不传=不过滤；0=仅未分批(batch IS NULL)；N(≥1)=仅第 N 批
//       · type：0~3 按样品类型筛选（0非对照样/1空白样/2标准样/3重复样），不传=不过滤
// V6: 响应中 methods[].results[] 的每个结果对象新增 experimented_at（实验时间，
//     YYYY-MM-DD 或 null）。
export const readSample = data => instance.post("/WorkflowManager/Sample/read", data);
// V5: 请求体接受 batch —— 文档原文称后端不写入，但后端已修复，现在会写入批次。
//     批量改批次仍建议走 batchSet。
export const updateSample = data => instance.post("/WorkflowManager/Sample/update", data);
// V5: 删除样品时后端会同时把该样品的 client_code 置为随机串（释放"任务内客户编号唯一"约束），
//     前端无感知；如有展示已删除样品的逻辑需注意其 client_code 已非原值。
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
// V5: 参比样改为指向「标准样品」—— 请求字段 reference_material_id 改名为 reference_sample_id
//     （标准样 type=2 必传），下拉数据源由 ReferenceMaterial/combo 改为 ReferenceSample/combo。
//     另新增可选 batch（整数 ≥1），指定新建对照样所属批次。
export const referenceSample = data => instance.post("/WorkflowManager/Sample/reference", data);
// V4: 新增接口 —— 按比例(ratio)从任务或指定样品的普通样(type=0)复制生成重复样(type=3)，
//     复制对应方法的 item_id / method_id，client_code 由后端生成。
//     task_id 必传：即使已经给了 sample_ids 缩小范围，也要一并带上 task_id。
//     工作流维度生成的重复样，其方法初始 status=0（待分配）。
// V5: 新增可选 batch —— 仅在用 task_id 整体复制时作为"只取该批次样品"的过滤条件；
//     复制出的重复样继承原样品的批次，不会写入这里传的值。
export const duplicateSample = data => instance.post("/WorkflowManager/Sample/duplicate", data);
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const approveSample = data => instance.post("/WorkflowManager/Sample/approve", data);
// V3: method_ids 由 list[int] 改为 list[{item_id, method_id}]
export const rejectSample = data => instance.post("/WorkflowManager/Sample/reject", data);

// V5: 新增接口 —— 批量设置样品批次。
//     请求 { sample_ids: [int]（必填，至少 1 个）, batch: int（必填，≥1，不能传 0）}。
//     后端暂未提供"清除批次"(batch=0/NULL) 的入口。
// V6: batch 支持清除批次 —— 传 0（或不传）会把所选样品的批次清为「未分批」(NULL)；
//     传 ≥1 仍是设置批次，行为不变。
export const batchSetSample = data => instance.post("/WorkflowManager/Sample/batchSet", data);

// V5: 以下批量操作新增可选参数 batch —— 仅在与 task_id 联用时生效，把作用范围收窄到该批次：
//     methodCreate / methodDelete / processUpdate / processDelete / approve / distribute / reject。
//     注意与 read 接口不同，这里的 batch 没有"0 = 未分批"的特殊语义，
//     要么不传（全部批次）、要么传实际批次号(≥1)。


