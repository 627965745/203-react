import instance from './request';

export const createClient = data => instance.post("/ResourceAdmin/Client/create", data);
export const readClient = data => instance.post("/ResourceAdmin/Client/read", data);
export const updateClient = data => instance.post("/ResourceAdmin/Client/update", data);
export const deleteClient = data => instance.post("/ResourceAdmin/Client/delete", data);
export const comboClient = data => instance.post("/ResourceAdmin/Client/combo", data);
