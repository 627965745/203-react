import instance from './request';

export const createTask = data => instance.post("/WorkflowManager/Task/create", data);
export const readTask = data => instance.post("/WorkflowManager/Task/read", data);
export const updateTask = data => instance.post("/WorkflowManager/Task/update", data);
export const deleteTask = data => instance.post("/WorkflowManager/Task/delete", data);
export const comboTask = data => instance.post("/WorkflowManager/Task/combo", data);
export const templateTask = data => instance.post("/WorkflowManager/Task/template", data, { responseType: 'blob' });
export const uploadTask = data => instance.post("/WorkflowManager/Task/upload", data);
export const exportTask = data => instance.post("/WorkflowManager/Task/export", data);
export const createSample = data => instance.post("/WorkflowManager/Sample/create", data);
export const readSample = data => instance.post("/WorkflowManager/Sample/read", data);
export const updateSample = data => instance.post("/WorkflowManager/Sample/update", data);
export const deleteSample = data => instance.post("/WorkflowManager/Sample/delete", data);
export const comboSample = data => instance.post("/WorkflowManager/Sample/combo", data);
export const inputCreateSample = data => instance.post("/WorkflowManager/Sample/inputCreate", data);
export const inputUpdateSample = data => instance.post("/WorkflowManager/Sample/inputUpdate", data);
export const inputDeleteSample = data => instance.post("/WorkflowManager/Sample/inputDelete", data);
export const itemCreateSample = data => instance.post("/WorkflowManager/Sample/itemCreate", data);
export const itemDeleteSample = data => instance.post("/WorkflowManager/Sample/itemDelete", data);
export const methodCreateSample = data => instance.post("/WorkflowManager/Sample/methodCreate", data);
export const methodUpdateSample = data => instance.post("/WorkflowManager/Sample/methodUpdate", data);
export const methodDeleteSample = data => instance.post("/WorkflowManager/Sample/methodDelete", data);
export const processCreateSample = data => instance.post("/WorkflowManager/Sample/processCreate", data);
export const processUpdateSample = data => instance.post("/WorkflowManager/Sample/processUpdate", data);
export const processDeleteSample = data => instance.post("/WorkflowManager/Sample/processDelete", data);
export const distributeSample = data => instance.post("/WorkflowManager/Sample/distribute", data);
export const referenceSample = data => instance.post("/WorkflowManager/Sample/reference", data);
export const approveSample = data => instance.post("/WorkflowManager/Sample/approve", data);
export const rejectSample = data => instance.post("/WorkflowManager/Sample/reject", data);


