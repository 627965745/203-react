import instance from "./request";
export const readResourceAdminShare = data => instance.post("/ResourceAdmin/Share/read", data);
export const deleteResourceAdminShare = data => instance.post("/ResourceAdmin/Share/delete", data);
export const updateResourceAdminShare = data => instance.post("/ResourceAdmin/Share/update", data);
export const createResourceAdminShare = data => instance.post("/ResourceAdmin/Share/create", data);