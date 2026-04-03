import instance from './request';

export const createReagentStorage = data => instance.post("/Admin/ReagentStorage/create", data);
export const readReagentStorage = data => instance.post("/Admin/ReagentStorage/read", data);
export const updateReagentStorage = data => instance.post("/Admin/ReagentStorage/update", data);
export const deleteReagentStorage = data => instance.post("/Admin/ReagentStorage/delete", data);
export const comboReagentStorage = data => instance.post("/Admin/ReagentStorage/combo", data);
