import React, { useMemo, useState, useEffect } from 'react';
import { Modal, Form, Select, Radio, Cascader, message, Spin, DatePicker } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { distributeSample, readSample } from '../../../../api/workflow';
import { comboDepartment } from '../../../../api/department';

const BatchDistributeModal = ({ 
    open, 
    onCancel, 
    taskId, 
    onSuccess 
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [taskSamples, setTaskSamples] = useState([]);
    const [testItems, setTestItems] = useState([]);
    const [itemMethodMap, setItemMethodMap] = useState({});
    const [departments, setDepartments] = useState([]);
    
    const scope = Form.useWatch('scope', form);
    const selectedSampleIds = Form.useWatch('sample_ids', form);

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
            
            const allItemsMap = new Map();
            const methodMap = {}; // { itemId: [ { id, name } ] }
            
            samples.forEach(s => {
                s.items?.forEach(item => {
                    const itemId = item.item_id || item.id;
                    const itemName = item.item_name || item.name;
                    
                    if (itemId) {
                        if (!allItemsMap.has(itemId)) {
                            allItemsMap.set(itemId, { id: itemId, name: itemName });
                        }
                        
                        // Collect methods for this item from this sample
                        if (item.methods?.length > 0) {
                            if (!methodMap[itemId]) methodMap[itemId] = new Map();
                            item.methods.forEach(m => {
                                const mId = m.method_id || m.id;
                                const mName = m.method_name || m.name;
                                if (mId && !methodMap[itemId].has(mId)) {
                                    methodMap[itemId].set(mId, { id: mId, name: mName });
                                }
                            });
                        }
                    }
                });
            });
            
            setTestItems(Array.from(allItemsMap.values()));
            
            // Convert Map to array for itemMethodMap
            const finalMethodMap = {};
            Object.keys(methodMap).forEach(itemId => {
                finalMethodMap[itemId] = Array.from(methodMap[itemId].values());
            });
            setItemMethodMap(finalMethodMap);
            
        } catch (error) {
            message.error("加载数据失败");
        } finally {
            setLoading(false);
        }
    };

    const cascaderOptions = useMemo(() => {
        return taskSamples.map(s => {
            const itemNodes = (s.items || []).map(item => {
                const itemId = item.item_id || item.id;
                const itemName = item.item_name || item.name;
                const isProcessing = item.processing_status === 1;
                const methodNodes = (item.methods || []).map(m => {
                    const isDistributed = m.status > 0;
                    const methodName = m.method_name || m.name;
                    // If the item is processing, all its methods are naturally disabled for distribution
                    const isMethodDisabled = isProcessing || isDistributed;
                    return {
                        label: isDistributed ? `${methodName} (已下发)` : methodName,
                        value: m.method_id || m.id,
                        disabled: isMethodDisabled
                    };
                });

                const allMethodsLocked = methodNodes.every(m => m.disabled);
                const isItemLocked = isProcessing || allMethodsLocked;

                return {
                    label: isItemLocked ? (
                        <span className="text-slate-400">
                            {isProcessing ? `${itemName} (加工中)` : `${itemName} (已全部下发)`}
                        </span>
                    ) : itemName,
                    value: itemId,
                    children: methodNodes,
                    isLocked: isItemLocked // Helper for parent node
                };
            }).filter(node => node.children && node.children.length > 0);

            const allItemsLocked = itemNodes.every(node => node.isLocked);
            const sampleLabel = `${s.client_code || '未命名'} (#${s.id})`;

            return {
                label: allItemsLocked ? (
                    <span className="text-slate-400">
                        {sampleLabel}
                    </span>
                ) : sampleLabel,
                value: s.id,
                children: itemNodes
            };
        }).filter(node => node.children && node.children.length > 0);
    }, [taskSamples]);

    const handleSubmit = async (values) => {
        try {
            // selections is Array<[sampleId, itemId, methodId]>
            if (!values.selections || values.selections.length === 0) {
                message.warning("请选择下发内容");
                return;
            }

            // 1. Group by itemId
            const itemMap = {}; // { itemId: { methodId: Set<sampleId> } }
            
            values.selections.forEach(([sampleId, itemId, methodId]) => {
                if (!itemMap[itemId]) itemMap[itemId] = {};
                if (!itemMap[itemId][methodId]) itemMap[itemId][methodId] = new Set();
                itemMap[itemId][methodId].add(sampleId);
            });

            // 2. For each item, group methods that have the exact same set of samples
            const promises = [];
            Object.entries(itemMap).forEach(([itemId, methods]) => {
                const sampleSets = {}; // { "id1,id2...": [methodId1, methodId2] }
                
                Object.entries(methods).forEach(([methodId, sampleSet]) => {
                    const key = Array.from(sampleSet).sort().join(',');
                    if (!sampleSets[key]) sampleSets[key] = [];
                    sampleSets[key].push(Number(methodId));
                });

                Object.entries(sampleSets).forEach(([sampleKey, methodIds]) => {
                    const sampleIds = sampleKey.split(',').map(Number);
                    promises.push(distributeSample({
                        sample_ids: sampleIds,
                        item_id: Number(itemId),
                        method_ids: methodIds,
                        department_id: values.department_id,
                        deadline: values.deadline ? values.deadline.format("YYYY-MM-DD") : null
                    }));
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
                        label="选择下发内容 (样品 > 检测项目 > 试验方法)" 
                        rules={[{ required: true, message: '请选择至少一个试验方法' }]}
                    >
                        <Cascader 
                            multiple
                            placeholder="请选择 样品 - 项目 - 方法" 
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
