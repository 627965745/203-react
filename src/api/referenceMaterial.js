import instance from './request';

export const createReferenceMaterial = data => instance.post("/Admin/ReferenceMaterial/create", data);
export const readReferenceMaterial = data => instance.post("/Admin/ReferenceMaterial/read", data);
export const updateReferenceMaterial = data => instance.post("/Admin/ReferenceMaterial/update", data);
export const deleteReferenceMaterial = data => instance.post("/Admin/ReferenceMaterial/delete", data);
export const comboReferenceMaterial = data => instance.post("/Admin/ReferenceMaterial/combo", data);
