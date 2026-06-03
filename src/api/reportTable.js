import instance from './request';

export const createReportTable = data => instance.post("/ResourceAdmin/ReportTable/create", data);
export const readReportTable = data => instance.post("/ResourceAdmin/ReportTable/read", data);
export const updateReportTable = data => instance.post("/ResourceAdmin/ReportTable/update", data);
export const deleteReportTable = data => instance.post("/ResourceAdmin/ReportTable/delete", data);
export const comboReportTable = data => instance.post("/ResourceAdmin/ReportTable/combo", data);
export const fieldCreateReportTable = data => instance.post("/ResourceAdmin/ReportTable/fieldCreate", data);
export const fieldUpdateReportTable = data => instance.post("/ResourceAdmin/ReportTable/fieldUpdate", data);
export const fieldDeleteReportTable = data => instance.post("/ResourceAdmin/ReportTable/fieldDelete", data);


