import instance from './request';

export const createTaskType = data => instance.post("/ResourceAdmin/TaskSampleType/create", data);
export const readTaskType = data => instance.post("/ResourceAdmin/TaskSampleType/read", data);
export const updateTaskType = data => instance.post("/ResourceAdmin/TaskSampleType/update", data);
export const deleteTaskType = data => instance.post("/ResourceAdmin/TaskSampleType/delete", data);
export const comboTaskType = data => instance.post("/ResourceAdmin/TaskSampleType/combo", data);
