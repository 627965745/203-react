import instance from './request';

export const createReportTable = data => instance.post("/Admin/ReportTable/create", data);
export const readReportTable = data => instance.post("/Admin/ReportTable/read", data);
export const updateReportTable = data => instance.post("/Admin/ReportTable/update", data);
export const deleteReportTable = data => instance.post("/Admin/ReportTable/delete", data);
export const comboReportTable = data => instance.post("/Admin/ReportTable/combo", data);
