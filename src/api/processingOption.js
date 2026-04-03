import instance from './request';

export const createProcessingOption = data => instance.post("/Admin/ProcessingOption/create", data);
export const readProcessingOption = data => instance.post("/Admin/ProcessingOption/read", data);
export const updateProcessingOption = data => instance.post("/Admin/ProcessingOption/update", data);
export const deleteProcessingOption = data => instance.post("/Admin/ProcessingOption/delete", data);
export const comboProcessingOption = data => instance.post("/Admin/ProcessingOption/combo", data);
