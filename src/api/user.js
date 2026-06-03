import instance from './request';

export const getLogin = data => instance.post("/Common/Login/login", data);
export const checkUser = (config = {}) => instance.get("/Common/User/check", config);
export const getLoginUserInfo = () => instance.get("/Common/User/info");
export const logout = () => instance.get("/Common/User/logout");
export const userReset = data => instance.post("/Common/User/reset", data);
export const getCaptcha = (config = {}) => instance.get(`/Common/Captcha/get?t=${new Date().getTime()}`, config);


// Admin User APIs
export const createUser = data => instance.post("/SystemAdmin/User/create", data);
export const readUser = data => instance.post("/SystemAdmin/User/read", data);
export const updateUser = data => instance.post("/SystemAdmin/User/update", data);
export const deleteUser = data => instance.post("/SystemAdmin/User/delete", data);
export const comboUser = data => instance.post("/SystemAdmin/User/combo", data);
export const resetUser = data => instance.post("/SystemAdmin/User/reset", data);
export const arrangeUser = data => instance.post("/SystemAdmin/User/arrange", data);
