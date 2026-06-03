import instance from './request';

export const readTaskProcessingManager = data => instance.post("/ProcessingManager/Task/read", data);
export const readSampleProcessingManager = data => instance.post("/ProcessingManager/Sample/read", data);
export const approveSampleProcessingManager = data => instance.post("/ProcessingManager/Sample/approve", data);