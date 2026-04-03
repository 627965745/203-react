import instance from './request';

export const createAnalysisType = data => instance.post("/Admin/AnalysisType/create", data);
export const readAnalysisType = data => instance.post("/Admin/AnalysisType/read", data);
export const updateAnalysisType = data => instance.post("/Admin/AnalysisType/update", data);
export const deleteAnalysisType = data => instance.post("/Admin/AnalysisType/delete", data);
export const comboAnalysisType = data => instance.post("/Admin/AnalysisType/combo", data);
