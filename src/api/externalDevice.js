import axios from 'axios';

/**
 * 外部设备接口定义 (指向本地 Python 程序)
 */

// 统一设备接口 - 端口 20597
const deviceClient = axios.create({
    baseURL: 'http://127.20.5.97:20597',
    timeout: 10000,
});

// 扫码枪接口 - 保持原样或可选更新
const scannerClient = axios.create({
    baseURL: 'http://127.0.0.1:5003',
    timeout: 5000,
});

/**
 * 获取电子秤读数
 * @returns {Promise}
 */
export const getScaleReading = () => {
    if (import.meta.env.DEV) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ data: { status: 0, data: 498.03, message: 'success (Mock)' } });
            }, 800);
        });
    }
    return deviceClient.get('/balanceRead');
};

/**
 * 发送并打印数据
 * @param {Object} data 打印任务详情
 * @returns {Promise}
 */
export const sendPrintJob = (data) => {
    if (import.meta.env.DEV) {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log("Mock Print Job Payload:", {
                    reagent_name: data.reagent_name,
                    reagent_category: data.reagent_category || data.category || "未知",
                    specification: data.specification,
                    reagent_unit: data.reagent_unit || data.unit,
                    lab_code: data.lab_code
                });
                resolve({ data: { status: 0, message: 'Print success (Mock)' } });
            }, 800);
        });
    }

    const payload = {
        reagent_name: data.reagent_name,
        reagent_category: data.reagent_category || data.category || "未知",
        specification: data.specification,
        reagent_unit: data.reagent_unit || data.unit,
        lab_code: data.lab_code
    };
    return deviceClient.post('/stickerPrint', payload);
};

/**
 * 获取扫码枪读数
 * @returns {Promise}
 */
export const getScannerReading = () => {
    if (import.meta.env.DEV) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ data: { status: 0, data: '20260412234107310269', message: 'success (Mock)' } });
            }, 800);
        });
    }
    return scannerClient.get('/read_barcode');
};

