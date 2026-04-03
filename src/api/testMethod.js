import instance from './request';

export const createTestMethod = data => instance.post("/Admin/TestMethod/create", data);
export const readTestMethod = data => instance.post("/Admin/TestMethod/read", data);
export const updateTestMethod = data => instance.post("/Admin/TestMethod/update", data);
export const deleteTestMethod = data => instance.post("/Admin/TestMethod/delete", data);
export const comboTestMethod = data => instance.post("/Admin/TestMethod/combo", data);
