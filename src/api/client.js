import instance from './request';

export const createClient = data => instance.post("/Admin/Client/create", data);
export const readClient = data => instance.post("/Admin/Client/read", data);
export const updateClient = data => instance.post("/Admin/Client/update", data);
export const deleteClient = data => instance.post("/Admin/Client/delete", data);
export const comboClient = data => instance.post("/Admin/Client/combo", data);
