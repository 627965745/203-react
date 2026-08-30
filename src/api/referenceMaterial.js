import instance from './request';

// V5: 本模块由「标准物质」收窄为「标准溶液 / 基准试剂」（实验室配制的材料）——
//     外购定值的标准样品（带成分含量表）已拆分到全新模块 ReferenceSample。
//     create / update / prepare 请求字段变化：
//       · category 由 0标准物质/1标准溶液/2基准试剂 改为 0标准溶液 / 1基准试剂（只传 0/1）
//       · lab_code 由可空改为必填
//       · 删除 mass_concentration、medium_concentration
//       · 新增必填 concentration（浓度 %，0~100）
//       · uncertainty 由可空改为必填（0~100）
export const createReferenceMaterial = data => instance.post("/ReagentAdmin/ReferenceMaterial/create", data);
// V5: 响应新增 concentration；删除 mass_concentration / medium_concentration；
//     不再返回 components 数组（成分功能迁至 ReferenceSample）；parents（配制来源）保持不变
export const readReferenceMaterial = data => instance.post("/ReagentAdmin/ReferenceMaterial/read", data);
export const updateReferenceMaterial = data => instance.post("/ReagentAdmin/ReferenceMaterial/update", data);
export const deleteReferenceMaterial = data => instance.post("/ReagentAdmin/ReferenceMaterial/delete", data);
export const comboReferenceMaterial = data => instance.post("/ReagentAdmin/ReferenceMaterial/combo", data);
export const prepareReferenceMaterial = data => instance.post("/ReagentAdmin/ReferenceMaterial/prepare", data);
export const useReferenceMaterial = data => instance.post("/ReagentAdmin/ReferenceMaterial/use", data);
// V5: componentCreate / componentUpdate / componentDelete 三个接口已移除 ——
//     成分管理整体迁移到 ReferenceSample（见 api/referenceSample.js）
