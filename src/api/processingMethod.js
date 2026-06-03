import instance from './request';

export const createProcessingMethod = data => instance.post("/ResourceAdmin/ProcessingMethod/create", data);
export const readProcessingMethod = data => instance.post("/ResourceAdmin/ProcessingMethod/read", data);
export const updateProcessingMethod = data => instance.post("/ResourceAdmin/ProcessingMethod/update", data);
export const deleteProcessingMethod = data => instance.post("/ResourceAdmin/ProcessingMethod/delete", data);
export const comboProcessingMethod = data => instance.post("/ResourceAdmin/ProcessingMethod/combo", data);

// 第二阶段 加工选项接口
export const createProcessingOption = data => instance.post("/ResourceAdmin/ProcessingMethod/optionCreate", data);
export const updateProcessingOption = data => instance.post("/ResourceAdmin/ProcessingMethod/optionUpdate", data);
export const deleteProcessingOption = data => instance.post("/ResourceAdmin/ProcessingMethod/optionDelete", data);
