import React, { useState } from 'react';
import { Modal, Table, Button, message, Space, Tag, Alert } from 'antd';
import { SendOutlined, InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { approveTestingSample } from '../../../api/testing';

const ApproveModal = ({ open, onCancel, onSuccess, data }) => {
    const [loading, setLoading] = useState(false);

    // V2: data structure: { sampleIds, methodIds, details: [{ labCode, methodName }] } —— 移除 item_id
    const { sampleIds = [], methodIds = [], details = [] } = data || {};

    const handleApprove = async () => {
        setLoading(true);
        try {
            const res = await approveTestingSample({
                sample_ids: sampleIds,
                // V2: 移除 item_id
                method_ids: methodIds
            });

            if (res.data.status === 0) {
                message.success("提交至科室成功");
                onSuccess();
            } else {
                message.error(res.data.message || "提交失败");
            }
        } catch (error) {
            message.error("提交异常");
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: '实验室编号',
            dataIndex: 'labCode',
            key: 'labCode',
            render: (text) => <span className="font-mono font-bold text-slate-700">{text}</span>
        },
        // V2: 方法上提到样品级，移除“检测项目”列
        {
            title: '检测方法',
            dataIndex: 'methodName',
            key: 'methodName',
            width: 150,
            render: (text) => <Tag color="blue" className="m-0 border-none font-bold">{text}</Tag>
        },
        {
            title: '录入数据',
            dataIndex: 'results',
            key: 'results',
            render: (results) => (
                <div className="flex flex-col gap-1">
                    {results && results.length > 0 ? (
                        results.map((r, i) => (
                            <div key={i} className="flex items-start bg-white px-2 py-1.5 rounded border border-slate-200 text-[14px]">
                                <span className="text-slate-400 mr-1 shrink-0 pt-[1px]">{r.name}:</span>
                                <span className="font-bold text-slate-700 break-words whitespace-pre-wrap flex-1 min-w-0">{r.value}</span>
                            </div>
                        ))
                    ) : (
                        <span className="text-xs text-slate-300 italic">暂无录入数据</span>
                    )}
                </div>
            )
        }
    ];

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <SendOutlined className="text-green-500" />
                    <span>提交至科室审核</span>
                </div>
            }
            open={open}
            onCancel={onCancel}
            onOk={handleApprove}
            confirmLoading={loading}
            width={700}
            destroyOnClose
            centered
            okText="确认提交"
            cancelText="返回修改"
            okButtonProps={{ 
                className: "bg-green-600 hover:bg-green-700 border-none rounded-lg font-bold" 
            }}
            cancelButtonProps={{ className: "rounded-lg" }}
        >
            <div className="mb-4">
                <Alert
                    message="提交确认"
                    description="请核对以下待提交的实验项目。提交后数据将流转至科室负责人。"
                    type="warning"
                    showIcon
                    icon={<InfoCircleOutlined />}
                    className="rounded-xl border-orange-100 bg-orange-50"
                />
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <Table
                    dataSource={details}
                    columns={columns}
                    pagination={false}
                    rowKey={(record, index) => `${record.labCode}-${index}`}
                    size="small"
                    className="approve-table"
                />
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                <CheckCircleOutlined className="text-green-500" />
                <span>提交后状态将变更为：等待组长审核</span>
            </div>
        </Modal>
    );
};

export default ApproveModal;
