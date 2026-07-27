import React, { useMemo, useState } from "react";
import {
    Modal,
    Tag,
    Space,
    Descriptions,
    Empty,
    Divider,
    Button,
    message,
    Popconfirm,
} from "antd";
import {
    SolutionOutlined,
    ClockCircleOutlined,
    HistoryOutlined,
    UserOutlined,
    TagOutlined,
    FileTextOutlined,
    DeploymentUnitOutlined,
    CheckCircleOutlined,
} from "@ant-design/icons";
import CrudTable from "../../components/CrudTable";
import {
    readSampleProcessingManager,
    approveSampleProcessingManager,
} from "../../api/ProcessingManager";

const SampleTypeMap = {
    0: { label: "非对照样", color: "blue" },
    1: { label: "空白样", color: "default" },
    2: { label: "标准样", color: "purple" },
    3: { label: "重复样", color: "orange" },
};

// V2: 加工状态上提到样品级（samples.processing_status）
const ProcessingStatusMap = {
    0: { label: "无需加工", color: "default" },
    1: { label: "正在加工", color: "processing" },
    2: { label: "加工完成", color: "success" },
};

const SampleListModal = ({ visible, task, onCancel }) => {
    const [refreshKey, setRefreshKey] = useState(0);

    // V2: 加工完成审批按样品直接进行，不再传 item_id
    const handleApprove = async (sampleId) => {
        try {
            const res = await approveSampleProcessingManager({
                sample_ids: [sampleId],
            });
            if (res.data.status === 0) {
                message.success("已标记加工完成");
                setRefreshKey((prev) => prev + 1);
            } else {
                message.error(res.data.message || "操作失败");
            }
        } catch (err) {
            console.error("Approve error:", err);
            message.error("操作异常");
        }
    };

    const columns = useMemo(
        () => [
            {
                title: "实验室编号",
                dataIndex: "lab_code",
                width: 120,
                fixed: "left",
                render: (text) => (
                    <Tag color="blue" className="font-mono font-bold">
                        {task?.lab_code}-{text?.toString().padStart(4, "0")}
                    </Tag>
                ),
            },
            {
                title: "客户编号",
                dataIndex: "client_code",
                width: 150,
                render: (text) => (
                    <span className="font-medium text-slate-700">
                        {text || "-"}
                    </span>
                ),
            },
            {
                title: "样品类型",
                dataIndex: "type",
                width: 100,
                render: (val) => {
                    const item = SampleTypeMap[val];
                    return item ? (
                        <Tag color={item.color} bordered={false}>
                            {item.label}
                        </Tag>
                    ) : (
                        val
                    );
                },
            },
            {
                title: "父样编号",
                dataIndex: "parent_lab_code",
                width: 120,
                render: (text) => (text ? <Tag color="cyan">{text}</Tag> : "-"),
            },
            {
                title: "标准物质",
                dataIndex: "reference_material_name",
                width: 180,
                render: (text) => text || "-",
            },
            {
                title: "创建人",
                dataIndex: "creator_name",
                width: 120,
                render: (text) => (
                    <Space size={4}>
                        <UserOutlined className="text-gray-400" />
                        <span>{text}</span>
                    </Space>
                ),
            },
            {
                title: "更新时间",
                dataIndex: "updated_at",
                width: 170,
                render: (text) => (
                    <Space size={4} className="text-gray-500 text-xs">
                        <HistoryOutlined />
                        <span>{text}</span>
                    </Space>
                ),
            },
            {
                title: "备注",
                dataIndex: "description",
                width: 150,
                ellipsis: true,
                render: (text) => text || "-",
            },
        ],
        [task],
    );

    const renderExpandedRow = (record) => (
        <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-100 mx-2 mb-2 shadow-inner">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Parameters Section - Redesigned as List */}
                <div>
                    <div className="flex items-center gap-2 mb-2 text-slate-700 font-bold">
                        <TagOutlined className="text-blue-500" />
                        <span>样品参数</span>
                    </div>
                    {(record.inputs || []).length > 0 ? (
                        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm p-2">
                            <div className="divide-y divide-slate-50">
                                {record.inputs.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="py-1.5 first:pt-0 last:pb-0 flex justify-between items-center text-sm"
                                    >
                                        <span className="text-slate-500 flex items-center gap-2">
                                            <div className="w-1 h-1 bg-blue-400 rounded-full" />
                                            {item.key}
                                        </span>
                                        <span className="font-semibold text-slate-700">
                                            {item.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white p-3 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="暂无参数"
                            />
                        </div>
                    )}
                </div>

                {/* V2: 加工要求 —— 加工上提到样品级，不再遍历检测项目(items) */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-slate-700 font-bold">
                            <DeploymentUnitOutlined className="text-indigo-500" />
                            <span>加工要求</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {(() => {
                                const cfg = ProcessingStatusMap[record.processing_status] || ProcessingStatusMap[0];
                                return (
                                    <Tag color={cfg.color} bordered={false} className="m-0">
                                        {record.processing_status === 2 && <CheckCircleOutlined className="mr-1" />}
                                        {cfg.label}
                                    </Tag>
                                );
                            })()}
                            {/* V2: 完成加工按样品直接审批 */}
                            {record.processing_status === 1 && (
                                <Popconfirm
                                    title="确认完成加工？"
                                    description="请确保该样品的加工步骤已全部执行完毕。"
                                    onConfirm={() => handleApprove(record.id)}
                                    okText="确认"
                                    cancelText="取消"
                                    placement="left"
                                >
                                    <Button
                                        size="small"
                                        type="primary"
                                        className="bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        完成加工
                                    </Button>
                                </Popconfirm>
                            )}
                        </div>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                        {record.processing_deadline && (
                            <div className="bg-indigo-50/50 px-3 py-1.5 border-b border-indigo-100 flex justify-end items-center">
                                <div className="text-sm text-indigo-600 font-medium flex items-center gap-1">
                                    <span className="text-slate-400">加工截止时间:</span>
                                    <span className="font-mono font-bold bg-indigo-100/50 px-2 py-0.5 rounded text-[12px] border border-indigo-100/30">
                                        {record.processing_deadline.split(' ')[0]}
                                    </span>
                                </div>
                            </div>
                        )}
                        <div className="p-2 px-3">
                            {(record.processing || []).length > 0 ? (
                                <div className="divide-y divide-slate-50">
                                    {record.processing.map((p, pIdx) => (
                                        <div
                                            key={pIdx}
                                            className="py-1 first:pt-0 last:pb-0 flex items-center text-sm"
                                        >
                                            <span className="text-slate-500 w-1/2">
                                                {p.method_name}
                                            </span>
                                            <div className="flex-1 text-right">
                                                <span className="font-bold text-slate-700 bg-slate-50 px-3 py-1 rounded border border-slate-100 min-w-[80px] inline-block shadow-sm">
                                                    {p.option_value || p.value}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-2 text-slate-300 italic text-xs">
                                    无加工参数信息
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Divider dashed className="my-2" />
            <div className="flex items-center gap-4 text-[11px] text-gray-400">
                <Space>
                    <ClockCircleOutlined />
                    <span>创建于: {record.created_at}</span>
                </Space>
                <Space>
                    <HistoryOutlined />
                    <span>最后更新: {record.updated_at}</span>
                </Space>
                {record.id && (
                    <Space>
                        <FileTextOutlined />
                        <span>样品 ID: {record.id}</span>
                    </Space>
                )}
            </div>
        </div>
    );

    const api = useMemo(
        () => ({
            read: (params) =>
                readSampleProcessingManager({ ...params, task_id: task?.id }),
        }),
        [task],
    );

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <SolutionOutlined className="text-blue-500" />
                    <span>
                        样品列表 - {task?.lab_code}-{task?.name}
                    </span>
                </div>
            }
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={1200}
            destroyOnClose
            centered
        >
            <div className="mt-[-24px] mx-[-24px]">
                <CrudTable
                    refreshKey={refreshKey}
                    entityName="样品"
                    columns={columns.map((c) => ({ ...c, fixed: undefined }))}
                    api={api}
                    hideAdd
                    hideEdit
                    hideDelete
                    hideSearch
                    hideAction
                    expandAll={true}
                    renderExpandedRow={renderExpandedRow}
                    tableProps={{
                        size: "middle",
                        pagination: { pageSize: 10 },
                    }}
                />
            </div>
        </Modal>
    );
};

export default SampleListModal;
