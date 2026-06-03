import React, { useMemo, useState, useEffect } from 'react';
import { Modal, Form, Select, DatePicker, Radio, Cascader, message, Spin } from 'antd';
import { ToolOutlined } from '@ant-design/icons';
import { processCreateSample, readSample } from '../../../../api/workflow';
import { comboProcessingMethod } from '../../../../api/processingMethod';

const BatchProcessingModal = ({ 
    open, 
    onCancel, 
    taskId, 
    onSuccess 
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [taskSamples, setTaskSamples] = useState([]);
    const [testItems, setTestItems] = useState([]);
    const [procOptions, setProcOptions] = useState([]);
    
    const scope = Form.useWatch('scope', form);
    const selectedSampleIds = Form.useWatch('sample_ids', form);

    useEffect(() => {
        if (open && taskId) {
            fetchData();
        }
    }, [open, taskId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resSamples, resOptions] = await Promise.all([
                readSample({ task_id: taskId, limit: 1000 }),
                comboProcessingMethod()
            ]);
            
            const samples = resSamples.data.data?.rows || resSamples.data.data || [];
            setTaskSamples(samples);
            
            const allItemsMap = new Map();
            samples.forEach(s => {
                s.items?.forEach(item => {
                    const itemId = item.item_id || item.id;
                    const itemName = item.item_name || item.name;
                    if (itemId && !allItemsMap.has(itemId)) {
                        allItemsMap.set(itemId, { id: itemId, name: itemName });
                    }
                });
            });
            
            setTestItems(Array.from(allItemsMap.values()));
            setProcOptions(resOptions.data.data || []);
        } catch (error) {
            message.error("加载数据失败");
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = useMemo(() => {
        if (scope !== 'samples' || !selectedSampleIds?.length) {
            return testItems;
        }
        const availableItemIds = new Set();
        taskSamples
            .filter(s => selectedSampleIds.includes(s.id))
            .forEach(s => s.items?.forEach(i => availableItemIds.add(i.item_id || i.id)));
        
        return testItems.filter(i => availableItemIds.has(i.id));
    }, [scope, selectedSampleIds, testItems, taskSamples]);

    const cascaderOptions = useMemo(() => {
        return procOptions.map(m => ({
            label: m.name,
            value: m.id,
            children: m.options?.map(o => ({
                label: o.value,
                value: o.id
            }))
        }));
    }, [procOptions]);

    const handleSubmit = async (values) => {
        try {
            const isTaskScope = values.scope === 'task';
            const payload = {
                ...(isTaskScope ? { task_id: taskId } : { sample_ids: values.sample_ids }),
                item_ids: values.item_ids,
                option_ids: values.option_ids?.map(path => Array.isArray(path) ? path[path.length - 1] : path),
                deadline: values.deadline ? values.deadline.format("YYYY-MM-DD") : null
            };
            await processCreateSample(payload);
            message.success("批量配置成功");
            onSuccess();
        } catch (error) {
            message.error("批量配置失败");
        }
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <ToolOutlined className="text-blue-500" />
                    <span>批量配置前处理要求</span>
                </div>
            }
            open={open}
            onCancel={onCancel}
            onOk={() => form.submit()}
            width={600}
            okText="确认配置"
            cancelText="取消"
            centered
            destroyOnClose
            confirmLoading={loading}
        >
            <Spin spinning={loading}>
                <Form form={form} onFinish={handleSubmit} layout="vertical" className="mt-4" initialValues={{ scope: 'task' }}>
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="scope" label="应用范围" rules={[{ required: true }]}>
                            <Radio.Group optionType="button" buttonStyle="solid">
                                <Radio value="task">整个任务</Radio>
                                <Radio value="samples">选定样品</Radio>
                            </Radio.Group>
                        </Form.Item>
                        <Form.Item name="deadline" label="完成截止时间" rules={[{ required: true, message: '请选择完成截止时间' }]}>
                            <DatePicker 
                                showTime 
                                className="w-full h-10" 
                                placeholder="选择日期时间" 
                                disabledDate={current => current && current < dayjs().startOf('day')}
                            />
                        </Form.Item>
                    </div>

                    {scope === 'samples' && (
                        <Form.Item name="sample_ids" label="选择样品" rules={[{ required: true, message: '请选择具体样品' }]}>
                            <Select 
                                mode="multiple" 
                                placeholder="多选样品" 
                                options={taskSamples.map(s => ({ label: `${s.client_code} (#${s.id})`, value: s.id }))}
                                filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
                            />
                        </Form.Item>
                    )}

                    <Form.Item name="item_ids" label="目标检测项目" rules={[{ required: true, message: '请选择要配置的项目' }]}>
                        <Select 
                            mode="multiple" 
                            placeholder="选择受影响的项目" 
                            options={filteredItems.map(i => ({ label: i.name, value: i.id }))}
                            filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
                        />
                    </Form.Item>

                    <Form.Item name="option_ids" label="加工方法与选项" rules={[{ required: true, message: '请选择加工方法' }]}>
                        <Cascader 
                            multiple
                            placeholder="选择加工选项" 
                            options={cascaderOptions}
                            showSearch
                            className="w-full"
                            expandTrigger="hover"
                            maxTagCount="responsive"
                            displayRender={(labels) => labels.join(' / ')}
                            showCheckedStrategy="SHOW_CHILD"
                        />
                    </Form.Item>
                </Form>
            </Spin>
        </Modal>
    );
};

export default BatchProcessingModal;
