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
export const arrangeTestMethod = data => instance.post("/ResourceAdmin/TestMethod/arrange", data);
export const itemTestMethod = data => instance.post("/ResourceAdmin/TestMethod/item", data);