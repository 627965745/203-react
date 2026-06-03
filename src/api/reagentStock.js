import instance from './request';

export const createReagentStock = data => instance.post("/ReagentAdmin/ReagentStock/create", data);
export const readReagentStock = data => instance.post("/ReagentAdmin/ReagentStock/read", data);
export const updateReagentStock = data => instance.post("/ReagentAdmin/ReagentStock/update", data);
export const deleteReagentStock = data => instance.post("/ReagentAdmin/ReagentStock/delete", data);
export const actionReagentStock = data => instance.post("/ReagentAdmin/ReagentStock/action", data);
export const logsReagentStock = data => instance.post("/ReagentAdmin/ReagentStock/logs", data);
export const logsExportReagentStock = data => instance.post("/ReagentAdmin/ReagentStock/logsExport", data);
export const detailReagentStock = data => instance.post("/ReagentAdmin/ReagentStock/detail", data);
