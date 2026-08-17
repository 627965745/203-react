import instance from './request';

export const createTestMethod = data => instance.post("/ResourceAdmin/TestMethod/create", data);
export const readTestMethod = data => instance.post("/ResourceAdmin/TestMethod/read", data);
export const updateTestMethod = data => instance.post("/ResourceAdmin/TestMethod/update", data);
export const deleteTestMethod = data => instance.post("/ResourceAdmin/TestMethod/delete", data);
export const comboTestMethod = data => instance.post("/ResourceAdmin/TestMethod/combo", data);

export const fieldCreateTestMethod = data => instance.post("/ResourceAdmin/TestMethod/fieldCreate", data);
export const fieldUpdateTestMethod = data => instance.post("/ResourceAdmin/TestMethod/fieldUpdate", data);
export const fieldDeleteTestMethod = data => instance.post("/ResourceAdmin/TestMethod/fieldDelete", data);
export const fieldTestMethod = data => instance.post("/ResourceAdmin/TestMethod/field", data);
// V2: 端点由 /arrange 重命名为 /itemArrange（方法↔项目关联，请求体不变）
export const itemArrangeTestMethod = data => instance.post("/ResourceAdmin/TestMethod/itemArrange", data);
// V2: 新增端点，批量维护 方法↔加工选项 关联
export const processingOptionArrangeTestMethod = data => instance.post("/ResourceAdmin/TestMethod/processingOptionArrange", data);
// V2: /item 请求体由 id:int 改为 ids:list[int]（调用方负责传 ids）
export const itemTestMethod = data => instance.post("/ResourceAdmin/TestMethod/item", data);
// V3: 新增端点（GET，非本文件其余 POST 接口的惯例——已实测确认），一次性返回
//     分类>检测项目>检测方法 三级关联数据 [{ id, name, items: [{ id, name, methods: [{ id, name }] }] }]，
//     取代原先"级联时用 TestItem/combo 拿分类+项目，再逐项目懒加载 TestItem/method 拿方法"的方式。
//     无需参数。
export const relationTestMethod = (params) => instance.get("/ResourceAdmin/TestMethod/relation", { params });
// V3: 新增端点（POST，已实测确认），按 method id(s) 查询其可用加工选项，取代原先经由
//     TestItem/method 附带 processing_options 字段的间接做法（该字段已从 TestItem/method 响应移除）。
//     请求体 { ids: [methodId, ...] }；响应 data 为按 method 分组的数组
//     [{ id(=method_id), processing_options: [{ id, processing_method_id, processing_method_name,
//     processing_option_value, created_at }] }]，需要的是各元素的 processing_options，不是 data 本身。
// V4: 加工配置界面已不再调用它 —— 默认加工选项改由后端在 processUpdate 时按 default 参数
//     自动匹配，前端无需先查出"建议的加工选项"。端点本身仍保留可用。
export const processingOptionTestMethod = data => instance.post("/ResourceAdmin/TestMethod/processingOption", data);