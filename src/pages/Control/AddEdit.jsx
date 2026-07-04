import React, { useState, useEffect } from "react";
import {
    Form,
    Input,
    InputNumber,
    Switch,
    TreeSelect,
    message,
    Select,
} from "antd";
import { readControl } from "../../api/control";
import * as AntdIcons from "@ant-design/icons";

const CommonIcons = [
    "DashboardOutlined",
    "AppstoreOutlined",
    "UserOutlined",
    "TeamOutlined",
    "PartitionOutlined",
    "DatabaseOutlined",
    "SettingOutlined",
    "HistoryOutlined",
    "SafetyCertificateOutlined",
    "SafetyOutlined",
    "AuditOutlined",
    "ReconciliationOutlined",
    "MedicineBoxOutlined",
    "ExperimentOutlined",
    "StockOutlined",
    "InboxOutlined",
    "ContainerOutlined",
    "GoldOutlined",
    "BuildOutlined",
    "NodeIndexOutlined",
    "ToolOutlined",
    "MonitorOutlined",
    "DeploymentUnitOutlined",
    "BlockOutlined",
    "FileTextOutlined",
    "FilePdfOutlined",
    "FileDoneOutlined",
    "ProfileOutlined",
    "BarChartOutlined",
    "PieChartOutlined",
    "DotChartOutlined",
    "LineChartOutlined",
    "SolutionOutlined",
    "ContactsOutlined",
    "ShopOutlined",
    "EnvironmentOutlined",
    "CloudOutlined",
    "GlobalOutlined",
    "BellOutlined",
    "MailOutlined",
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
            const res = await readControl();
            if (res.data.status === 0) {
                const formatTree = (data) => {
                    if (!data) return [];
                    return data.map((item) => {
                        const newItem = { ...item };
                        if (newItem.children && newItem.children.length > 0) {
                            newItem.children = formatTree(newItem.children);
                        } else {
                            delete newItem.children;
                        }
                        return newItem;
                    });
                };
                setParents(formatTree(res.data.data || []));
            }
        } catch (e) {
            message.error("获取父级列表失败");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (record) {
            form.setFieldsValue({
                ...record,
                enabled: record.enabled === 1,
            });
        }
    }, [record, form]);

    const handleValuesChange = (_, allValues) => {
        if (onChange) {
            onChange({
                ...record,
                ...allValues,
                enabled: allValues.enabled ? 1 : 0,
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
                parent_id: null,
            }}
        >
            <Form.Item name="parent_id" label="父级菜单">
                <TreeSelect
                    showSearch
                    style={{ width: "100%" }}
                    popupStyle={{ maxHeight: 400, overflow: "auto" }}
                    placeholder="顶级菜单"
                    allowClear
                    treeDefaultExpandAll
                    treeLine={true}
                    treeData={parents}
                    fieldNames={{
                        label: "name",
                        value: "id",
                        children: "children",
                    }}
                    loading={loading}
                />
            </Form.Item>

            <Form.Item
                name="name"
                label="菜单名称"
                rules={[{ required: true, message: "请输入菜单名称" }]}
            >
                <Input placeholder="请输入菜单名称" />
            </Form.Item>

            <Form.Item
                name="path"
                label="路由路径"
                rules={[{ max: 255, message: "最大255字符" }]}
            >
                <Input placeholder="请输入路由路径（若为父菜单可留空）" />
            </Form.Item>

            <Form.Item name="icon" label="菜单图标 (点击选择/取消)">
                <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                    <div className="grid grid-cols-6 gap-2">
                        {CommonIcons.map((iconName) => {
                            const IconComponent = AntdIcons[iconName];
                            const isSelected =
                                form.getFieldValue("icon") === iconName;
                            return (
                                <div
                                    key={iconName}
                                    title={iconName}
                                    onClick={() => {
                                        form.setFieldsValue({
                                            icon: isSelected ? "" : iconName,
                                        });
                                        handleValuesChange(
                                            null,
                                            form.getFieldsValue(),
                                        );
                                    }}
                                    className={`
                                        flex items-center justify-center p-2 rounded-md cursor-pointer transition-all text-xl
                                        ${isSelected ? "bg-blue-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-500 border border-transparent hover:border-blue-200"}
                                    `}
                                >
                                    {IconComponent &&
                                        React.createElement(IconComponent)}
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
                    rules={[{ required: true, message: "请输入排序" }]}
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
