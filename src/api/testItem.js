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
// V2: /method 请求体由 id:int 改为 ids:list[int]，返回的每个方法新增 processing_options 数组（调用方负责传 ids）
export const methodTestItem = data => instance.post("/ResourceAdmin/TestItem/method", data);
