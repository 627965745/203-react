import instance from './request';

export const createAnalysisType = data => instance.post("/ResourceAdmin/TaskAnalysisType/create", data);
export const readAnalysisType = data => instance.post("/ResourceAdmin/TaskAnalysisType/read", data);
export const updateAnalysisType = data => instance.post("/ResourceAdmin/TaskAnalysisType/update", data);
export const deleteAnalysisType = data => instance.post("/ResourceAdmin/TaskAnalysisType/delete", data);
export const comboAnalysisType = data => instance.post("/ResourceAdmin/TaskAnalysisType/combo", data);
