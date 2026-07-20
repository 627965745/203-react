import instance from "./request";
// V2: 共享文件的创建人字段由 user_id 重命名为 creator_id（read 返回 creator_id）。
//     当前列表页仅展示 名称/链接，未消费该字段，如后续需展示创建人请使用 creator_id / creator_name。
export const readResourceAdminShare = data => instance.post("/ResourceAdmin/Share/read", data);
export const deleteResourceAdminShare = data => instance.post("/ResourceAdmin/Share/delete", data);
export const updateResourceAdminShare = data => instance.post("/ResourceAdmin/Share/update", data);
export const createResourceAdminShare = data => instance.post("/ResourceAdmin/Share/create", data);