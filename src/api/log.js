import instance from './request';

export const readLog = data => instance.post("/SystemAdmin/Log/read", data);