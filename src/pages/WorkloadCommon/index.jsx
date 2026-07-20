import React, { useMemo, useState } from "react";
import { Button, Tag, message, Popconfirm, DatePicker, Space } from "antd";
import { PlusOutlined, DeleteOutlined, FieldTimeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import CrudTable from "../../components/CrudTable";
import { readCommonWorkload, deleteCommonWorkload } from "../../api/workload";
import RecordModal from "./RecordModal";

const { RangePicker } = DatePicker;

const WorkloadCommon = () => {
    const [refreshKey, setRefreshKey] = useState(0);
    const [rows, setRows] = useState([]);
    const [recordOpen, setRecordOpen] = useState(false);
    const [dateRange, setDateRange] = useState(null);

    const disableFutureDate = (current) => current && current > dayjs().endOf("day");

    const api = useMemo(
        () => ({
            read: (params) => {
                const extra = {};
                if (dateRange?.[0]) extra.reporting_from = dateRange[0].format("YYYY-MM-DD");
                if (dateRange?.[1]) extra.reporting_to = dateRange[1].format("YYYY-MM-DD");
                return readCommonWorkload({ ...params, ...extra });
            },
        }),
        [dateRange],
    );

    const handleDelete = async (reporting) => {
        try {
            const res = await deleteCommonWorkload({ reporting });
            if (res.data.status === 0) {
                message.success("删除成功");
                setRefreshKey((prev) => prev + 1);
            } else {
                message.error(res.data?.message || "删除失败");
            }
        } catch (error) {
            message.error(error.response?.data?.message || "删除异常");
        }
    };

    const columns = useMemo(
        () => [
            {
                title: "报告日期",
                dataIndex: "reporting",
                width: 130,
                render: (text) => (
                    <div className="flex items-center gap-2">
                        <FieldTimeOutlined className="text-blue-400" />
                        <span className="font-mono font-bold text-slate-700">
                            {text}
                        </span>
                    </div>
                ),
            },
            {
                title: "加班时长",
                dataIndex: "overtime",
                width: 110,
                render: (text) => {
                    const val = Number(text) || 0;
                    return (
                        <Tag
                            color={val > 0 ? "blue" : "default"}
                            bordered={false}
                            className="rounded-md font-bold"
                        >
                            {val.toFixed(2)} 小时
                        </Tag>
                    );
                },
            },
            {
                title: "工作说明",
                dataIndex: "description",
                ellipsis: true,
                render: (text) =>
                    text || (
                        <span className="text-gray-300 italic text-xs">无</span>
                    ),
            },
            {
                title: "创建时间",
                dataIndex: "created_at",
                width: 170,
                render: (text) => (
                    <span className="text-xs text-slate-400 font-mono">
                        {text || "-"}
                    </span>
                ),
            },
            {
                title: "更新时间",
                dataIndex: "updated_at",
                width: 170,
                render: (text) => (
                    <span className="text-xs text-slate-400 font-mono">
                        {text || "-"}
                    </span>
                ),
            },
        ],
        [],
    );

    const renderActions = (record) => (
        <Popconfirm
            title="确认要删除该记录吗？"
            okText="确定"
            cancelText="取消"
            placement="left"
            onConfirm={() => handleDelete(record.reporting)}
        >
            <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined className="text-red-500" />}
            >
                删除
            </Button>
        </Popconfirm>
    );

    return (
        <>
            <CrudTable
                refreshKey={refreshKey}
                title="我的工作量"
                entityName="工作量记录"
                columns={columns}
                api={api}
                hideAdd
                hideEdit
                hideDelete
                actionWidth={90}
                tableProps={{ rowKey: "reporting" }}
                onDataLoaded={setRows}
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
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setRecordOpen(true)}
                        >
                            登记工作量
                        </Button>
                    </Space>
                }
            />

            <RecordModal
                open={recordOpen}
                rows={rows}
                onCancel={() => setRecordOpen(false)}
                onSuccess={() => {
                    setRecordOpen(false);
                    setRefreshKey((prev) => prev + 1);
                }}
            />
        </>
    );
};

export default WorkloadCommon;
