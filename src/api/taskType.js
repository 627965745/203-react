import instance from './request';

export const createTaskType = data => instance.post("/Admin/TaskType/create", data);
export const readTaskType = data => instance.post("/Admin/TaskType/read", data);
export const updateTaskType = data => instance.post("/Admin/TaskType/update", data);
export const deleteTaskType = data => instance.post("/Admin/TaskType/delete", data);
export const comboTaskType = data => instance.post("/Admin/TaskType/combo", data);
