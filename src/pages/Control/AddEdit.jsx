import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Switch, TreeSelect, message, Select } from 'antd';
import { comboControl } from '../../api/control';
import * as AntdIcons from '@ant-design/icons';

const CommonIcons = [
    'DashboardOutlined', 'AppstoreOutlined', 'UserOutlined', 'TeamOutlined', 
    'PartitionOutlined', 'DatabaseOutlined', 'SettingOutlined', 'HistoryOutlined',
    'SafetyCertificateOutlined', 'SafetyOutlined', 'AuditOutlined', 'ReconciliationOutlined',
    'MedicineBoxOutlined', 'ExperimentOutlined', 'StockOutlined', 'InboxOutlined', 
    'ContainerOutlined', 'GoldOutlined', 'BuildOutlined', 'NodeIndexOutlined',
    'ToolOutlined', 'MonitorOutlined', 'DeploymentUnitOutlined', 'BlockOutlined',
    'FileTextOutlined', 'FilePdfOutlined', 'FileDoneOutlined', 'ProfileOutlined',
    'BarChartOutlined', 'PieChartOutlined', 'DotChartOutlined', 'LineChartOutlined',
    'SolutionOutlined', 'ContactsOutlined', 'ShopOutlined', 'EnvironmentOutlined',
    'CloudOutlined', 'GlobalOutlined', 'BellOutlined', 'MailOutlined'
];

const PredefinedModules = [
    { name: '分析类型', path: '/AnalysisType' },
    { name: '客户管理', path: '/Client' },
    { name: '菜单权限管理', path: '/Control' },
    { name: '部门科室管理', path: '/Department' },
    { name: '仪器设备管理', path: '/Device' },
    { name: '设备分类', path: '/DeviceCategory' },
    { name: '加工方法', path: '/ProcessingMethod' },
    { name: '试剂管理', path: '/Reagent' },
    { name: '试剂柜管理', path: '/ReagentStorage' },
    { name: '试剂库存明细', path: '/ReagentStock' },
    { name: '标准物质', path: '/ReferenceMaterial' },
    { name: '介质类型', path: '/ReferenceMaterialMediumType' },
    { name: '报告封面模板', path: '/ReportCover' },
    { name: '报告数据表', path: '/ReportTable' },
    { name: '角色管理', path: '/Role' },
    { name: '任务类型', path: '/TaskType' },
    { name: '检测类别', path: '/TestCategory' },
    { name: '检测项目', path: '/TestItem' },
    { name: '检测方法', path: '/TestMethod' },
    { name: '用户管理', path: '/User' },
    { name: '操作日志', path: '/Log' },
];

const AddEdit = ({ record, onChange }) => {
    const [form] = Form.useForm();
    const [parents, setParents] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchParents();
    }, []);

    const fetchParents = async () => {
        setLoading(true);
        try {
            const res = await comboControl();
            if (res.data.status === 0 || res.data.code === 0) {
                // Formatting parents as tree data if needed, or if api already returns tree
                setParents(res.data.data || []);
            }
        } catch (e) {
            message.error('获取父级列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (record) {
            form.setFieldsValue({
                ...record,
                enabled: record.enabled === 1
            });
        }
    }, [record, form]);

    const handleValuesChange = (_, allValues) => {
        if (onChange) {
            onChange({
                ...record,
                ...allValues,
                enabled: allValues.enabled ? 1 : 0
            });
        }
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onValuesChange={handleValuesChange}
            initialValues={{
                sort: 0,
                enabled: true,
                parent_id: null
            }}
        >
            <Form.Item
                name="parent_id"
                label="父级菜单"
            >
                <TreeSelect
                    showSearch
                    style={{ width: '100%' }}
                    popupStyle={{ maxHeight: 400, overflow: 'auto' }}
                    placeholder="顶级菜单"
                    allowClear
                    treeDefaultExpandAll
                    treeData={parents}
                    fieldNames={{
                        label: 'name',
                        value: 'id',
                        children: 'children'
                    }}
                    loading={loading}
                />
            </Form.Item>

            <Form.Item
                name="name"
                label="菜单功能选择"
                rules={[{ required: true, message: '请选择或输入菜单名称' }]}
            >
                <Select
                    showSearch
                    placeholder="选择功能模块以自动填充路径"
                    onSelect={(val, option) => {
                        form.setFieldsValue({ 
                            name: option.label,
                            path: option.path 
                        });
                        handleValuesChange(null, form.getFieldsValue());
                    }}
                    options={PredefinedModules.map(m => ({ label: m.name, value: m.name, path: m.path }))}
                />
            </Form.Item>

            <Form.Item
                name="path"
                label="路由路径"
                rules={[{ required: true, message: '请输入路由路径' }, { max: 255, message: '最大255字符' }]}
            >
                <Input placeholder="选择模块后将自动填充" />
            </Form.Item>

            <Form.Item
                name="icon"
                label="菜单图标 (点击选择)"
                rules={[{ required: true, message: '请选择菜单图标' }]}
            >
                <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                    <div className="grid grid-cols-6 gap-2">
                        {CommonIcons.map(iconName => {
                            const IconComponent = AntdIcons[iconName];
                            const isSelected = form.getFieldValue('icon') === iconName;
                            return (
                                <div 
                                    key={iconName}
                                    title={iconName}
                                    onClick={() => {
                                        form.setFieldsValue({ icon: iconName });
                                        handleValuesChange(null, form.getFieldsValue());
                                    }}
                                    className={`
                                        flex items-center justify-center p-2 rounded-md cursor-pointer transition-all text-xl
                                        ${isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-500 border border-transparent hover:border-blue-200'}
                                    `}
                                >
                                    {IconComponent && React.createElement(IconComponent)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Form.Item>

            <div className="grid grid-cols-2 gap-4">
                <Form.Item
                    name="sort"
                    label="排序"
                    rules={[{ required: true, message: '请输入排序' }]}
                >
                    <InputNumber min={0} className="w-full" />
                </Form.Item>

                <Form.Item
                    name="enabled"
                    label="是否启用"
                    valuePropName="checked"
                >
                    <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                </Form.Item>
            </div>
        </Form>
    );
};

export default AddEdit;
