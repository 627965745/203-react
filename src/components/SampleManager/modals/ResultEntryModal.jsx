import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, DatePicker, Button, Space, message, Spin, Tag, Tooltip, Empty, Divider } from 'antd';
import { 
    ExperimentOutlined, 
    LinkOutlined, 
    LockOutlined, 
    ThunderboltOutlined, 
    CalculatorOutlined,
    SyncOutlined,
    SaveOutlined
} from '@ant-design/icons';
import { fieldTestMethod } from '../../../api/testMethod';
import { resultCreateTestingSample } from '../../../api/testing';
import dayjs from 'dayjs';
import axios from 'axios';

// V2: 结果录入不再需要 itemId —— 结果主键由 (sample_id, item_id, field_id) 变为 (sample_id, field_id)
const ResultEntryModal = ({ open, onCancel, onSuccess, methodId, methodName, methodData, sampleData, readOnly = false }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [fields, setFields] = useState([]);
    const [deviceLoading, setDeviceLoading] = useState({});

    useEffect(() => {
        if (open && methodId) {
            fetchFields();
        }
    }, [open, methodId]);

    const fetchFields = async () => {
        setLoading(true);
        try {
            const res = await fieldTestMethod({ id: methodId });
            if (res.data.status === 0) {
                const sortedFields = (res.data.data || []).sort((a, b) => a.sort - b.sort);
                setFields(sortedFields);
                
                // Initialize form with mapped, fixed, or existing result values
                const initialValues = {};
                sortedFields.forEach(f => {
                    let val = null;
                    
                    // 1. Check if there's an existing result already saved
                    const existingResult = methodData?.results?.find(r => 
                        r.field_id === f.id || r.name === f.name
                    );
                    
                    if (existingResult) {
                        val = existingResult.value;
                    } else if (f.source_type === 1) { // 2. Mapped from Sample Input
                        const mappedInput = sampleData?.inputs?.find(i => i.key === f.input_mapped_from);
                        val = mappedInput ? mappedInput.value : null;
                    } else if (f.source_type === 2) { // 3. Fixed Value
                        val = f.fixed_value;
                    }

                    // Handle data type conversion (e.g. for DatePicker)
                    if (val !== null && val !== undefined) {
                        if (f.data_type === 2) { // Date
                            initialValues[f.key] = dayjs(val);
                        } else if (f.data_type === 1) { // Number
                            initialValues[f.key] = Number(val);
                        } else {
                            initialValues[f.key] = val;
                        }
                    }
                });
                form.setFieldsValue(initialValues);
            }
        } catch (error) {
            message.error("加载方法字段失败");
        } finally {
            setLoading(false);
        }
    };

    const handleFetchDeviceData = async (field) => {
        if (readOnly) return;
        setDeviceLoading(prev => ({ ...prev, [field.key]: true }));
        try {
            const res = await axios.get(field.device_api);
            let value = typeof res.data === 'object' ? (res.data.value || res.data.data) : res.data;
            
            if (field.data_type === 2 && value) {
                value = dayjs(value);
            } else if (field.data_type === 1 && value) {
                value = Number(value);
            }

            form.setFieldsValue({ [field.key]: value });
            message.success(`已从设备采集数据: ${value}`);
        } catch (error) {
            message.error("设备采集失败: " + error.message);
        } finally {
            setDeviceLoading(prev => ({ ...prev, [field.key]: false }));
        }
    };

    const onFinish = async (values) => {
        if (readOnly) return;
        setSubmitting(true);
        try {
            // Per the new requirement, we submit each field individually
            const requests = fields.map(f => {
                let val = values[f.key];
                
                // Format values based on type
                if (f.data_type === 2 && val) {
                    val = dayjs(val).format('YYYY-MM-DD');
                }
                
                return resultCreateTestingSample({
                    sample_id: sampleData.id,
                    // V2: 移除 item_id，结果主键为 (sample_id, field_id)
                    field_id: f.id,
                    value: val != null ? String(val) : ""
                });
            });

            const results = await Promise.all(requests);
            
            // Check for any failures
            const errors = results.filter(r => r.data.status !== 0);
            
            if (errors.length === 0) {
                message.success("所有字段结果保存成功");
                onSuccess();
            } else {
                message.error(`部分字段保存失败 (${errors.length}/${fields.length})`);
            }
        } catch (error) {
            message.error("提交过程发生异常: " + (error.message || "未知错误"));
        } finally {
            setSubmitting(false);
        }
    };

    const renderField = (field) => {
        const { source_type, data_type, is_required, name, key, device_api } = field;
        
        let inputComponent;
        const isDisabled = (source_type !== 0) || readOnly; // Only manual (0) is editable, and never in readOnly mode
        
        if (data_type === 1) { // Number
            inputComponent = <InputNumber className="w-full" style={{ width: "50%" }} disabled={isDisabled} placeholder="请输入数值" />;
        } else if (data_type === 2) { // Date
            inputComponent = <DatePicker className="w-full" style={{ width: "50%" }} disabled={isDisabled} placeholder="请选择日期" />;
        } else { // Text
            inputComponent = <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} className="w-full" style={{ width: "100%" }} disabled={isDisabled} placeholder="请输入内容" />;
        }

        const indicators = [];
        if (source_type === 1) indicators.push(<Tag icon={<LinkOutlined />} color="blue" key="map" className="m-0 text-[10px]">参数引入</Tag>);
        if (source_type === 2) indicators.push(<Tag icon={<LockOutlined />} color="default" key="fixed" className="m-0 text-[10px]">固定值</Tag>);
        if (source_type === 3) indicators.push(<Tag icon={<ThunderboltOutlined />} color="warning" key="device" className="m-0 text-[10px]">设备采集</Tag>);
        if (source_type === 4) indicators.push(<Tag icon={<CalculatorOutlined />} color="purple" key="calc" className="m-0 text-[10px]">代码计算</Tag>);

        return (
            <Form.Item
                key={key}
                name={key}
                label={
                    <Space size={4}>
                        <span className="font-bold text-slate-700">{name}</span>
                        {indicators}
                    </Space>
                }
                rules={[{ required: is_required === 1 && !readOnly, message: `${name}是必填项` }]}
            >
                {source_type === 3 ? (
                    <div className="flex gap-2">
                        {inputComponent}
                        {!readOnly && (
                            <Tooltip title={`采集地址: ${device_api}`}>
                                <Button 
                                    icon={<SyncOutlined spin={deviceLoading[key]} />} 
                                    onClick={() => handleFetchDeviceData(field)}
                                    disabled={!device_api || readOnly}
                                    className="border-orange-200 text-orange-500 hover:text-orange-600 hover:border-orange-300"
                                >
                                    采集
                                </Button>
                            </Tooltip>
                        )}
                    </div>
                ) : inputComponent}
            </Form.Item>
        );
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                        <ExperimentOutlined className="text-orange-500" />
                    </div>
                    <div>
                        <div className="text-base font-black text-slate-800">
                            {readOnly ? '实验结果查看' : '实验结果录入'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">{methodName}</div>
                    </div>
                </div>
            }
            open={open}
            onCancel={onCancel}
            onOk={() => form.submit()}
            confirmLoading={submitting}
            width={600}
            destroyOnClose
            centered
            okText="提交结果"
            cancelText={readOnly ? "关闭" : "取消"}
            okButtonProps={readOnly ? { style: { display: 'none' } } : { 
                icon: <SaveOutlined />,
                className: "rounded-lg font-bold bg-orange-500 hover:bg-orange-600 border-none shadow-orange-100 shadow-lg"
            }}
            cancelButtonProps={{ className: "rounded-lg" }}
        >
            <Spin spinning={loading}>
                <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider">样品基本信息</span>
                        <Tag color={readOnly ? "cyan" : "orange"} className="m-0 border-none rounded-md px-2 text-[10px]">
                            {readOnly ? "已提交审核" : "实验进行中"}
                        </Tag>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400">实验室编号</span>
                            <span className="font-mono font-bold text-slate-700">{sampleData?.task_lab_code}-{sampleData?.lab_code?.toString().padStart(4, '0')}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400">客户样号</span>
                            <span className="font-bold text-slate-700">{sampleData?.client_code || '-'}</span>
                        </div>
                    </div>
                </div>

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    requiredMark={false}
                >
                    {fields.length > 0 ? (
                        <div className="grid grid-cols-1 gap-x-6">
                            {fields.map(f => renderField(f))}
                        </div>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-300">
                            <Empty description={<span className="text-slate-400">该方法未配置任何检测字段</span>} />
                        </div>
                    )}
                </Form>
            </Spin>
        </Modal>
    );
};

export default ResultEntryModal;
