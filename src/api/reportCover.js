import instance from './request';

export const createReportCover = data => instance.post("/Admin/ReportCover/create", data);
export const readReportCover = data => instance.post("/Admin/ReportCover/read", data);
export const updateReportCover = data => instance.post("/Admin/ReportCover/update", data);
export const deleteReportCover = data => instance.post("/Admin/ReportCover/delete", data);
export const comboReportCover = data => instance.post("/Admin/ReportCover/combo", data);
