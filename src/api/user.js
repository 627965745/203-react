import instance from './request';

export const getLogin = data => instance.post("/common/login/login", data);
export const checkUser = () => instance.get("/common/user/check");
export const getLoginUserInfo = () => instance.get("/common/user/info");
export const logout = () => instance.get("/common/user/logout");
export const userReset = data => instance.post("/common/user/reset", data);
export const getCaptcha = () => instance.get("/common/captcha/get");


// Admin User APIs
export const createUser = data => instance.post("/Admin/User/create", data);
export const readUser = data => instance.post("/Admin/User/read", data);
export const updateUser = data => instance.post("/Admin/User/update", data);
export const deleteUser = data => instance.post("/Admin/User/delete", data);
export const comboUser = data => instance.post("/Admin/User/combo", data);
export const resetUser = data => instance.post("/Admin/User/reset", data);
