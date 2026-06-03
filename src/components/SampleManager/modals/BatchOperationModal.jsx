import React, { useState, useEffect, useMemo } from 'react';
import { 
    Modal, 
    Button, 
    Steps, 
    Cascader, 
    Select, 
    DatePicker, 
    Form, 
    message, 
    Spin,
    Divider,
    Tag,
    Tooltip
} from 'antd';
import { 
    ContainerOutlined, 
    RightOutlined, 
    LeftOutlined, 
    CheckCircleOutlined, 
    CloseCircleOutlined, 
    RocketOutlined, 
    AppstoreAddOutlined, 
    DeleteOutlined, 
    ToolOutlined,
    FileTextOutlined,
    BarcodeOutlined,
    EditOutlined,
    SendOutlined,
    RollbackOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Table as AntTable, Input } from 'antd';

// API imports
import * as workflowApi from '../../../api/workflow';
import * as departmentApi from '../../../api/department';
import * as testingApi from '../../../api/testing';
import { comboDepartment } from '../../../api/department';
import { comboTestItem, methodTestItem } from '../../../api/testItem';
import { comboProcessingMethod } from '../../../api/processingMethod';
import { comboUser } from '../../../api/user';
import { comboTask } from '../../../api/workflow';

const getOperations = (module) => {
    let ops = [];
    if (module === 'testing') {
        ops = [
            { label: '批量录入结果', value: 'resultEntry', icon: <EditOutlined />, color: 'blue', levels: 3 },
            { label: '批量提交结果', value: 'approve', icon: <SendOutlined />, color: 'green', levels: 3 },
            { label: '批量退回任务', value: 'reject', icon: <RollbackOutlined />, color: 'red', levels: 3 },
        ];
    } else {
        ops = [
            { label: '批量添加项目', value: 'itemCreate', icon: <AppstoreAddOutlined />, color: 'blue', levels: 1 },
            { label: '批量删除项目', value: 'itemDelete', icon: <DeleteOutlined />, color: 'red', levels: 2 },
            { label: '批量添加方法', value: 'methodCreate', icon: <FileTextOutlined />, color: 'cyan', levels: 2 },
            { label: '批量删除方法', value: 'methodDelete', icon: <DeleteOutlined />, color: 'orange', levels: 3 },
            { label: '批量添加加工', value: 'processCreate', icon: <ToolOutlined />, color: 'purple', levels: 2 },
            { label: '批量删除加工', value: 'processDelete', icon: <DeleteOutlined />, color: 'volcano', levels: 3 },
            { label: '批量下发', value: 'distribute', icon: <RocketOutlined />, color: 'emerald', levels: 3 },
            { label: '批量审核通过', value: 'approve', icon: <CheckCircleOutlined />, color: 'green', levels: 3 },
            { label: '批量审核拒绝', value: 'reject', icon: <CloseCircleOutlined />, color: 'red', levels: 3 },
        ];
        if (module === 'department') {
            ops.push({ label: '批量撤回任务', value: 'rollback', icon: <RollbackOutlined />, color: 'red', levels: 3 });
        }
    }

    // Filter out processing operations for department and testing managers
    if (module === 'department' || module === 'testing') {
        return ops.filter(op => !op.value.includes('process'));
    }
    return ops;
};

/**
 * Universal Batch Operation Modal
 * @param {string} module - 'workflow' | 'department' | 'testing'
 */
const BatchOperationModal = ({ open, onCancel, taskId, onSuccess, module = 'workflow' }) => {
    const [step, setStep] = useState(0);
    const [operation, setOperation] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const [taskSamples, setTaskSamples] = useState([]);
    const [currentTask, setCurrentTask] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [users, setUsers] = useState([]);
    const [itemOptions, setItemOptions] = useState([]);
    const [procOptions, setProcOptions] = useState([]);
    const [availableMethods, setAvailableMethods] = useState([]);
    
    const [form] = Form.useForm();
    
    // Resolve APIs based on module
    const api = useMemo(() => {
        const maps = {
            workflow: {
                readSample: workflowApi.readSample,
                itemCreate: workflowApi.itemCreateSample,
                itemDelete: workflowApi.itemDeleteSample,
                methodCreate: workflowApi.methodCreateSample,
                methodDelete: workflowApi.methodDeleteSample,
                processCreate: workflowApi.processCreateSample,
                processDelete: workflowApi.processDeleteSample,
                distribute: workflowApi.distributeSample,
                approve: workflowApi.approveSample,
                reject: workflowApi.rejectSample,
            },
            department: {
                readSample: departmentApi.readDepartmentSample,
                itemCreate: departmentApi.itemCreateDepartmentSample,
                itemDelete: departmentApi.itemDeleteDepartmentSample,
                methodCreate: departmentApi.methodCreateDepartmentSample,
                methodDelete: departmentApi.methodDeleteDepartmentSample,
                processCreate: null,
                processDelete: null,
                distribute: departmentApi.distributeDepartmentSample,
                approve: departmentApi.approveDepartmentSample,
                reject: departmentApi.rejectDepartmentSample,
                rollback: departmentApi.rollbackDepartmentSample,
            },
            testing: {
                readSample: testingApi.readTestingSample,
                itemCreate: testingApi.itemCreateTestingSample,
                itemDelete: testingApi.itemDeleteTestingSample,
                methodCreate: testingApi.methodCreateTestingSample,
                methodDelete: testingApi.methodDeleteTestingSample,
                processCreate: null,
                processDelete: null,
                distribute: null, // Testing manager usually doesn't distribute back?
                approve: testingApi.approveTestingSample,
                reject: testingApi.rollbackTestingSample, // Rejection in testing is usually rollback
                resultCreate: testingApi.resultCreateTestingSample,
            }
        };
        return maps[module] || maps.workflow;
    }, [module]);

    const getSelectionCount = () => {
        const vals = form.getFieldValue('selections');
        return vals ? vals.length : 0;
    };

    useEffect(() => {
        if (open && taskId) {
            fetchInitialData();
            setStep(0);
            form.resetFields();
            setOperation(null);
        }
    }, [open, taskId]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const promises = [
                api.readSample({ task_id: taskId, limit: 1000 }),
                comboTask({ id: taskId })
            ];

            if (module === 'workflow') {
                promises.push(comboDepartment());
            } else if (module === 'department') {
                promises.push(comboUser()); // Distribution in department is usually to users (inspectors)
            }

            const results = await Promise.all(promises);
            const resSamples = results[0];
            const resTasks = results[1];
            
            setTaskSamples(resSamples.data.data?.rows || resSamples.data.data || []);
            const task = (resTasks.data.data || []).find(t => t.id === taskId);
            setCurrentTask(task);

            if (module === 'workflow') {
                setDepartments(results[2].data.data || []);
            } else if (module === 'department') {
                setUsers(results[2].data.data || []);
            }
        } catch (error) {
            message.error("初始化数据失败");
        } finally {
            setLoading(false);
        }
    };

    const handleOperationSelect = (val) => {
        setOperation(getOperations(module).find(o => o.value === val));
        setStep(1);
    };

    const handleNext = async () => {
        const values = await form.validateFields(['selections']);
        if (!values.selections || values.selections.length === 0) {
            message.warning("请至少选择一项内容");
            return;
        }

        setLoading(true);
        try {
            if (operation.value === 'itemCreate') {
                const res = await comboTestItem();
                setItemOptions(res.data.data || []);
            } else if (operation.value === 'methodCreate') {
                const itemIds = Array.from(new Set(values.selections.map(path => path[path.length - 1])));
                const methodPromises = itemIds.map(id => methodTestItem({ id: id }));
                const methodResults = await Promise.all(methodPromises);
                
                let commonMethods = [];
                methodResults.forEach((res, index) => {
                    const currentMethods = res.data.data || [];
                    if (index === 0) commonMethods = currentMethods;
                    else commonMethods = commonMethods.filter(cm => currentMethods.some(m => (m.method_id || m.id) === (cm.method_id || cm.id)));
                });
                setAvailableMethods(commonMethods);
            } else if (operation.value === 'processCreate') {
                const res = await comboProcessingMethod();
                setProcOptions(res.data.data || []);
            }
            setStep(2);
        } catch (error) {
            message.error("加载详情配置失败");
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (step === 1) {
            form.resetFields();
            setOperation(null);
        }
        setStep(prev => prev - 1);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const allValues = form.getFieldsValue(true);
            const { selections, ...details } = allValues;
            
            if (!selections || selections.length === 0) {
                message.warning("选择内容已丢失，请重新选择");
                setStep(1);
                return;
            }

            const promises = [];
            if (operation.value === 'itemCreate') {
                const sampleIds = Array.from(new Set(selections.map(path => path[0])));
                const itemIds = details.item_ids?.map(path => Array.isArray(path) ? path[path.length - 1] : path) || [];
                if (sampleIds.length && itemIds.length) promises.push(api.itemCreate({ sample_ids: sampleIds, item_ids: itemIds }));
            } else if (operation.value === 'itemDelete') {
                const sampleItemMap = {}; 
                selections.forEach(path => {
                    const sid = path[0], iid = path[1];
                    if (sid && iid) {
                        if (!sampleItemMap[sid]) sampleItemMap[sid] = new Set();
                        sampleItemMap[sid].add(iid);
                    }
                });
                const itemSetMap = {}; 
                Object.entries(sampleItemMap).forEach(([sid, itemSet]) => {
                    const key = Array.from(itemSet).sort().join(',');
                    if (!itemSetMap[key]) itemSetMap[key] = [];
                    itemSetMap[key].push(Number(sid));
                });
                Object.entries(itemSetMap).forEach(([itemKey, sids]) => promises.push(api.itemDelete({ sample_ids: sids, item_ids: itemKey.split(',').map(Number) })));
            } else if (operation.value === 'methodCreate') {
                const itemIds = Array.from(new Set(selections.map(path => path[path.length - 1])));
                const sampleIds = Array.from(new Set(selections.map(path => path[0])));
                const methodIds = details.method_ids || [];
                if (itemIds.length && sampleIds.length && methodIds.length) {
                    itemIds.forEach(itemId => promises.push(api.methodCreate({ sample_ids: sampleIds, item_id: itemId, method_ids: methodIds })));
                }
            } else if (operation.value === 'processCreate') {
                const sampleIds = Array.from(new Set(selections.map(path => path[0])));
                const itemIds = Array.from(new Set(selections.map(path => path[1])));
                const optionIds = details.option_ids?.map(path => Array.isArray(path) ? path[path.length - 1] : path) || [];
                if (sampleIds.length && itemIds.length && optionIds.length) {
                    promises.push(api.processCreate({ 
                        sample_ids: sampleIds, 
                        item_ids: itemIds, 
                        option_ids: optionIds, 
                        deadline: details.deadline ? details.deadline.format("YYYY-MM-DD") : null 
                    }));
                }
            } else if (operation.value === 'resultEntry') {
                const selections = allValues.selections || [];
                // Group results by sample and method
                const resultGroups = {};
                
                if (details.results) {
                    Object.entries(details.results).forEach(([sid, methodGroup]) => {
                        Object.entries(methodGroup).forEach(([mid, fields]) => {
                            promises.push(api.resultCreate({
                                sample_id: Number(sid),
                                method_id: Number(mid),
                                results: fields
                            }));
                        });
                    });
                }
            } else {
                const itemMap = {}; 
                selections.forEach(path => {
                    const sid = path[0], iid = path[1], subid = path[2];
                    if (sid && iid && subid) {
                        if (!itemMap[iid]) itemMap[iid] = {};
                        if (!itemMap[iid][subid]) itemMap[iid][subid] = new Set();
                        itemMap[iid][subid].add(sid);
                    }
                });
                Object.entries(itemMap).forEach(([itemId, subGroup]) => {
                    const sampleSetMap = {}; 
                    Object.entries(subGroup).forEach(([subId, sSet]) => {
                        const key = Array.from(sSet).sort().join(',');
                        if (!sampleSetMap[key]) sampleSetMap[key] = [];
                        sampleSetMap[key].push(Number(subId));
                    });
                    Object.entries(sampleSetMap).forEach(([sKey, subIds]) => {
                        const sids = sKey.split(',').map(Number), iid = Number(itemId), payload = { sample_ids: sids, item_id: iid };
                        if (operation.value === 'distribute') {
                            const distributePayload = { ...payload, method_ids: subIds, deadline: details.deadline ? details.deadline.format("YYYY-MM-DD") : null };
                            if (module === 'workflow') distributePayload.department_id = details.department_id;
                            else distributePayload.tester_id = details.tester_id; // Department distribution is to tester
                            promises.push(api.distribute(distributePayload));
                        }
                        else if (operation.value === 'approve') promises.push(api.approve({ ...payload, method_ids: subIds }));
                        else if (operation.value === 'reject') promises.push(api.reject({ ...payload, method_ids: subIds }));
                        else if (operation.value === 'rollback') promises.push(api.rollback({ ...payload, method_ids: subIds }));
                        else if (operation.value === 'methodDelete') promises.push(api.methodDelete({ ...payload, method_ids: subIds }));
                        else if (operation.value === 'processDelete') promises.push(api.processDelete({ sample_ids: sids, item_ids: [iid] }));
                    });
                });
            }

            if (promises.length === 0) {
                message.warning("未识别到有效的操作对象或参数");
                return;
            }
            await Promise.all(promises);
            message.success(`${operation.label}成功`);
            onSuccess?.();
            onCancel();
        } catch (error) {
            message.error(`${operation.label}执行失败`);
        } finally {
            setLoading(false);
        }
    };

    const cascaderOptions = useMemo(() => {
        if (!operation) return [];
        return taskSamples.map(s => {
            const fullLabCode = `${currentTask?.lab_code || ''}-${s.lab_code?.toString().padStart(4, '0')}`;
            if (operation.levels === 1) return { label: `${fullLabCode} (#${s.id})`, value: s.id, isLeaf: true };
            
            const itemNodes = (s.items || []).map(item => {
                const itemId = item.item_id || item.id, itemName = item.item_name || item.name;
                
                const isProcessingUnfinished = operation.value === 'distribute' && item.processing_status !== 1;

                if (operation.levels === 2) {
                    return { 
                        label: itemName, 
                        value: itemId, 
                        isLeaf: true,
                        disabled: isProcessingUnfinished
                    };
                }

                let subNodes = [];
                if (operation.value.includes('process')) {
                    subNodes = (item.processing || []).map(p => ({ 
                        label: `${p.method_name || p.name} - ${p.option_value || p.value || p.option_name || ''}`, 
                        value: p.id || p.option_id, 
                        isLeaf: true 
                    }));
                } else {
                    subNodes = (item.methods || []).map(m => {
                        let isDisabled = false;
                        let reason = "";

                        if (operation.value === 'distribute') {
                            if (item.processing_status !== 1) {
                                isDisabled = true;
                                reason = " (加工未完成)";
                            } else if (module === 'workflow' && m.status !== 0) {
                                isDisabled = true;
                                reason = " (状态非待下发)";
                            } else if (module === 'department' && !(m.status === 0 || m.status === 1)) {
                                isDisabled = true;
                                reason = " (状态不可分配)";
                            }
                        } else if (operation.value === 'approve' || operation.value === 'reject') {
                            let targetStatus = 4; // Workflow
                            if (module === 'department') targetStatus = 3;
                            else if (module === 'testing') targetStatus = 2; // Testing to Leader Review

                            if (m.status !== targetStatus) {
                                isDisabled = true;
                                reason = ` (非待处理状态)`;
                            }
                        } else if (operation.value === 'rollback') {
                            if (module === 'department' && m.status !== 1) {
                                isDisabled = true;
                                reason = " (状态不可撤回)";
                            }
                        } else if (operation.value === 'methodDelete') {
                            if (m.status !== 0) {
                                isDisabled = true;
                                reason = " (已开始，不可删除)";
                            }
                        }

                        return {
                            label: (m.method_name || m.name) + reason,
                            value: m.method_id || m.id,
                            isLeaf: true,
                            disabled: isDisabled
                        };
                    });
                }

                return { 
                    label: itemName, 
                    value: itemId, 
                    children: subNodes, 
                    isLeaf: subNodes.length === 0,
                    disabled: operation.levels === 3 && subNodes.every(n => n.disabled)
                };
            }).filter(node => operation.levels === 2 || (node.children && node.children.length > 0));
            
            return { 
                label: `${fullLabCode} (#${s.id})`, 
                value: s.id, 
                children: itemNodes, 
                isLeaf: itemNodes.length === 0,
                disabled: operation.levels > 1 && itemNodes.every(n => n.disabled)
            };
        }).filter(node => operation.levels === 1 || (node.children && node.children.length > 0));
    }, [operation, taskSamples, currentTask, module]);

    const renderStep0 = () => (
        <div className="p-6 grid grid-cols-3 gap-4">
            {getOperations(module).map(op => {
                // Hide distribution for testing manager as defined in map
                if (module === 'testing' && op.value === 'distribute') return null;
                
                return (
                    <div key={op.value} onClick={() => handleOperationSelect(op.value)} className="group relative bg-white border-2 border-slate-50 p-6 rounded-3xl hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer overflow-hidden">
                        <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-${op.color}-500/5 rounded-full group-hover:scale-150 transition-transform`} />
                        <div className={`w-12 h-12 rounded-2xl bg-${op.color}-50 flex items-center justify-center text-2xl text-${op.color}-600 mb-4 group-hover:scale-110 transition-transform`}>
                            {op.icon}
                        </div>
                        <div className="font-black text-slate-800 group-hover:text-blue-600 transition-colors">{op.label}</div>
                        <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Batch {op.value}</div>
                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <RightOutlined className="text-blue-500" />
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const renderStep1 = () => (
        <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className={`w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl`}>
                    {React.cloneElement(operation.icon, { style: { color: `var(--ant-${operation.color}-5)` } })}
                </div>
                <div>
                    <div className="text-sm font-black text-slate-800">当前操作：{operation.label}</div>
                    <div className="text-[11px] text-slate-400">请在下方选择需要进行此批量操作的样品或检测项</div>
                </div>
            </div>
            
            <Form.Item 
                name="selections" 
                rules={[{ required: true, message: '请选择操作对象' }]}
                className="mb-0"
            >
                <Cascader 
                    multiple
                    options={cascaderOptions}
                    placeholder="展开选择层级内容"
                    className="w-full custom-cascader"
                    showSearch
                    expandTrigger="hover"
                    maxTagCount="responsive"
                    showCheckedStrategy="SHOW_CHILD"
                    placement="bottomLeft"
                    style={{ height: 'auto', minHeight: '34px' }}
                    dropdownClassName="large-cascader"
                />
            </Form.Item>
            
            <style>{`
                .custom-cascader .ant-select-selector {
                    border-radius: 16px !important;
                    padding: 6px 12px !important;
                    border: 2px solid #f1f5f9 !important;
                }
                .custom-cascader:hover .ant-select-selector {
                    border-color: #2563eb !important;
                }
                .large-cascader {
                    min-width: 600px !important;
                }
                .large-cascader .ant-cascader-menu {
                    max-height: 390px !important;
                    height: auto !important;
                }
            `}</style>
        </div>
    );

    const renderStep2 = () => {
        const selectionCount = getSelectionCount();
        return (
            <div className="p-6 space-y-6">
                <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-xs opacity-60 uppercase tracking-widest font-bold">已选对象</span>
                            <span className="text-2xl font-black">{selectionCount} <small className="text-sm font-normal opacity-70">个对象</small></span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-xs opacity-60 uppercase tracking-widest font-bold">操作类型</span>
                            <Tag color="blue" className="m-0 border-none px-3 font-bold bg-white/10 text-blue-200">{operation.label}</Tag>
                        </div>
                    </div>
                    
                    <div className="bg-white/5 p-3 rounded-xl max-h-24 overflow-y-auto scrollbar-hide border border-white/5">
                        <div className="flex flex-wrap gap-1.5">
                            {form.getFieldValue('selections')?.map((path, idx) => {
                                const sample = taskSamples.find(s => s.id === path[0]);
                                const fullLabCode = `${currentTask?.lab_code || ''}-${sample?.lab_code?.toString().padStart(4, '0')}`;
                                let label = fullLabCode;
                                if (path[1]) {
                                    const item = (sample?.items || []).find(i => (i.item_id || i.id) === path[1]);
                                    label += ` > ${item?.item_name || item?.name || `#${path[1]}`}`;
                                }
                                if (path[2]) label += ' > ...';
                                return (
                                    <span key={idx} className="text-[10px] bg-white/10 px-2 py-0.5 rounded-md text-white/80 whitespace-nowrap border border-white/5">
                                        {label}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <Divider className="my-0 border-slate-100" />

                {operation.value === 'itemCreate' && (
                    <Form.Item name="item_ids" label={<span className="font-black text-slate-700">选择要添加的项目</span>} rules={[{ required: true, message: '请选择项目' }]}>
                        <Cascader multiple dropdownClassName="large-cascader" options={itemOptions.map(cat => ({ label: cat.name, value: `cat-${cat.id}`, children: (cat.items || []).map(i => ({ label: i.name, value: i.id })) }))} placeholder="搜索或选择项目" className="w-full rounded-xl" showSearch maxTagCount="responsive" showCheckedStrategy="SHOW_CHILD" />
                    </Form.Item>
                )}
                {operation.value === 'methodCreate' && (
                    <Form.Item name="method_ids" label={<span className="font-black text-slate-700">选择要添加的方法</span>} rules={[{ required: true, message: '请选择方法' }]}>
                        <Select mode="multiple" placeholder="选择方法" className="w-full" options={availableMethods.map(m => ({ label: m.method_name || m.name, value: m.method_id || m.id }))} />
                    </Form.Item>
                )}
                {operation.value === 'processCreate' && (
                    <div className="space-y-4">
                        <Form.Item name="option_ids" label={<span className="font-black text-slate-700">选择加工工艺及选项</span>} rules={[{ required: true, message: '请选择加工选项' }]}>
                            <Cascader multiple options={procOptions.map(m => ({ label: m.name, value: `m-${m.id}`, children: (m.options || []).map(o => ({ label: o.value, value: o.id })) }))} placeholder="选择加工" className="w-full" showCheckedStrategy="SHOW_CHILD" />
                        </Form.Item>
                        <Form.Item name="deadline" label={<span className="font-black text-slate-700">完成期限</span>} rules={[{ required: true, message: '请选择期限' }]}>
                            <DatePicker placeholder='请输入完成期限' className="w-full rounded-xl" disabledDate={current => current && current < dayjs().startOf('day')} />
                        </Form.Item>
                    </div>
                )}
                {operation.value === 'resultEntry' && (
                    <div className="space-y-4">
                        <AntTable
                            dataSource={(() => {
                                const selections = form.getFieldValue('selections') || [];
                                const entryItems = [];
                                selections.forEach((path, sIdx) => {
                                    const sid = path[0], iid = path[1], mid = path[2];
                                    const sample = taskSamples.find(s => s.id === sid);
                                    const item = (sample?.items || []).find(i => (i.item_id || i.id) === iid);
                                    const method = (item?.methods || []).find(m => (m.method_id || m.id) === mid);
                                    if (method && method.fields) {
                                        method.fields.forEach((field, fIdx) => {
                                            entryItems.push({
                                                id: `${sid}_${mid}_${field.id}`,
                                                sampleId: sid,
                                                methodId: mid,
                                                fieldId: field.id,
                                                labCode: `${currentTask?.lab_code}-${sample.lab_code?.toString().padStart(4, '0')}`,
                                                fieldName: field.name,
                                                methodName: method.method_name || method.name,
                                                initialValue: field.value
                                            });
                                        });
                                    }
                                });
                                return entryItems;
                            })()}
                            rowKey="id"
                            pagination={false}
                            size="small"
                            scroll={{ y: 350 }}
                            columns={[
                                { title: '样品编号', dataIndex: 'labCode', width: 140, className: 'font-mono' },
                                { title: '项目/方法', dataIndex: 'methodName', width: 140, ellipsis: true },
                                { title: '字段', dataIndex: 'fieldName', width: 100 },
                                { 
                                    title: '录入值', 
                                    dataIndex: 'value',
                                    render: (_, record) => (
                                        <Form.Item
                                            name={['results', record.sampleId, record.methodId, record.fieldId]}
                                            initialValue={record.initialValue}
                                            noStyle
                                        >
                                            <Input size="small" placeholder="结果" className="rounded-lg" />
                                        </Form.Item>
                                    )
                                }
                            ]}
                        />
                    </div>
                )}
                {operation.value === 'distribute' && (
                    <div className="space-y-4 p-4 bg-emerald-50/30 border border-emerald-100 rounded-3xl">
                        <Form.Item 
                            name={module === 'workflow' ? "department_id" : "tester_id"} 
                            label={<span className="font-black text-emerald-800">{module === 'workflow' ? '下发科室' : '分配检测员'}</span>} 
                            rules={[{ required: true, message: '请选择目标' }]}
                        >
                            <Select 
                                placeholder={module === 'workflow' ? "请选择目标科室" : "请选择检测员"} 
                                options={module === 'workflow' ? departments.map(d => ({ label: d.name, value: d.id })) : users.map(u => ({ label: u.nickname, value: u.id }))} 
                                className="w-full" 
                            />
                        </Form.Item>
                        <Form.Item name="deadline" label={<span className="font-black text-emerald-800">完成期限</span>} rules={[{ required: true, message: '请选择期限' }]}>
                            <DatePicker placeholder='请输入完成期限' className="w-full rounded-xl" disabledDate={current => current && current < dayjs().startOf('day')} />
                        </Form.Item>
                    </div>
                )}
                {!['itemCreate', 'methodCreate', 'processCreate', 'distribute'].includes(operation.value) && (
                    <div className="flex flex-col items-center justify-center py-8 space-y-4">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-sm ${operation.color === 'red' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                            {operation.icon}
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-black text-slate-800 mb-1">确认执行 {operation.label}</h3>
                            <p className="text-slate-400 text-sm">此操作将对选定的 {selectionCount} 个对象生效，执行后不可撤销。</p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-3 p-2">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <ContainerOutlined />
                    </div>
                    <div>
                        <div className="text-lg font-black text-slate-800">批量操作中心 ({module === 'workflow' ? '管理组' : '科室组'})</div>
                        <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Batch Operation Center</div>
                    </div>
                </div>
            }
            open={open}
            onCancel={onCancel}
            onOk={() => {
                if (step === 2) form.submit();
                else if (step === 1) handleNext();
            }}
            confirmLoading={loading}
            width={step === 0 ? 800 : 700}
            footer={step === 0 ? null : (
                <div className="flex justify-between items-center p-4">
                    <Button icon={<LeftOutlined />} onClick={handleBack} className="rounded-xl font-bold h-10 px-6 border-slate-200">返回</Button>
                    <Button type="primary" onClick={() => { if (step === 2) form.submit(); else handleNext(); }} className="rounded-xl font-bold h-10 px-10 shadow-lg shadow-blue-500/20">
                        {step === 2 ? '确认执行' : '下一步'}
                    </Button>
                </div>
            )}
            destroyOnClose
        >
            <Spin spinning={loading} tip="正在处理中...">
                <Form form={form} layout="vertical" onFinish={handleSubmit} preserve={true}>
                    {step === 0 && renderStep0()}
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                </Form>
            </Spin>
        </Modal>
    );
};

export default BatchOperationModal;
