import instance from './request';

// Task Management
export const readTestingTask = data => instance.post("/TestingManager/Task/read", data);
export const exportTestingTask = data => instance.post("/TestingManager/Task/export", data, { responseType: 'blob' });

// Sample Management
export const readTestingSample = data => instance.post("/TestingManager/Sample/read", data);
export const updateTestingSample = data => instance.post("/TestingManager/Sample/update", data);
export const deleteTestingSample = data => instance.post("/TestingManager/Sample/delete", data);
export const referenceTestingSample = data => instance.post("/TestingManager/Sample/reference", data);
export const comboTestingSample = data => instance.post("/TestingManager/Sample/combo", data);

// Input Parameters (Limited to samples created by current user)
export const inputCreateTestingSample = data => instance.post("/TestingManager/Sample/inputCreate", data);
export const inputUpdateTestingSample = data => instance.post("/TestingManager/Sample/inputUpdate", data);
export const inputDeleteTestingSample = data => instance.post("/TestingManager/Sample/inputDelete", data);

// Item Management (Limited to samples created by current user)
export const itemCreateTestingSample = data => instance.post("/TestingManager/Sample/itemCreate", data);
export const itemDeleteTestingSample = data => instance.post("/TestingManager/Sample/itemDelete", data);

// Method Management (Limited to samples created by current user)
export const methodCreateTestingSample = data => instance.post("/TestingManager/Sample/methodCreate", data);
export const methodDeleteTestingSample = data => instance.post("/TestingManager/Sample/methodDelete", data);

// Result Management (Limited to samples created by current user)
export const resultCreateTestingSample = data => instance.post("/TestingManager/Sample/resultCreate", data);
export const resultDeleteTestingSample = data => instance.post("/TestingManager/Sample/resultDelete", data);
export const templateTestingSample = data => instance.post("/TestingManager/Sample/template", data, { responseType: 'blob' });
export const uploadTestingSample = data => instance.post("/TestingManager/Sample/upload", data);

export const approveTestingSample = data => instance.post("/TestingManager/Sample/approve", data);
export const rollbackTestingSample = data => instance.post("/TestingManager/Sample/rollback", data);

// Sample Helper Management
export const readSampleHelper = data => instance.post("/TestingManager/SampleHelper/read", data);
export const approveSampleHelper = data => instance.post("/TestingManager/SampleHelper/approve", data);
export const batchApproveSampleHelper = data => instance.post("/TestingManager/SampleHelper/batchApprove", data);
export const rejectSampleHelper = data => instance.post("/TestingManager/SampleHelper/reject", data);
export const batchRejectSampleHelper = data => instance.post("/TestingManager/SampleHelper/batchReject", data);