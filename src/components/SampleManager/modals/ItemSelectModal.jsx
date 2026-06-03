import React, { useState, useEffect } from "react";
import { Modal, Form, Cascader, Button, message } from "antd";
import { comboTestItem } from "../../../api/testItem";

const ItemSelectModal = ({ visible, onClose, onSave }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);

    useEffect(() => {
        if (visible) {
            fetchItems();
            form.resetFields();
        }
    }, [visible, form]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await comboTestItem();
            setItems(res.data.data || []);
        } catch (error) {
            message.error("获取检测项失败");
        } finally {
            setLoading(false);
        }
    };

    const handleFinish = (values) => {
        // Cascader with multiple returns values like [[catId, itemId1], [catId, itemId2]]
        // We need to flatten this to just [itemId1, itemId2] for the API
        const flatItemIds = (values.item_ids || []).map(path => path[path.length - 1]);
        onSave({ ...values, item_ids: flatItemIds });
    };

    const options = items.map(cat => ({
        label: cat.name,
        value: `cat-${cat.id}`, // Prefix category ID to avoid collision with items
        children: (cat.items || []).map(i => ({
            label: i.name,
            value: i.id
        }))
    }));

    return (
        <Modal 
            title="添加检测项目" 
            open={visible} 
            onCancel={onClose} 
            onOk={() => form.submit()} 
            centered 
            width={600} 
            okText="保存" 
            cancelText="取消"
            confirmLoading={loading}
        >
            <Form form={form} onFinish={handleFinish} layout="vertical" className="mt-4">
                <Form.Item 
                    name="item_ids" 
                    label="选择检测项目 (可按分类筛选)" 
                    rules={[{ required: true, message: '请选择至少一个检测项' }]}
                >
                    <Cascader
                        options={options}
                        multiple
                        placeholder="点击选择分类及项目"
                        showSearch={{
                            filter: (inputValue, path) => 
                                path.some(option => option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1)
                        }}
                        expandTrigger="hover"
                        maxTagCount="responsive"
                        style={{ height: 'auto', minHeight: '34px' }}
                        dropdownStyle={{ width: '600px' }}
                        dropdownClassName="large-cascader"
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ItemSelectModal;
