// Common utility functions space
// Feel free to add and export specific utilities (formatters, parsers mapped from Vue version) here

export const getLocalStorage = (key) => {
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.warn('Error reading from localStorage', error);
        return null;
    }
};

export const setLocalStorage = (key, value) => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn('Error writing to localStorage', error);
    }
};

export const clearLocalStorage = () => {
    window.localStorage.clear();
};

// V6: 检测结果的「实验时间」。写入端 (TestingManager/Sample/resultCreate) 的字段名是
//     experimented_at，但各 Sample/read 响应里实测返回的是拼写少一个 e 的 exprimented_at
//     （WorkflowManager / DepartmentManager / TestingManager 三个模块都一样）。
//     两种拼写都兼容，后端把拼写改回来后这里无需再动。
export const getExperimentedAt = (result) =>
    result?.experimented_at ?? result?.exprimented_at ?? null;
