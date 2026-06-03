import React, { useState } from 'react';
import { Modal, Table, Button, message, Space, Tag, Popconfirm, Divider } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, AuditOutlined, InfoCircleOutlined } from '@ant-design/icons';

const ReviewModal = ({ open, onCancel, onSuccess, data, apis = {}, rejectDescription }) => {
    const [actionLoading, setActionLoading] = useState({});
    const { approve, reject } = apis;

    // data structure: { sampleIds, itemId, details: [{ labCode, itemName, methodName, methodId, results: [...] }] }
    const { sampleIds = [], itemId, details = [] } = data || {};
    const [processedMethods, setProcessedMethods] = useState({}); // { methodId: 'approve' | 'reject' }

    const handleAction = async (methodId, type) => {
        const api = type === 'approve' ? approve : reject;
        if (!api) return;

        setActionLoading(prev => ({ ...prev, [`${methodId}-${type}`]: true }));
        try {
            const res = await api({
                sample_ids: sampleIds,
                item_id: itemId,
                method_ids: [methodId]
            });

            if (res.data.status === 0) {
                message.success(type === 'approve' ? "审核通过" : "已驳回");
                setProcessedMethods(prev => ({ ...prev, [methodId]: type }));
                onSuccess();
            } else {
                message.error(res.data.message || "操作失败");
            }
        } catch (error) {
            message.error("操作异常");
        } finally {
            setActionLoading(prev => ({ ...prev, [`${methodId}-${type}`]: false }));
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
            title: '详情',
            key: 'info',
            render: (_, record) => (
                <div className="flex flex-col gap-1">
                    <div className="text-xs text-slate-400">项目: {record.itemName}</div>
                    <div className="flex items-center gap-2">
                        <Tag color="blue" className="m-0 border-none font-bold text-[11px]">{record.methodName}</Tag>
                    </div>
                </div>
            )
        },
        {
            title: '录入结果',
            dataIndex: 'results',
            key: 'results',
            render: (results) => (
                <div className="flex flex-col gap-1">
                    {results && results.length > 0 ? (
                        results.map((r, i) => (
                            <div key={i} className="flex items-center bg-slate-50 px-3 py-1 rounded border border-slate-100 text-[14px]">
                                <span className="text-slate-500 mr-2 min-w-[60px]">{r.name}:</span>
                                <span className="font-bold text-slate-800">{r.value}</span>
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
                const status = processedMethods[record.methodId];
                
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
                            onConfirm={() => handleAction(record.methodId, 'approve')}
                            okText="通过"
                            cancelText="取消"
                        >
                            <Button 
                                type="primary" 
                                size="small" 
                                icon={<CheckCircleOutlined />}
                                loading={actionLoading[`${record.methodId}-approve`]}
                                className="bg-green-600 hover:bg-green-700 border-none text-[11px] h-7 rounded-lg"
                            >
                                通过
                            </Button>
                        </Popconfirm>
                        <Popconfirm
                            title="确认驳回该结果？"
                            description={rejectDescription || "驳回后检测员将需要重新录入数据。"}
                            onConfirm={() => handleAction(record.methodId, 'reject')}
                            okText="驳回"
                            cancelText="取消"
                            okButtonProps={{ danger: true }}
                        >
                            <Button 
                                danger 
                                size="small" 
                                icon={<CloseCircleOutlined />}
                                loading={actionLoading[`${record.methodId}-reject`]}
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
                    rowKey="methodId"
                    size="small"
                    scroll={{ x: 'max-content' }}
                    className="review-table"
                />
            </div>
        </Modal>
    );
};

export default ReviewModal;
