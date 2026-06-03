import instance from './request';

export const createReagentStorage = data => instance.post("/ReagentAdmin/ReagentStorage/create", data);
export const readReagentStorage = data => instance.post("/ReagentAdmin/ReagentStorage/read", data);
export const updateReagentStorage = data => instance.post("/ReagentAdmin/ReagentStorage/update", data);
export const deleteReagentStorage = data => instance.post("/ReagentAdmin/ReagentStorage/delete", data);
export const comboReagentStorage = data => instance.post("/ReagentAdmin/ReagentStorage/combo", data);
