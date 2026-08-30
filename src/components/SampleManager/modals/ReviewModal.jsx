import React, { useState } from 'react';
import { Modal, Button, message, Space, Tag, Popconfirm } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, AuditOutlined, InfoCircleOutlined, BarcodeOutlined } from '@ant-design/icons';
import { ResultFieldGrid } from '../ResultDetail';

// V6: 审核界面由表格改为卡片式 —— 与「查看数据」(ResultEntryModal 只读态) 保持同一套视觉语言。
//     原来的表格把「录入结果」压在一个固定宽度的列里，字段一多就纵向堆叠、横向留白浪费；
//     改成每个方法一张卡片后，结果字段可以铺满整行宽度，并且能顺带展示 V5 的检测设备与
//     V6 的实验时间（表格里没有位置放这两项）。
const ReviewModal = ({ open, onCancel, onSuccess, data, apis = {}, rejectDescription }) => {
    const [actionLoading, setActionLoading] = useState({});
    const { approve, reject } = apis;

    // V3: data structure: { sampleIds, details: [{ labCode, methodName, methodId, itemId, itemName, results: [...] }] }
    //     item 与 method 强绑定；同一 methodId 在不同 item 下可重复出现，因此下面所有按方法
    //     索引的 state/key 都必须用 "itemId-methodId" 组合键，不能再用裸 methodId。
    const { sampleIds = [], details = [] } = data || {};
    const keyOf = (record) => `${record.itemId}-${record.methodId}`;
    const [processedMethods, setProcessedMethods] = useState({}); // { "itemId-methodId": 'approve' | 'reject' }

    const handleAction = async (record, type) => {
        const api = type === 'approve' ? approve : reject;
        if (!api) return;

        const key = keyOf(record);
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

    // 卡片右上角：未处理时是两个操作按钮，处理过后换成结果状态条
    const renderActions = (record) => {
        const key = keyOf(record);
        const status = processedMethods[key];

        if (status === 'approve') {
            return (
                <div className="flex items-center gap-1.5 text-green-600 font-bold text-xs bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 shrink-0">
                    <CheckCircleOutlined />
                    <span>已通过</span>
                </div>
            );
        }

        if (status === 'reject') {
            return (
                <div className="flex items-center gap-1.5 text-red-500 font-bold text-xs bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 shrink-0">
                    <CloseCircleOutlined />
                    <span>已驳回</span>
                </div>
            );
        }

        return (
            <Space className="shrink-0">
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
                        className="bg-green-600 hover:bg-green-700 border-none text-[11px] h-7 rounded-lg font-bold"
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
                        className="text-[11px] h-7 rounded-lg font-bold"
                    >
                        驳回
                    </Button>
                </Popconfirm>
            </Space>
        );
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <AuditOutlined className="text-blue-500" />
                    </div>
                    <div>
                        <div className="text-base font-black text-slate-800">实验数据审核</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                            共 {details.length} 项待核对
                        </div>
                    </div>
                </div>
            }
            open={open}
            onCancel={onCancel}
            footer={[
                <Button key="close" onClick={onCancel} className="rounded-lg">关闭</Button>
            ]}
            width={720}
            destroyOnHidden
            centered
        >
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                <InfoCircleOutlined className="text-blue-400" />
                <span>请仔细核对实验数据，通过后将进入报告生成环节。</span>
            </div>

            {/* V6: 每个「检测项目 / 方法」一张卡片，取代原先的一行表格 */}
            <div className="flex flex-col gap-4 max-h-[62vh] overflow-y-auto pr-1">
                {details.map((record, idx) => (
                    <div
                        key={keyOf(record) || idx}
                        className="rounded-2xl border border-slate-200 overflow-hidden"
                    >
                        {/* 卡片头：样品编号 + 检测项目/方法 + 操作 */}
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <BarcodeOutlined className="text-slate-400 text-xs" />
                                    <span className="font-mono font-bold text-slate-700">
                                        {record.labCode}
                                    </span>
                                </div>
                                {/* V3: item 与 method 强绑定，标签内一并展示所属检测项目 */}
                                <Tag color="blue" className="mt-1.5 m-0 border-none font-bold text-[11px] max-w-full whitespace-normal break-words">
                                    {record.itemName ? `${record.itemName} / ${record.methodName}` : record.methodName}
                                </Tag>
                            </div>
                            {renderActions(record)}
                        </div>

                        {/* 卡片体：结果字段，每个字段各自带 V5 检测设备 + V6 实验时间。
                            V6.1: 不再显示方法级的汇总行 —— 审核要逐条核对"这个值是哪台仪器、
                            哪天做的"，即使整组一致也要标在各字段下面。 */}
                        <div className="px-4 py-3">
                            <ResultFieldGrid
                                results={record.results}
                                emptyText="该方法暂无录入数据"
                                alwaysShowMeta
                            />
                        </div>
                    </div>
                ))}
            </div>
        </Modal>
    );
};

export default ReviewModal;
