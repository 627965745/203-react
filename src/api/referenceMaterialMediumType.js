import instance from './request';

export const createReferenceMaterialMediumType = (data) =>
    instance.post("/ReagentAdmin/ReferenceMaterialMediumType/create", data);

export const readReferenceMaterialMediumType = (data) =>
    instance.post("/ReagentAdmin/ReferenceMaterialMediumType/read", data);

export const updateReferenceMaterialMediumType = (data) =>
    instance.post("/ReagentAdmin/ReferenceMaterialMediumType/update", data);

export const deleteReferenceMaterialMediumType = (data) =>
    instance.post("/ReagentAdmin/ReferenceMaterialMediumType/delete", data);

export const comboReferenceMaterialMediumType = (data) =>
    instance.post("/ReagentAdmin/ReferenceMaterialMediumType/combo", data);
