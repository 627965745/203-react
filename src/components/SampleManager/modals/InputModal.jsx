import React, { useEffect } from "react";
import { Modal, Form, Input } from "antd";

const InputModal = ({ visible, onClose, onSave, editingInput }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (visible) {
            form.setFieldsValue(editingInput || { key: "", value: "" });
        }
    }, [visible, editingInput, form]);

    return (
        <Modal 
            title={editingInput ? "修改参数" : "添加参数"} 
            open={visible} 
            onCancel={onClose} 
            onOk={() => form.submit()} 
            centered 
            width={400} 
            okText="保存" 
            cancelText="取消"
        >
            <Form 
                form={form} 
                onFinish={(values) => onSave(values)} 
                layout="vertical" 
                className="mt-4"
            >
                <Form.Item name="key" label="属性键名" rules={[{ required: true, message: '请输入属性键名' }]}>
                    <Input placeholder="e.g. 样品体积" className="h-10 rounded-lg" />
                </Form.Item>
                <Form.Item name="value" label="内容数值" rules={[{ required: true, message: '请输入内容数值' }]}>
                    <Input placeholder="输入数值或描述" className="h-10 rounded-lg" />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default InputModal;
