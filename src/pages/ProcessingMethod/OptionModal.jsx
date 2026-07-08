import { Modal, Form, Input, Switch, Tag, Space } from "antd";

const OptionModal = ({ optionModal, form, onCancel, onSubmit }) => {
    return (
        <Modal
            title={optionModal.option ? "更新加工选项" : "添加加工选项"}
            open={optionModal.visible}
            onCancel={onCancel}
            cancelText="取消"
            okText="确认"
            onOk={() => form.submit()}
            width={400}
            destroyOnHidden
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={onSubmit}
                className="pt-4"
            >
                <Form.Item label="所属方法" className="mb-4">
                    <Tag color="cyan" className="m-0">
                        {optionModal.method?.name}
                    </Tag>
                </Form.Item>
                {optionModal.method?.options &&
                    optionModal.method.options.length > 0 && (
                        <Form.Item label="已有选项" className="mb-4">
                            <Space size={[4, 8]} wrap>
                                {optionModal.method.options.map((opt) => (
                                    <Tag
                                        key={opt.id}
                                        color={
                                            opt.enabled === 1
                                                ? "blue"
                                                : "default"
                                        }
                                    >
                                        {opt.value}
                                    </Tag>
                                ))}
                            </Space>
                        </Form.Item>
                    )}
                <Form.Item
                    label="选项值"
                    name="value"
                    rules={[{ required: true, message: "请输入选项值" }]}
                >
                    <Input
                        placeholder="例如: 平口, 螺纹..."
                        maxLength={255}
                    />
                </Form.Item>
                <Form.Item
                    label="状态"
                    name="enabled"
                    valuePropName="checked"
                >
                    <Switch
                        checkedChildren="启用"
                        unCheckedChildren="禁用"
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default OptionModal;
