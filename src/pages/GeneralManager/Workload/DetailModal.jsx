import React, { useMemo } from "react";
import { Modal, Tag, Tooltip } from "antd";
import { SolutionOutlined } from "@ant-design/icons";
import CrudTable from "../../../components/CrudTable";
import { detailWorkloadManager } from "../../../api/workload";

const DetailModal = ({ open, record, onCancel }) => {
    const columns = useMemo(
        () => [
            { title: "工作日期", dataIndex: "reporting", width: 120 },
            {
                title: "加班时长",
                dataIndex: "overtime",
                width: 100,
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
                ellipsis: { showTitle: false },
                render: (text) =>
                    text ? (
                        <Tooltip title={text} placement="topLeft">
                            <span>{text}</span>
                        </Tooltip>
                    ) : (
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

    const api = useMemo(
        () => ({
            read: (params) =>
                detailWorkloadManager({ ...params, user_id: record?.id }),
        }),
        [record],
    );

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <SolutionOutlined className="text-blue-500" />
                    <span>
                        工作量详情 - {record?.nickname || record?.name}
                    </span>
                </div>
            }
            open={open}
            onCancel={onCancel}
            footer={null}
            width={800}
            destroyOnHidden
            centered
        >
            <div className="mt-[-24px] mx-[-24px]">
                <CrudTable
                    entityName="工作量记录"
                    columns={columns}
                    api={api}
                    hideAdd
                    hideEdit
                    hideDelete
                    hideSearch
                    hideAction
                    scroll={{ y: 360 }}
                    defaultPageSize={10}
                    tableProps={{
                        rowKey: "reporting",
                        size: "middle",
                    }}
                />
            </div>
        </Modal>
    );
};

export default DetailModal;
