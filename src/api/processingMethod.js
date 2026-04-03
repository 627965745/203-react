import instance from './request';

export const createProcessingMethod = data => instance.post("/Admin/ProcessingMethod/create", data);
export const readProcessingMethod = data => instance.post("/Admin/ProcessingMethod/read", data);
export const updateProcessingMethod = data => instance.post("/Admin/ProcessingMethod/update", data);
export const deleteProcessingMethod = data => instance.post("/Admin/ProcessingMethod/delete", data);
export const comboProcessingMethod = data => instance.post("/Admin/ProcessingMethod/combo", data);
