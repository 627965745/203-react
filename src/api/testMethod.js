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