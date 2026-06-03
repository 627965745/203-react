import instance from './request';

export const createReagent = data => instance.post("/ReagentAdmin/Reagent/create", data);
export const readReagent = data => instance.post("/ReagentAdmin/Reagent/read", data);
export const updateReagent = data => instance.post("/ReagentAdmin/Reagent/update", data);
export const deleteReagent = data => instance.post("/ReagentAdmin/Reagent/delete", data);
export const comboReagent = data => instance.post("/ReagentAdmin/Reagent/combo", data);
