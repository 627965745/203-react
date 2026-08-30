import instance from './request';

export const createDepartment = data => instance.post("/SystemAdmin/Department/create", data);
export const readDepartment = (params) => instance.get("/SystemAdmin/Department/read", { params });
export const updateDepartment = data => instance.post("/SystemAdmin/Department/update", data);
export const deleteDepartment = data => instance.post("/SystemAdmin/Department/delete", data);
export const comboDepartment = data => instance.post("/SystemAdmin/Department/combo", data);

// Department Manager Task APIs
// V6: 响应中 tasks 的 category → commission_type、delivered_by → delivery_type（纯改名，取值不变）
export const readDepartmentTask = data => instance.post("/DepartmentManager/Task/read", data);
// V5: 导出的 Excel 中每个结果字段新增 device_id / device_name / created_at / updated_at 列，
//     导出入口与请求参数不变
export const exportDepartmentTask = data => instance.post("/DepartmentManager/Task/export", data, { responseType: 'blob' });

// Department Manager Sample APIs
// V5: 响应每行样品新增 batch（批次，null 表示未分批）；参比样字段由 reference_material_id /
//     reference_material_name 改名为 reference_sample_id / reference_sample_name。
//     请求体新增可选 batch：不传=不过滤；0=仅未分批(batch IS NULL)；N(≥1)=仅第 N 批
// V6: 请求体新增可选 is_creator（0/1，不传同 0）——
//       不传/0：原逻辑，返回"分配给我的方法的样品"或"我创建的样品"
//       1：仅返回我创建的样品
//     响应中 methods[].results[] 的每个结果对象新增 experimented_at（实验时间，YYYY-MM-DD 或 null）。
export const readDepartmentSample = data => instance.post("/DepartmentManager/Sample/read", data);
// V6.1: 实测该接口的 batch 同样无效 —— 整条记录原样回传、只改 batch，返回 status=0 但写不进去。
//     只有 WorkflowManager/Sample/update 会真正写入。前端已把该模块的批次号输入框置灰。
export const updateDepartmentSample = data => instance.post("/DepartmentManager/Sample/update", data);
export const deleteDepartmentSample = data => instance.post("/DepartmentManager/Sample/delete", data);
export const comboDepartmentSample = data => instance.post("/DepartmentManager/Sample/combo", data);
// V4: 业务逻辑同 WorkflowManager —— task_id 必传；重复样(type=3)必须传 parent_id；
//     client_code 由后端自动生成
// V5: 参比样字段 reference_material_id 改名为 reference_sample_id（指向标准样品）；
//     新增可选 batch（整数 ≥1），指定新建对照样所属批次
// V6.1: 实测该接口的 batch 参数无效 —— 传 batch=9 返回 status=0，但建出来的样品 batch 仍为 null。
//     只有 WorkflowManager/Sample/reference 会真正写入。前端已隐藏该模块的批次号输入框，
//     待后端修复后可恢复（见 SpecialSampleModal 的 supportsBatch）。
export const referenceDepartmentSample = data => instance.post("/DepartmentManager/Sample/reference", data);
// V4: 新增接口 —— 按比例(ratio)生成重复样，与 WorkflowManager/Sample/duplicate 类似，
//     但基于 department_id 做权限隔离；部门维度生成的重复样，其方法初始 status=1（已分配部门）。
//     task_id 必传：即使已经给了 sample_ids 缩小范围，也要一并带上 task_id。
export const duplicateDepartmentSample = data => instance.post("/DepartmentManager/Sample/duplicate", data);

// V5: 以下批量操作新增可选参数 batch —— 仅在与 task_id 联用时生效，把作用范围收窄到该批次：
//     methodCreate / methodDelete / helperCreate / helperDelete / approve / distribute /
//     reject / rollback。这里的 batch 没有"0 = 未分批"的特殊语义，
//     要么不传（全部批次）、要么传实际批次号(≥1)。

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
