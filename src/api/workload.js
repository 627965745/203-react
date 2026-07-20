import instance from './request';

// Common (self-service) workload logging
export const readCommonWorkload = data => instance.post("/Common/Workload/read", data);
export const recordCommonWorkload = data => instance.post("/Common/Workload/record", data);
export const deleteCommonWorkload = data => instance.post("/Common/Workload/delete", data);

// General Manager workload oversight
export const readWorkloadManager = data => instance.post("/GeneralManager/Workload/read", data);
export const exportWorkloadManager = data => instance.post("/GeneralManager/Workload/export", data, { responseType: 'blob' });
export const detailWorkloadManager = data => instance.post("/GeneralManager/Workload/detail", data);
