import React, { useMemo, useState, useRef } from "react";
import { Button, Tag, message, DatePicker, Space } from "antd";
import { SolutionOutlined, FileExcelOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import CrudTable from "../../../components/CrudTable";
import { readWorkloadManager, exportWorkloadManager } from "../../../api/workload";
import DetailModal from "./DetailModal";

const { RangePicker } = DatePicker;

const WorkloadManager = () => {
    const [detailModal, setDetailModal] = useState({ open: false, record: null });
    const [exporting, setExporting] = useState(false);
    const [dateRange, setDateRange] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const lastQueryRef = useRef("");

    const disableFutureDate = (current) => current && current > dayjs().endOf("day");

    const buildDateParams = () => {
        const extra = {};
        if (dateRange?.[0]) extra.reporting_from = dateRange[0].format("YYYY-MM-DD");
        if (dateRange?.[1]) extra.reporting_to = dateRange[1].format("YYYY-MM-DD");
        return extra;
    };

    const api = useMemo(
        () => ({
            read: (params) => {
                lastQueryRef.current = params.query || "";
                return readWorkloadManager({ ...params, ...buildDateParams() });
            },
        }),
        [dateRange],
    );

    const handleExport = async () => {
        setExporting(true);
        const hide = message.loading("正在准备导出数据...", 0);
        try {
            const res = await exportWorkloadManager({
                query: lastQueryRef.current,
                ...buildDateParams(),
            });
            if (res.data instanceof Blob) {
                if (res.data.type === "application/json") {
                    const text = await res.data.text();
                    const errorData = JSON.parse(text);
                    message.error(errorData.message || "导出失败");
                    return;
                }
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute(
                    "download",
                    `工作量记录_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`,
                );
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                message.success("导出成功");
            } else {
                message.warning("服务器未返回有效文件数据");
            }
        } catch (error) {
            message.error("导出失败: " + (error.message || "网络异常"));
        } finally {
            hide();
            setExporting(false);
        }
    };

    const columns = useMemo(
        () => [
            {
                title: "姓名",
                dataIndex: "name",
                width: 160,
                render: (text, record) => (
                    <div className="min-w-0">
                        <div className="font-bold text-slate-700 truncate">
                            {text}
                        </div>
                        {record.nickname && record.nickname !== text && (
                            <div className="text-xs text-gray-400 truncate">
                                {record.nickname}
                            </div>
                        )}
                    </div>
                ),
            },
            {
                title: "部门",
                dataIndex: "department_name",
                width: 160,
                render: (text) => (
                    <Tag color="geekblue" bordered={false} className="rounded-md">
                        {text || "-"}
                    </Tag>
                ),
            },
            {
                title: "累计加班",
                dataIndex: "overtime_aggregate",
                width: 130,
                align: "center",
                render: (text) => {
                    const val = Number(text) || 0;
                    return (
                        <span
                            className={`font-bold ${
                                val > 0 ? "text-orange-500" : "text-gray-400"
                            }`}
                        >
                            {val} 小时
                        </span>
                    );
                },
            },
        ],
        [],
    );

    const renderActions = (record) => (
        <Button
            type="link"
            size="small"
            icon={<SolutionOutlined />}
            onClick={() => setDetailModal({ open: true, record })}
        >
            查看详情
        </Button>
    );

    return (
        <>
            <CrudTable
                refreshKey={refreshKey}
                title="工作量管理"
                entityName="工作量"
                columns={columns}
                api={api}
                hideAdd
                hideEdit
                hideDelete
                actionWidth={110}
                renderActions={renderActions}
                actionExtra={
                    <Space size="middle" className="flex items-center flex-wrap">
                        <span className="text-sm">报告日期:</span>
                        <RangePicker
                            value={dateRange}
                            disabledDate={disableFutureDate}
                            onChange={(dates) => {
                                setDateRange(dates);
                                setRefreshKey((prev) => prev + 1);
                            }}
                            allowClear
                            placeholder={["开始日期", "结束日期"]}
                            className="rounded-lg"
                        />
                        <Button
                            icon={<FileExcelOutlined />}
                            loading={exporting}
                            onClick={handleExport}
                            className="bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                        >
                            导出记录
                        </Button>
                    </Space>
                }
            />

            <DetailModal
                open={detailModal.open}
                record={detailModal.record}
                onCancel={() => setDetailModal({ open: false, record: null })}
            />
        </>
    );
};

export default WorkloadManager;
