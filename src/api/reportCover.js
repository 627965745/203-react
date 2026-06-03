import instance from './request';

export const createReportCover = data => instance.post("/ResourceAdmin/ReportCover/create", data);
export const readReportCover = data => instance.post("/ResourceAdmin/ReportCover/read", data);
export const updateReportCover = data => instance.post("/ResourceAdmin/ReportCover/update", data);
export const deleteReportCover = data => instance.post("/ResourceAdmin/ReportCover/delete", data);
export const comboReportCover = data => instance.post("/ResourceAdmin/ReportCover/combo", data);
export const fieldCreateReportCover = data => instance.post("/ResourceAdmin/ReportCover/fieldCreate", data);
export const fieldUpdateReportCover = data => instance.post("/ResourceAdmin/ReportCover/fieldUpdate", data);
export const fieldDeleteReportCover = data => instance.post("/ResourceAdmin/ReportCover/fieldDelete", data);

