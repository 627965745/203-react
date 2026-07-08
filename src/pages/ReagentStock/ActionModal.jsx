import { Modal, Button, Input, Form, Select, Tag, Space, message } from "antd";
import {
    BarcodeOutlined,
    ControlOutlined,
    ScanOutlined,
} from "@ant-design/icons";
import { getScaleReading } from "../../api/externalDevice";

const ActionModal = ({
    actionModal,
    onCancel,
    form,
    scanInputRef,
    users,
    reagents,
    onSubmit,
    onScanCode,
}) => {
    return (
        <Modal
            title={null}
            open={actionModal.visible}
            onCancel={onCancel}
            onOk={() => form.submit()}
            destroyOnClose
            forceRender
            width={450}
            centered
            afterOpenChange={(open) => {
                if (open && !actionModal.record) {
                    scanInputRef.current?.focus();
                }
            }}
            footer={
                <div className="flex gap-3 px-2 pb-2">
                    <Button
                        className="flex-1 h-9 rounded-lg"
                        onClick={onCancel}
                    >
                        取消操作
                    </Button>
                    <Button
                        type="primary"
                        disabled={!actionModal.record}
                        className="flex-1 h-9 bg-blue-600 border-none rounded-lg"
                        onClick={() => form.submit()}
                    >
                        确定记录
                    </Button>
                </div>
            }
        >
            <div className="pt-3">
                {!actionModal.record ? (
                    <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-center">
                        <div className="relative w-10 h-10 flex items-center justify-center">
                            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <ScanOutlined className="text-xl text-blue-500 animate-pulse" />
                        </div>
                        <div className="font-black text-slate-800 text-xl w-full">
                            <Input
                                autoFocus
                                ref={scanInputRef}
                                placeholder="请在此扫码或手动输入批次编码"
                                prefix={
                                    <BarcodeOutlined className="text-gray-400 mr-2" />
                                }
                                className="h-10 rounded-xl text-center font-mono text-base shadow-inner"
                                onPressEnter={(e) =>
                                    onScanCode(e.target.value)
                                }
                            />
                        </div>
                        <div className="text-xs text-slate-400">
                            使用扫描枪扫描条码，或手动输入后按回车。
                        </div>
                    </div>
                ) : (
                    <div className="mb-3 p-3 bg-linear-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg relative overflow-hidden">
                        <div className="absolute right-[-20px] top-[-20px] opacity-10">
                            <ScanOutlined
                                style={{ fontSize: "100px", color: "#fff" }}
                            />
                        </div>
                        <div className="relative z-10 flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] text-white/90 tracking-widest uppercase">
                                    批次标识
                                </div>
                                <Tag className="m-0 border-none bg-white text-blue-600 font-bold px-3 shadow-md">
                                    {actionModal.type === 1
                                        ? "出库领用"
                                        : "入库归还"}
                                </Tag>
                            </div>
                            <div>
                                <div className="text-white/60 text-xs mb-0.5">
                                    正在操作试剂
                                </div>
                                <div className="text-xl font-black text-white">
                                    {actionModal.record?.reagent_name ||
                                        reagents.find(
                                            (r) =>
                                                String(r.id) ===
                                                String(
                                                    actionModal.record
                                                        ?.reagent_id,
                                                ),
                                        )?.name ||
                                        "未知试剂"}
                                </div>
                                <div className="text-xs text-white/40 font-mono mt-0.5">
                                    {actionModal.record?.lab_code}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onSubmit}
                    className={`px-2 transition-opacity duration-300 ${!actionModal.record ? "opacity-40 pointer-events-none" : "opacity-100"}`}
                >
                    <Form.Item
                        label={
                            <span className="text-sm font-bold text-gray-700">
                                相关人员
                            </span>
                        }
                        name="user_id"
                        rules={[
                            { required: true, message: "请选择相关人员" },
                        ]}
                        style={{ marginBottom: 12 }}
                    >
                        <Select
                            placeholder="请选择实验人员"
                            showSearch
                            optionFilterProp="label"
                            options={users.map((u) => ({
                                label: u.name || u.nickname,
                                value: u.id,
                            }))}
                        />
                    </Form.Item>

                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-3 font-bold">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest ">
                                测量数据
                            </span>
                            <span className="text-sm font-black text-blue-600">
                                g
                            </span>
                        </div>
                        <div className="w-full">
                            <Space.Compact className="w-full height-aligned-compact">
                                <Form.Item
                                    name="quantity"
                                    rules={[
                                        {
                                            required: true,
                                            message: "请输入测读数据",
                                        },
                                    ]}
                                    noStyle
                                >
                                    <Input
                                        className="h-8 text-sm border-r-0 rounded-l-lg"
                                        placeholder="输入读数"
                                        style={{ width: "100%" }}
                                    />
                                </Form.Item>
                                <Button
                                    className="h-8 bg-slate-900 text-white border-slate-900 px-4 rounded-r-lg font-bold"
                                    icon={<ControlOutlined />}
                                    onClick={async () => {
                                        try {
                                            const res =
                                                await getScaleReading();
                                            const val = res.data.data;
                                            form.setFieldsValue({
                                                quantity: val,
                                            });
                                            message.success(
                                                `数据已采集成功: ${val}`,
                                            );
                                        } catch (err) {
                                            message.error(
                                                err.message ||
                                                    "读取失败，请检查设备连接",
                                            );
                                        }
                                    }}
                                >
                                    获取读数
                                </Button>
                            </Space.Compact>
                        </div>
                        <div className="text-xs text-gray-400 mt-2 italic font-medium">
                            {actionModal.type === 1
                                ? `※ 当前系统记录的余量为: ${actionModal.record?.quantity || "-"}`
                                : `※ 归还时手动输入或自动测读实际重量`}
                        </div>
                    </div>

                    <Form.Item
                        label={
                            <span className="text-sm font-bold text-gray-700">
                                操作备注说明
                            </span>
                        }
                        name="description"
                        style={{ marginBottom: 0 }}
                    >
                        <Input.TextArea
                            rows={2}
                            placeholder="选填，可记录实验用途或异常状态"
                            className="rounded-lg"
                        />
                    </Form.Item>
                </Form>
            </div>
        </Modal>
    );
};

export default ActionModal;
