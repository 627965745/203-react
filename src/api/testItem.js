import instance from './request';

export const createTestItem = data => instance.post("/ResourceAdmin/TestItem/create", data);
export const readTestItem = data => instance.post("/ResourceAdmin/TestItem/read", data);
export const updateTestItem = data => instance.post("/ResourceAdmin/TestItem/update", data);
export const deleteTestItem = data => instance.post("/ResourceAdmin/TestItem/delete", data);
export const comboTestItem = data => instance.post("/ResourceAdmin/TestItem/combo", data);
export const fieldCreateTestItem = data => instance.post("/ResourceAdmin/TestItem/fieldCreate", data);
export const fieldUpdateTestItem = data => instance.post("/ResourceAdmin/TestItem/fieldUpdate", data);
export const fieldDeleteTestItem = data => instance.post("/ResourceAdmin/TestItem/fieldDelete", data);
export const arrangeTestItem = data => instance.post("/ResourceAdmin/TestItem/arrange", data);
// V2: /method 请求体由 id:int 改为 ids:list[int]（调用方负责传 ids）
// V3: 响应不再含 processing_options 字段，仅返回该 item 下方法的 { id, name } 列表；
//     加工选项改为按 method id 查询 TestMethod/processingOption（见 api/testMethod.js）。
//     样品分派检测方法的级联选择也不再用本接口懒加载，改为 TestMethod/relation 一次性拿三级数据。
//     注意：一次传入多个 item id 时，响应是跨项目的方法并集，不再区分某个方法属于哪个 item——
//     若某处仍需保留 item↔method 关联，必须逐个 item 单独调用（ids: [singleItemId]）
export const methodTestItem = data => instance.post("/ResourceAdmin/TestItem/method", data);
