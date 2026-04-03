import instance from './request';

export const createReagent = data => instance.post("/Admin/Reagent/create", data);
export const readReagent = data => instance.post("/Admin/Reagent/read", data);
export const updateReagent = data => instance.post("/Admin/Reagent/update", data);
export const deleteReagent = data => instance.post("/Admin/Reagent/delete", data);
export const comboReagent = data => instance.post("/Admin/Reagent/combo", data);
