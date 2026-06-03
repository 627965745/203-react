import React, { useState, useEffect } from "react";
import { Modal, Form, Select, DatePicker, Button, message, Divider, Space, Tag, Alert, Cascader } from "antd";
import { ToolOutlined, ExperimentOutlined, InfoCircleOutlined, UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { comboTestMethod } from "../../../api/testMethod";
import { methodTestItem } from "../../../api/testItem";
import { comboProcessingMethod } from "../../../api/processingMethod";
import { comboUser } from "../../../api/user";

const ItemConfigModal = ({ 
    visible, 
    onClose, 
    onSaveMethod, 
    onSaveProcess,
    onDeleteProcess,
    onDeleteMethod,
    disabled = false,
    hideProcessing = false,
    itemId, 
    itemName,
    itemData // This contains processing and methods list for this item
}) => {
    const [procForm] = Form.useForm();
    const [methodForm] = Form.useForm();
    
    const [loading, setLoading] = useState(false);
    const [procOptions, setProcOptions] = useState([]);
    const [testMethods, setTestMethods] = useState([]);
    
    const [procDropdownOpen, setProcDropdownOpen] = useState(false);
    
    const cascaderOptions = React.useMemo(() => {
        return procOptions.map(m => ({
            label: m.name,
            value: String(m.id),
            children: m.options?.map(o => ({
                label: o.value,
                value: String(o.id)
            }))
        }));
    }, [procOptions]);
    
    const isProcessingLocked = React.useMemo(() => {
        return itemData?.methods?.some(m => m.status > 0);
    }, [itemData]);

    useEffect(() => {
        if (visible && itemId) {
            fetchData();
            // Reset and set Proc values
            if (itemData?.processing?.length > 0) {
                procForm.setFieldsValue({
                    option_ids: itemData.processing.map(p => [String(p.method_id), String(p.option_id || p.id)]),
                    deadline: itemData.processing_deadline ? dayjs(itemData.processing_deadline) : null
                });
            } else {
                procForm.resetFields();
            }
            // Reset Method values (usually for adding a new one, editing is separate but here we can simplify)
            methodForm.resetFields();
        }
    }, [visible, itemId, itemData, procForm, methodForm]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resProc, resMethods] = await Promise.all([
                comboProcessingMethod({ item_id: itemId }),
                methodTestItem({ id: itemId })
            ]);
            setProcOptions(resProc.data.data || []);
            setTestMethods(resMethods.data.data || []);
        } catch (error) {
            message.error("加载配置选项失败");
        } finally {
            setLoading(false);
        }
    };

    const fetchMethods = async (searchQuery = '') => {
        try {
            const res = await methodTestItem({ 
                id: itemId, 
                query: searchQuery 
            });
            setTestMethods(res.data.data || []);
        } catch (error) {
            message.error("获取方法失败");
        }
    };

    const handleMethodSearch = (value) => {
        fetchMethods(value);
    };

    const handleSaveProcess = () => {
        procForm.validateFields().then(values => {
            onSaveProcess(itemId, {
                ...values,
                option_ids: values.option_ids?.map(path => {
                    const leaf = Array.isArray(path) ? path[path.length - 1] : path;
                    return isNaN(Number(leaf)) ? leaf : Number(leaf);
                }),
                deadline: values.deadline ? values.deadline.format("YYYY-MM-DD") : null
            });
        });
    };

    const handleSaveMethod = async () => {
        try {
            const values = await methodForm.validateFields();
            
            // If there are existing methods, we check if we need to replace
            // The user wants to change the method by deleting the old one and creating a new one
            if (itemData?.methods?.length > 0) {
                const isDifferent = itemData.methods.some(m => m.method_id !== values.method_id);
                if (isDifferent) {
                    setLoading(true);
                    for (const m of itemData.methods) {
                        await onDeleteMethod(itemId, m.method_id);
                    }
                }
            }
            
            await onSaveMethod(itemId, values);
            methodForm.resetFields();
        } catch (error) {
            // Validation failed or API error
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal 
            title={
                <Space>
                    <span className="text-lg font-black text-slate-800">项目精细化配置: {itemName}</span>
                    <span className="text-slate-400 font-mono text-sm">#{itemId}</span>
                </Space>
            }
            open={visible} 
            onCancel={onClose} 
            footer={null}
            centered 
            width={800}
            destroyOnClose
        >
            <div className="space-y-8 py-4">
                {/* Section 1: Processing */}
                {!hideProcessing && (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-center mb-4">
                            <div className="text-sm font-black text-slate-700 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                                    <ToolOutlined />
                                </div>
                                <span>前处理 (加工) 配置</span>
                            </div>
                            {itemData?.processing_status === 1 && !disabled && (
                                <Button danger type="link" size="small" onClick={() => onDeleteProcess(itemId)}>删除当前配置</Button>
                            )}
                        </div>
                        
                        {isProcessingLocked && (
                            <Alert 
                                message="前处理要求已锁定" 
                                description="由于试验方法已下发或正在执行，无法修改前处理配置。" 
                                type="warning" 
                                showIcon 
                                className="mb-6 rounded-xl"
                            />
                        )}
                        
                        <Form form={procForm} layout="vertical" disabled={isProcessingLocked || disabled}>
                            <Form.Item name="option_ids" label="加工方法与选项" rules={[{ required: true, message: '请选择加工要求' }]}>
                                <Cascader 
                                    multiple
                                    placeholder={cascaderOptions.length > 0 ? "选择加工工序及其具体参数" : "暂无可选加工方法"}
                                    options={cascaderOptions}
                                    showSearch
                                    className="w-full"
                                    expandTrigger="hover"
                                    maxTagCount="responsive"
                                    dropdownMenuColumnStyle={{ minWidth: '160px' }}
                                    displayRender={(labels) => labels.join(' / ')}
                                    showCheckedStrategy="SHOW_CHILD"
                                />
                            </Form.Item>
                            <Form.Item label="预期完成时间" rules={[{ required: true, message: '请设定日期' }]} className="mb-0">
                                <div className="flex gap-4 items-center">
                                    <Form.Item name="deadline" noStyle>
                                        <DatePicker 
                                            className="flex-1 h-10 rounded-lg" 
                                            placeholder="选择日期" 
                                            disabledDate={current => current && current < dayjs().startOf('day')}
                                        />
                                    </Form.Item>
                                    {!isProcessingLocked && !disabled && (
                                        <Button type="primary" className="h-10 px-8 rounded-lg bg-slate-900 flex-shrink-0" onClick={handleSaveProcess}>更新加工要求</Button>
                                    )}
                                </div>
                            </Form.Item>
                        </Form>
                    </div>
                )}

                {/* Section 2: Testing Method Addition */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="text-sm font-black text-slate-700 flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                            <ExperimentOutlined />
                        </div>
                        <span>分配检测试验方法</span>
                    </div>

                    <Form form={methodForm} layout="vertical" disabled={disabled}>
                        <Form.Item label="检测方法" rules={[{ required: true, message: '必选' }]} className="mb-0">
                            <div className="flex gap-4 items-center">
                                <Form.Item name="method_id" noStyle>
                                    <Select 
                                        placeholder={testMethods.length > 0 ? "请选择" : "暂无关联方法"} 
                                        options={testMethods.map(m => ({ label: m.name, value: m.id }))}
                                        showSearch
                                        onSearch={handleMethodSearch}
                                        optionFilterProp="label"
                                        className="flex-1 h-10"
                                    />
                                </Form.Item>
                                {!disabled && (
                                    <Button type="primary" ghost className="h-10 px-8 rounded-lg border-blue-200 flex-shrink-0" onClick={handleSaveMethod}>
                                        分派该方法
                                    </Button>
                                )}
                            </div>
                        </Form.Item>
                    </Form>
                    
                    {itemData?.methods?.length > 0 && (
                        <div className="mt-6 border-t border-slate-200 pt-4">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-3">已分发的方法列表 ({itemData.methods.length})</p>
                            <div className="space-y-3">
                                {itemData.methods.map(m => {
                                    const statusCfg = {
                                        0: { label: "管理组未下发", color: "default" },
                                        1: { label: "组长未下发", color: "blue" },
                                        2: { label: "正在试验", color: "orange" },
                                        3: { label: "等待组长审核", color: "cyan" },
                                        4: { label: "等待管理组审核", color: "purple" },
                                        5: { label: "生命周期结束", color: "green" },
                                    }[m.status] || { label: "未知状态", color: "default" };

                                    return (
                                        <div key={m.method_id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold text-slate-800 text-sm">{m.method_name || m.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <Tag color={statusCfg.color} className="m-0 text-[10px] border-none font-bold">
                                                            {statusCfg.label}
                                                        </Tag>
                                                        {m.department_name && (
                                                            <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                                {m.department_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-1">
                                                    <span className="text-slate-500 font-mono text-[10px] font-bold">
                                                        {m.status === 0 ? '未下发（暂无期限）' : (m.test_deadline || '未设定完成期限')}
                                                    </span>
                                                    <span className="text-[9px] text-slate-300 uppercase tracking-tighter">完成期限</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                                                <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">
                                                        <UserOutlined />
                                                    </div>
                                                    <span className="font-medium">
                                                        {m.tester_name || (m.status === 0 ? '等待管理组下发' : (m.status === 1 ? '等待组长指派检测员' : '未指派'))}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-400">试验执行人</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default ItemConfigModal;
