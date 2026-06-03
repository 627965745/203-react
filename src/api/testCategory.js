import instance from './request';

export const createTestCategory = data => instance.post("/ResourceAdmin/TestCategory/create", data);
export const readTestCategory = data => instance.post("/ResourceAdmin/TestCategory/read", data);
export const updateTestCategory = data => instance.post("/ResourceAdmin/TestCategory/update", data);
export const deleteTestCategory = data => instance.post("/ResourceAdmin/TestCategory/delete", data);
export const comboTestCategory = data => instance.post("/ResourceAdmin/TestCategory/combo", data);
