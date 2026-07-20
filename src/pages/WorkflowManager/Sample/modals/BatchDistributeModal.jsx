import React, { useMemo, useState, useEffect } from 'react';
import { Modal, Form, Select, Cascader, message, Spin, DatePicker } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { distributeSample, readSample } from '../../../../api/workflow';
import { comboDepartment } from '../../../../api/department';

// V2: 方法上提到样品级，级联由 样品>项目>方法 三级简化为 样品>方法 两级；下发移除 item_id
const BatchDistributeModal = ({
    open,
    onCancel,
    taskId,
    onSuccess
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [taskSamples, setTaskSamples] = useState([]);
    const [departments, setDepartments] = useState([]);

    const lastTaskId = React.useRef(taskId);

    useEffect(() => {
        if (open && taskId) {
            if (taskId !== lastTaskId.current) {
                form.resetFields();
                lastTaskId.current = taskId;
            }
            fetchInitialData();
        }
    }, [open, taskId]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [resSamples, resDepts] = await Promise.all([
                readSample({ task_id: taskId, limit: 1000 }),
                comboDepartment()
            ]);

            const samples = resSamples.data.data?.rows || resSamples.data.data || [];
            setTaskSamples(samples);
            setDepartments(resDepts.data.data || []);
        } catch (error) {
            message.error("加载数据失败");
        } finally {
            setLoading(false);
        }
    };

    const cascaderOptions = useMemo(() => {
        return taskSamples.map(s => {
            // V2: 加工状态读取样品级
            const isProcessing = s.processing_status === 1;
            const methodNodes = (s.methods || []).map(m => {
                const isDistributed = m.status > 0;
                const methodName = m.method_name || m.name;
                // 样品在加工中时，其所有方法都不能下发
                const isMethodDisabled = isProcessing || isDistributed;
                return {
                    label: isDistributed ? `${methodName} (已下发)` : methodName,
                    value: m.method_id || m.id,
                    disabled: isMethodDisabled
                };
            });

            const allMethodsLocked = methodNodes.every(m => m.disabled);
            const sampleLabel = `${s.client_code || '未命名'} (#${s.id})`;

            return {
                label: (isProcessing || allMethodsLocked) ? (
                    <span className="text-slate-400">
                        {isProcessing ? `${sampleLabel} (加工中)` : `${sampleLabel} (已全部下发)`}
                    </span>
                ) : sampleLabel,
                value: s.id,
                children: methodNodes
            };
        }).filter(node => node.children && node.children.length > 0);
    }, [taskSamples]);

    const handleSubmit = async (values) => {
        try {
            // V2: selections is Array<[sampleId, methodId]>
            if (!values.selections || values.selections.length === 0) {
                message.warning("请选择下发内容");
                return;
            }

            // 1. 按 methodId 汇总涉及的样品集合
            const methodMap = {}; // { methodId: Set<sampleId> }
            values.selections.forEach(([sampleId, methodId]) => {
                if (!methodMap[methodId]) methodMap[methodId] = new Set();
                methodMap[methodId].add(sampleId);
            });

            // 2. 将样品集合完全相同的方法合并成一次下发请求
            const sampleSets = {}; // { "id1,id2...": [methodId1, methodId2] }
            Object.entries(methodMap).forEach(([methodId, sampleSet]) => {
                const key = Array.from(sampleSet).sort().join(',');
                if (!sampleSets[key]) sampleSets[key] = [];
                sampleSets[key].push(Number(methodId));
            });

            const promises = Object.entries(sampleSets).map(([sampleKey, methodIds]) => {
                const sampleIds = sampleKey.split(',').map(Number);
                return distributeSample({
                    sample_ids: sampleIds,
                    // V2: 移除 item_id
                    method_ids: methodIds,
                    department_id: values.department_id,
                    deadline: values.deadline ? values.deadline.format("YYYY-MM-DD") : null
                });
            });

            await Promise.all(promises);
            message.success("批量下发成功");
            onSuccess();
        } catch (error) {
            message.error("部分下发失败，请检查");
        }
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <SendOutlined className="text-emerald-500" />
                    <span>批量下发至科室</span>
                </div>
            }
            open={open}
            onCancel={onCancel}
            onOk={() => form.submit()}
            width={700}
            okText="确认下发"
            cancelText="取消"
            centered
            confirmLoading={loading}
        >
            <Spin spinning={loading}>
                <Form form={form} onFinish={handleSubmit} layout="vertical" className="mt-4">
                    <Form.Item
                        name="selections"
                        label="选择下发内容 (样品 > 试验方法)"
                        rules={[{ required: true, message: '请选择至少一个试验方法' }]}
                    >
                        <Cascader
                            multiple
                            placeholder="请选择 样品 - 方法"
                            options={cascaderOptions}
                            showSearch
                            className="w-full"
                            expandTrigger="hover"
                            maxTagCount="responsive"
                            displayRender={(labels) => labels.join(' / ')}
                            showCheckedStrategy="SHOW_CHILD"
                            style={{ minHeight: '32px' }}
                        />
                    </Form.Item>

                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="department_id" label="接收科室" rules={[{ required: true, message: '请选择科室' }]}>
                            <Select 
                                placeholder="选择科室" 
                                options={departments.map(d => ({ label: d.name, value: d.id }))}
                                showSearch
                                optionFilterProp="label"
                            />
                        </Form.Item>
                        <Form.Item name="deadline" label="完成期限" rules={[{ required: true, message: '请选择日期' }]}>
                            <DatePicker 
                                className="w-full" 
                                placeholder="选择日期" 
                                disabledDate={current => current && current < dayjs().startOf('day')}
                            />
                        </Form.Item>
                    </div>
                    
                </Form>
            </Spin>
        </Modal>
    );
};

export default BatchDistributeModal;
