import React, { useState } from 'react';
import { Modal, Table, Button, message, Space, Tag, Popconfirm, Divider } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, AuditOutlined, InfoCircleOutlined } from '@ant-design/icons';

const ReviewModal = ({ open, onCancel, onSuccess, data, apis = {}, rejectDescription }) => {
    const [actionLoading, setActionLoading] = useState({});
    const { approve, reject } = apis;

    // V3: data structure: { sampleIds, details: [{ labCode, methodName, methodId, itemId, itemName, results: [...] }] }
    //     item 与 method 强绑定；同一 methodId 在不同 item 下可重复出现，因此下面所有按方法
    //     索引的 state/rowKey 都必须用 "itemId-methodId" 组合键，不能再用裸 methodId。
    const { sampleIds = [], details = [] } = data || {};
    const rowKeyOf = (record) => `${record.itemId}-${record.methodId}`;
    const [processedMethods, setProcessedMethods] = useState({}); // { "itemId-methodId": 'approve' | 'reject' }

    const handleAction = async (record, type) => {
        const api = type === 'approve' ? approve : reject;
        if (!api) return;

        const key = rowKeyOf(record);
        setActionLoading(prev => ({ ...prev, [`${key}-${type}`]: true }));
        try {
            const res = await api({
                sample_ids: sampleIds,
                // V3: method_ids 为 [{item_id, method_id}] 对象数组
                method_ids: [{ item_id: record.itemId, method_id: record.methodId }]
            });

            if (res.data.status === 0) {
                message.success(type === 'approve' ? "审核通过" : "已驳回");
                setProcessedMethods(prev => ({ ...prev, [key]: type }));
                onSuccess();
            } else {
                message.error(res.data.message || "操作失败");
            }
        } catch (error) {
            message.error("操作异常");
        } finally {
            setActionLoading(prev => ({ ...prev, [`${key}-${type}`]: false }));
        }
    };

    const columns = [
        {
            title: '实验室编号',
            dataIndex: 'labCode',
            key: 'labCode',
            width: 120,
            render: (text) => <span className="font-mono font-bold text-slate-700">{text}</span>
        },
        {
            title: '检测项目 / 方法',
            key: 'info',
            render: (_, record) => (
                // V3: item 与 method 强绑定，标签内一并展示所属检测项目
                <div className="flex items-center gap-2">
                    <Tag color="blue" className="m-0 border-none font-bold text-[11px]">
                        {record.itemName ? `${record.itemName} / ${record.methodName}` : record.methodName}
                    </Tag>
                </div>
            )
        },
        {
            title: '录入结果',
            dataIndex: 'results',
            key: 'results',
            width: 350,
            render: (results) => (
                <div className="flex flex-col gap-1">
                    {results && results.length > 0 ? (
                        results.map((r, i) => (
                            <div key={i} className="flex items-start bg-slate-50 px-3 py-1.5 rounded border border-slate-100 text-[14px]">
                                <span className="text-slate-500 mr-2 min-w-[60px] shrink-0 pt-[1px]">{r.name}:</span>
                                <span className="font-bold text-slate-800 break-words whitespace-pre-wrap flex-1 min-w-0">{r.value}</span>
                            </div>
                        ))
                    ) : (
                        <span className="text-xs text-slate-300 italic">无数据</span>
                    )}
                </div>
            )
        },
        {
            title: '操作',
            key: 'actions',
            fixed: 'right',
            width: 160,
            render: (_, record) => {
                const key = rowKeyOf(record);
                const status = processedMethods[key];

                if (status === 'approve') {
                    return (
                        <div className="flex items-center gap-1.5 text-green-600 font-bold text-xs bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                            <CheckCircleOutlined />
                            <span>已通过</span>
                        </div>
                    );
                }
                
                if (status === 'reject') {
                    return (
                        <div className="flex items-center gap-1.5 text-red-500 font-bold text-xs bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                            <CloseCircleOutlined />
                            <span>已驳回</span>
                        </div>
                    );
                }

                return (
                    <Space>
                        <Popconfirm
                            title="确认通过审核？"
                            onConfirm={() => handleAction(record, 'approve')}
                            okText="通过"
                            cancelText="取消"
                        >
                            <Button
                                type="primary"
                                size="small"
                                icon={<CheckCircleOutlined />}
                                loading={actionLoading[`${key}-approve`]}
                                className="bg-green-600 hover:bg-green-700 border-none text-[11px] h-7 rounded-lg"
                            >
                                通过
                            </Button>
                        </Popconfirm>
                        <Popconfirm
                            title="确认驳回该结果？"
                            description={rejectDescription || "驳回后检测员将需要重新录入数据。"}
                            onConfirm={() => handleAction(record, 'reject')}
                            okText="驳回"
                            cancelText="取消"
                            okButtonProps={{ danger: true }}
                        >
                            <Button
                                danger
                                size="small"
                                icon={<CloseCircleOutlined />}
                                loading={actionLoading[`${key}-reject`]}
                                className="text-[11px] h-7 rounded-lg"
                            >
                                驳回
                            </Button>
                        </Popconfirm>
                    </Space>
                );
            }
        }
    ];

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <AuditOutlined className="text-blue-500" />
                    <span>实验数据审核</span>
                </div>
            }
            open={open}
            onCancel={onCancel}
            footer={[
                <Button key="close" onClick={onCancel} className="rounded-lg">关闭</Button>
            ]}
            width={850}
            destroyOnClose
            centered
        >
            <div className="mb-4">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                    <InfoCircleOutlined className="text-blue-400" />
                    <span>请仔细核对实验数据，通过后将进入报告生成环节。</span>
                </div>
                <Divider className="my-2" />
            </div>

            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <Table
                    dataSource={details}
                    columns={columns}
                    pagination={false}
                    rowKey={rowKeyOf}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    className="review-table"
                />
            </div>
        </Modal>
    );
};

export default ReviewModal;
