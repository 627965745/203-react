import instance from './request';

export const createTestItem = data => instance.post("/Admin/TestItem/create", data);
export const readTestItem = data => instance.post("/Admin/TestItem/read", data);
export const updateTestItem = data => instance.post("/Admin/TestItem/update", data);
export const deleteTestItem = data => instance.post("/Admin/TestItem/delete", data);
export const comboTestItem = data => instance.post("/Admin/TestItem/combo", data);
