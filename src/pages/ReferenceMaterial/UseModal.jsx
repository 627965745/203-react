import React, { useState, useEffect } from "react";
import { Modal, Form, InputNumber, Button, message, Space, Alert } from "antd";
import { useReferenceMaterial } from "../../api/referenceMaterial";

const UseModal = ({ visible, onCancel, record, onSuccess }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && record) {
            form.resetFields();
            form.setFieldsValue({
                id: record.id,
                used: 0,
            });
        }
    }, [visible, record]);

    const handleFinish = async (values) => {
        if (values.used <= 0) {
            message.warning("使用数量必须大于0");
            return;
        }
        if (values.used > Number(record.remaining)) {
            message.warning("使用数量不能超过余量");
            return;
        }

        try {
            setLoading(true);
            const res = await useReferenceMaterial(values);
            if (res.data.status === 0) {
                message.success("使用记录成功");
                onSuccess();
                onCancel();
            } else {
                message.error(res.data.msg || "记录失败");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={`使用标准物质 - ${record?.name}`}
            open={visible}
            okText="确定"
            cancelText="取消"
            onCancel={onCancel}
            onOk={() => form.submit()}
            confirmLoading={loading}
            width={500}
        >
            <Alert
                message={`当前余量: ${record?.remaining} ${record?.unit || ""}`}
                type="info"
                showIcon
                className="mb-4"
            />
            <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Form.Item name="id" hidden>
                    <InputNumber />
                </Form.Item>
                <Form.Item
                    name="used"
                    label="使用数量"
                    rules={[{ required: true, message: "请输入使用数量" }]}
                >
                    <InputNumber
                        className="w-full"
                        min={0.0001}
                        precision={4}
                        placeholder="请输入本次使用的数量"
                        addonAfter={record?.unit || "ml/g"}
                        autoFocus
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default UseModal;
