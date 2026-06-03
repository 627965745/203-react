import instance from './request';

export const createReferenceMaterial = data => instance.post("/ReagentAdmin/ReferenceMaterial/create", data);
export const readReferenceMaterial = data => instance.post("/ReagentAdmin/ReferenceMaterial/read", data);
export const updateReferenceMaterial = data => instance.post("/ReagentAdmin/ReferenceMaterial/update", data);
export const deleteReferenceMaterial = data => instance.post("/ReagentAdmin/ReferenceMaterial/delete", data);
export const comboReferenceMaterial = data => instance.post("/ReagentAdmin/ReferenceMaterial/combo", data);
export const prepareReferenceMaterial = data => instance.post("/ReagentAdmin/ReferenceMaterial/prepare", data);
export const useReferenceMaterial = data => instance.post("/ReagentAdmin/ReferenceMaterial/use", data);
export const componentCreateReferenceMaterial = data => instance.post("/ReagentAdmin/ReferenceMaterial/componentCreate", data);
export const componentUpdateReferenceMaterial = data => instance.post("/ReagentAdmin/ReferenceMaterial/componentUpdate", data);
export const componentDeleteReferenceMaterial = data => instance.post("/ReagentAdmin/ReferenceMaterial/componentDelete", data);
