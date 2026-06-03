import request from './request';

export const createThermometer = (data) => {
    return request.post('/MonitorAdmin/Thermometer/create', data);
};

export const readThermometers = (data) => {
    return request.post('/MonitorAdmin/Thermometer/read', data);
};

export const updateThermometer = (data) => {
    return request.post('/MonitorAdmin/Thermometer/update', data);
};

export const deleteThermometer = (data) => {
    return request.post('/MonitorAdmin/Thermometer/delete', data);
};

export const getThermometerLogs = (data) => {
    return request.post('/MonitorAdmin/Thermometer/logs', data);
};

export const exportThermometerLogs = (data) => {
    return request.post('/MonitorAdmin/Thermometer/logsExport', data, { responseType: 'blob' });
};
