import instance from './request';

export const createTestCategory = data => instance.post("/Admin/TestCategory/create", data);
export const readTestCategory = data => instance.post("/Admin/TestCategory/read", data);
export const updateTestCategory = data => instance.post("/Admin/TestCategory/update", data);
export const deleteTestCategory = data => instance.post("/Admin/TestCategory/delete", data);
export const comboTestCategory = data => instance.post("/Admin/TestCategory/combo", data);
