import React, { useEffect, useMemo, useState } from "react";
import { Modal, Form, InputNumber, Input, Button, message } from "antd";
import dayjs from "dayjs";
import { recordCommonWorkload } from "../../api/workload";

const { TextArea } = Input;

const RecordModal = ({ open, rows, onCancel, onSuccess }) => {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [reporting, setReporting] = useState(null);
    const [dateError, setDateError] = useState(false);

    const dateOptions = useMemo(
        () => [
            {
                key: "dayBeforeYesterday",
                label: "前天",
                value: dayjs().subtract(2, "day").format("YYYY-MM-DD"),
            },
            {
                key: "yesterday",
                label: "昨天",
                value: dayjs().subtract(1, "day").format("YYYY-MM-DD"),
            },
            { key: "today", label: "今天", value: dayjs().format("YYYY-MM-DD") }
        ],
        [],
    );

    useEffect(() => {
        if (open) {
            form.resetFields();
            setReporting(null);
            setDateError(false);
        }
    }, [open, form]);

    const handlePickDate = (value) => {
        setReporting(value);
        setDateError(false);
        const existing = (rows || []).find((r) => r.reporting === value);
        form.setFieldsValue({
            overtime: existing ? Number(existing.overtime) : 0,
            description: existing ? existing.description || "" : "",
        });
    };

    const handleSubmit = async () => {
        if (!reporting) {
            setDateError(true);
            return;
        }
        try {
            const values = await form.validateFields();
            setSubmitting(true);
            const res = await recordCommonWorkload({
                reporting,
                overtime: values.overtime,
                description: values.description || "",
            });
            if (res.data.status === 0) {
                message.success("工作量登记成功");
                onSuccess();
            } else {
                message.error(res.data?.message || "登记失败");
            }
        } catch (error) {
            if (error?.errorFields) return;
            message.error(error.response?.data?.message || "登记异常");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            title="登记工作量"
            open={open}
            onCancel={onCancel}
            onOk={handleSubmit}
            okText="提交"
            cancelText="取消"
            confirmLoading={submitting}
            width={480}
            destroyOnHidden
        >
            <div className="pt-2">
                <div className="mb-4">
                    <div className="text-sm font-bold text-slate-700 mb-2">
                        报告日期 <span className="text-red-500">*</span>
                    </div>
                    <div className="flex gap-2">
                        {dateOptions.map((opt) => (
                            <Button
                                key={opt.key}
                                type={reporting === opt.value ? "primary" : "default"}
                                className="flex-1 h-auto py-2 rounded-lg font-bold"
                                onClick={() => handlePickDate(opt.value)}
                            >
                                <div className="flex flex-col items-center leading-tight">
                                    <span>{opt.label}</span>
                                    <span
                                        className={`text-[11px] font-normal ${
                                            reporting === opt.value
                                                ? "text-blue-100"
                                                : "text-slate-400"
                                        }`}
                                    >
                                        {opt.value}
                                    </span>
                                </div>
                            </Button>
                        ))}
                    </div>
                    {dateError && (
                        <div className="text-red-500 text-xs mt-1">
                            请选择报告日期
                        </div>
                    )}
                </div>

                <Form form={form} layout="vertical">
                    <Form.Item
                        name="overtime"
                        label="加班时长（小时）"
                        rules={[{ required: true, message: "请输入加班时长" }]}
                        initialValue={0}
                    >
                        <InputNumber
                            min={0}
                            precision={2}
                            step={0.5}
                            className="w-full"
                            placeholder="请输入加班小时数"
                        />
                    </Form.Item>
                    <Form.Item name="description" label="工作说明" initialValue="">
                        <TextArea
                            rows={4}
                            placeholder="可输入详细工作说明"
                            maxLength={2000}
                            showCount
                        />
                    </Form.Item>
                </Form>
            </div>
        </Modal>
    );
};

export default RecordModal;
