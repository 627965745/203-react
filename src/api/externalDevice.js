import axios from 'axios';

/**
 * 外部设备接口定义 (指向本地 Python 程序)
 */

// 统一设备接口 - 端口 20597
const deviceClient = axios.create({
    baseURL: 'http://127.20.5.97:20597',
    timeout: 5000,
});

/**
 * 获取电子秤读数
 * @returns {Promise}
 */
export const getScaleReading = async () => {
    try {
        const response = await deviceClient.get('/balanceRead');
        if (response.data && response.data.status === 0) {
            return response;
        }
        throw new Error("读取失败，请检查设备连接");
    } catch (error) {
        throw new Error("读取失败，请检查设备连接");
    }
};

/**
 * 发送并打印数据
 * @param {Object} data 打印任务详情
 * @returns {Promise}
 */
export const sendPrintJob = async (data) => {
    const payload = {
        reagent_name: data.reagent_name,
        reagent_category: data.reagent_category || data.category || "未知",
        specification: data.specification,
        reagent_unit: data.reagent_unit || data.unit,
        lab_code: data.lab_code
    };
    try {
        const response = await deviceClient.post('/stickerPrint', payload);
        if (response.data && response.data.status === 0) {
            return response;
        }
        throw new Error("打印失败，请检查设备连接");
    } catch (error) {
        throw new Error("打印失败，请检查设备连接");
    }
};

let activeScannerListener = null;
let activeScannerReject = null;
let keyupSwallower = null;

/**
 * 取消扫码枪监听
 */
export const cancelScannerReading = () => {
    if (activeScannerListener) {
        window.removeEventListener('keydown', activeScannerListener, true);
        activeScannerListener = null;
    }
    if (activeScannerReject) {
        activeScannerReject(new Error('CANCEL'));
        activeScannerReject = null;
    }
};

/**
 * 获取扫码枪读数 (监听键盘输入，以 Enter 键结尾)
 * @returns {Promise}
 */
export const getScannerReading = () => {
    cancelScannerReading();

    return new Promise((resolve, reject) => {
        let buffer = '';

        const listener = (event) => {
            // 忽略控制键和快捷组合键
            if (event.altKey || event.ctrlKey || event.metaKey) {
                return;
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();

                cancelScannerReading();

                // 临时拦截随后可能触发的 keyup/keypress，防止触发到页面上获得焦点的按钮
                if (!keyupSwallower) {
                    keyupSwallower = (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            window.removeEventListener('keyup', keyupSwallower, true);
                            window.removeEventListener('keypress', keyupSwallower, true);
                            keyupSwallower = null;
                        }
                    };
                    window.addEventListener('keyup', keyupSwallower, true);
                    window.addEventListener('keypress', keyupSwallower, true);
                    // 兜底清除
                    setTimeout(() => {
                        if (keyupSwallower) {
                            window.removeEventListener('keyup', keyupSwallower, true);
                            window.removeEventListener('keypress', keyupSwallower, true);
                            keyupSwallower = null;
                        }
                    }, 500);
                }

                resolve({ data: { status: 0, data: buffer, message: 'success' } });
            } else if (event.key.length === 1) {
                buffer += event.key;
            }
        };

        activeScannerListener = listener;
        activeScannerReject = reject;
        window.addEventListener('keydown', listener, true);
    });
};


