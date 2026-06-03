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
export const methodTestItem = data => instance.post("/ResourceAdmin/TestItem/method", data);
