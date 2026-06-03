import axios from "axios";
import qs from "qs";
import { message } from 'antd'; // Add antd to mimic React's easier toast pattern

const qsOptions = {
    skipNulls: false,
    allowEmptyArrays: true,
    encode: true
};

export const stringifyData = (data) => {
    if (!data) return '';
    return qs.stringify(data, qsOptions);
};

const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "",
    timeout: 10000,
    headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest"
    },
    withCredentials: true
});

// Request interceptor mimicking older Vue logic but dropping Pinia class-wrapper bloat
instance.interceptors.request.use(
    (config) => {
        // 确保非 GET 请求始终带有 Content-Type
        if (config.method !== 'get') {
            if (!config.headers['Content-Type']) {
                config.headers['Content-Type'] = 'application/json';
            }
            // 如果是 POST/PUT 等请求但没有数据，强制设置为空对象 {}
            // 否则 Axios 会因为没有 Body 而不发送 Content-Type
            if (config.data === undefined || config.data === null) {
                config.data = {};
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
instance.interceptors.response.use(
    (response) => {
        // If status is not present, it's likely a direct resource (e.g. image) or a different format
        if (response.data.status === undefined) {
            return response;
        }

        const { status, message: msg } = response.data;
        
        if (status === 0) {
            // Success
            return response;
        } else if (status === 11) { 
            const errorMsg = msg || '用户组不匹配（无权限）';
            if (!response.config?._silent) {
                message.error(errorMsg);
            }
            return Promise.reject(new Error(errorMsg));
        } else if (status === 101) {
            const errorMsg = msg || '数据库无改动';
            message.warning(errorMsg);
            return Promise.reject(new Error(errorMsg));
        } else if (status === 102) {
            const errorMsg = msg || '数据库无改动（User.update专用）';
            message.warning(errorMsg);
            return Promise.reject(new Error(errorMsg));
        } else if (status === 103) {
            const errorMsg = msg || '数据库无改动（ReferenceMaterial.prepare专用）';
            message.warning(errorMsg);
            return Promise.reject(new Error(errorMsg));
        } else if (status === -1) {
            // Simplified React logout flow: just clear state and redirect or let Context handle it
            localStorage.clear();
            window.location.href = '/login'; 
            return Promise.reject(new Error("登录凭证已过期"));
        } else {
            // Other generic errors
            const errorMsg = msg || '发生未知错误，请稍后重试';
            // Allow opting out of global error messages via config._silent
            if (!response.config?._silent) {
                message.error(errorMsg);
            }
            return Promise.reject(new Error(errorMsg));
        }
    },
    (error) => {
        const networkErrorMsg = "网络连接异常或服务器未响应，请检查您的网络设置";
        message.error(networkErrorMsg);
        return Promise.reject(error || new Error(networkErrorMsg));
    }
);

export default instance;
