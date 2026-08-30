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
            if (config.data instanceof FormData) {
                // For FormData uploads, delete Content-Type so Axios/browser automatically
                // generates the correct boundary header.
                delete config.headers['Content-Type'];
            } else if (!config.headers['Content-Type']) {
                config.headers['Content-Type'] = 'application/json';
            }
            // 如果是 POST/PUT 等请求但没有数据，强制设置为空对象 {}
            // 否则 Axios 会因为没有 Body 而不发送 Content-Type
            if ((config.data === undefined || config.data === null) && !(config.data instanceof FormData)) {
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
        } else if (status === 10) {
            // V5: 参数校验层错误 —— v5 中更多非法参数落入此类。
            //     典型场景：Common/Upload/upload 未携带 file 或文件类型非法
            //     （v4 时该场景返回 101，现由参数校验层提前拦截）。
            const errorMsg = msg || '参数校验失败：请检查必填项与文件类型是否合法';
            if (!response.config?._silent) {
                message.error(errorMsg);
            }
            return Promise.reject(new Error(errorMsg));
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
            // V5: 上传场景下 102 表示"能取到 content_type 但猜不出扩展名"
            const errorMsg = msg || '数据库无改动，或无法识别上传文件的扩展名';
            message.warning(errorMsg);
            return Promise.reject(new Error(errorMsg));
        } else if (status === 103) {
            // V5: 103 现在有两种来源 —— ①ReferenceMaterial.prepare 的"数据库无改动"；
            //     ②Common/Upload/upload 完全取不到 content_type（v5 新增的上传错误码）。
            //     后端 message 能区分具体场景，优先展示它，缺省文案兼顾两者。
            const errorMsg = msg || '操作未生效：数据库无改动，或上传文件缺少类型信息';
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
