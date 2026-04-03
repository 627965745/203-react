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
    timeout: 10000, // Based on old Vue default config
    headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json", // Keeping JSON since old Vue mostly used it
        "X-Requested-With": "XMLHttpRequest"
    },
    // No withCredentials here since original Vue project relied on manually passing token,
    // Unless you explicitly switch to cookies later. Let's keep the manual headers for now to ensure backend works.
});

// Request interceptor mimicking older Vue logic but dropping Pinia class-wrapper bloat
instance.interceptors.request.use(
    (config) => {
        /** Login whitelist */
        const whiteList = ["/manage/common/login"];
        if (whiteList.includes(config.url)) {
            return config;
        }

        // Simpler status management: replacing Pinia with simple Auth context/ localStorage fallback
        const token = localStorage.getItem('token');
        const timestamp = localStorage.getItem('timestamp');
        
        if (token) {
            config.headers["token"] = token;
            config.headers["timestamp"] = timestamp || Date.now();
            config.headers["sign"] = "sign"; // Following old Vue logic mock 
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
        const { status, message: msg } = response.data;
        
        if (status === 0) {
            // Success
            return response;
        } else if (status === 11) { 
            const errorMsg = msg || '用户组不匹配（无权限）';
            message.error(errorMsg);
            return Promise.reject(new Error(errorMsg));
        } else if (status === 101) {
            const errorMsg = msg || '数据库无改动';
            message.warning(errorMsg);
            return Promise.reject(new Error(errorMsg));
        } else if (status === 102) {
            const errorMsg = msg || '数据库无改动（User.update专用）';
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
            message.error(errorMsg);
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
