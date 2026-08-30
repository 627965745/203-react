import instance from './request';

// V5: 全新模块「标准样品」（ReferenceSample）—— 从 v4 的 ReferenceMaterial 拆分而来。
//     管理外购定值的标准物质（带成分含量表），无 category 字段；
//     v4 中 ReferenceMaterial 的成分接口（componentCreate/Update/Delete）整体迁移到本模块。
//     样品的「参比样」(samples.reference_sample_id) 现在指向本模块。
export const createReferenceSample = data => instance.post("/ReagentAdmin/ReferenceSample/create", data);
// V5: 请求 { query, physical_state, page, rows }；响应行含 components[] 成分数组，
//     数值字段（specification/remaining/alert_threshold）以字符串形式返回，前端按需 Number() 转换。
export const readReferenceSample = data => instance.post("/ReagentAdmin/ReferenceSample/read", data);
// V5: 在 create 字段基础上增加 id 与 remaining（余量不可大于规格，否则 status=101）
export const updateReferenceSample = data => instance.post("/ReagentAdmin/ReferenceSample/update", data);
export const deleteReferenceSample = data => instance.post("/ReagentAdmin/ReferenceSample/delete", data);
// V5: 返回 [{id, name}]，取代原先样品参比样下拉使用的 ReferenceMaterial/combo
export const comboReferenceSample = data => instance.post("/ReagentAdmin/ReferenceSample/combo", data);
// V5: { id, used } —— 领用扣减余量
export const useReferenceSample = data => instance.post("/ReagentAdmin/ReferenceSample/use", data);
// V5: 成分接口由 ReferenceMaterial 迁入 —— 主键字段 material_id → sample_id、
//     标准值字段 value → concentration；uncertainty 单位语义为百分比(0~100)
export const componentCreateReferenceSample = data => instance.post("/ReagentAdmin/ReferenceSample/componentCreate", data);
export const componentUpdateReferenceSample = data => instance.post("/ReagentAdmin/ReferenceSample/componentUpdate", data);
// V5: { sample_id, component }
export const componentDeleteReferenceSample = data => instance.post("/ReagentAdmin/ReferenceSample/componentDelete", data);
