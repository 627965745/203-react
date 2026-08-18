import React, { useState, useEffect } from "react";
import {
    Modal,
    Button,
    Select,
    DatePicker,
    Form,
    message,
    Spin,
    Alert,
    Input,
    Switch,
} from "antd";
import dayjs from "dayjs";

import { comboDepartment } from "../../../api/department";
import { comboProcessingMethod } from "../../../api/processingMethod";
import { comboUser } from "../../../api/user";

import MethodSelector from "../MethodSelector";
import ProcessingOptionSelector from "../ProcessingOptionSelector";
// V4: 生成重复样的比例选择器（滑块 + 输入框），与样品级批量操作共用
import RatioSelector from "../RatioSelector";
import { resolveBatchApi } from "./SampleBatchModal";

/**
 * 任务级批量操作：不勾选具体样品，直接对整个 task_id 生效（后端按 task_id 匹配
 * 该任务下所有符合条件的样品）。与 SampleBatchModal（勾选样品 -> sample_ids）
 * 是两个完全独立、并存的入口，操作列表通过 getOperations(module) 共用。
 *
 * 因为不逐条勾选样品，也就拿不到"哪些样品已有此方法/加工选项"之类的个体信息，
 * 所有选择器一律展示全量目录，不做"建议项/已禁用"过滤——这本来就是此入口的目的。
 */
const TaskBatchModal = ({
    open,
    onCancel,
    onSuccess,
    operation,
    taskId,
    module = "workflow",
}) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [users, setUsers] = useState([]);
    const [procOptions, setProcOptions] = useState([]);
    const [form] = Form.useForm();
    // V4: 开启"使用默认加工选项"后，option_ids 不再必填（后端按检测方法自动匹配）
    const useDefaultProc = Form.useWatch("default", form);

    const api = resolveBatchApi(module);

    useEffect(() => {
        if (!open || !operation) return;
        form.resetFields();
        // V4: 生成重复样默认比例 0.2（后端约束 0 < ratio ≤ 1）；描述不预填，留给用户自己写
        if (operation.value === "duplicate") {
            form.setFieldsValue({ ratio: 0.2 });
        }
        // V4: 批量配置加工默认打开"使用默认加工选项"
        if (operation.value === "processUpdate") {
            form.setFieldsValue({ default: true });
        }

        const load = async () => {
            setLoading(true);
            try {
                if (operation.value === "distribute") {
                    if (module === "workflow") {
                        const res = await comboDepartment();
                        setDepartments(res.data.data || []);
                    } else {
                        const res = await comboUser();
                        setUsers(res.data.data || []);
                    }
                } else if (operation.value === "processUpdate") {
                    // 需求变更：processDelete 不支持按 option 局部删除，任务级删除
                    // 不再提供选项目录——只有"批量配置加工"(processUpdate) 需要它。
                    // V4: 加工分配必须指定加工人（processor_id），一并拉取用户下拉
                    const [res, userRes] = await Promise.all([
                        comboProcessingMethod(),
                        comboUser(),
                    ]);
                    setProcOptions(res.data.data || []);
                    setUsers(userRes.data.data || []);
                }
            } catch (e) {
                message.error("加载配置数据失败");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [open, operation, module, form]);

    if (!operation) return null;

    const needsMethodIds = [
        "methodCreate",
        "methodDelete",
        "distribute",
        "approve",
        "reject",
        "rollback",
    ].includes(operation.value);
    // 需求变更：processDelete 接口不支持按 option 局部删除——不管传不传 option_ids
    // 都会清空该任务下所有样品的加工，所以它不再展示选项目录，只有"批量配置加工"
    // (processUpdate，整体覆盖) 才需要选项与期限。
    // V4: 除"批量添加方法"（methodCreate 是给样品新增方法）以外，其余按方法操作的
    //     任务级批量都只对"已经分派了所选方法"的样品生效 —— 没有这些方法的样品不受影响，
    //     这一点在只选任务、看不到具体样品时很容易被误解，所以在选择器下方点明。
    const methodScopeHint =
        needsMethodIds && operation.value !== "methodCreate";
    const needsOptionIds = operation.value === "processUpdate";
    const needsDeadline =
        operation.value === "distribute" || operation.value === "processUpdate";
    // V4: 生成重复样(duplicate)需要 ratio + description，不需要方法/选项/期限
    const needsRatio = operation.value === "duplicate";
    const isDanger =
        operation.value.includes("Delete") ||
        operation.value === "reject" ||
        operation.value === "rollback";

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);
            const payload = { task_id: taskId };
            if (needsMethodIds) payload.method_ids = values.method_ids;
            if (needsOptionIds) payload.option_ids = values.option_ids || [];
            if (needsDeadline) {
                payload.deadline = values.deadline
                    ? values.deadline.format("YYYY-MM-DD")
                    : null;
            }
            // V4: 加工分配新增 processor_id（加工人）与 default（使用默认加工选项）。
            //     后端要求 processor_id + deadline + (default 或 option_ids 非空)
            //     三者同时满足才会置为加工中，否则会清空该任务下样品的加工。
            if (operation.value === "processUpdate") {
                payload.processor_id = values.processor_id;
                payload.default = !!values.default;
            }
            // V4: 按比例从该任务下的普通样(type=0)生成重复样(type=3)
            if (needsRatio) {
                payload.ratio = values.ratio;
                payload.description = values.description || "";
            }
            if (operation.value === "distribute") {
                if (module === "workflow")
                    payload.department_id = values.department_id;
                else payload.tester_id = values.tester_id;
            }

            const apiFn = api[operation.value];
            if (!apiFn) {
                message.warning("当前角色不支持该操作");
                return;
            }
            const res = await apiFn(payload);
            if (res.data.status === 0) {
                message.success(`${operation.label}成功`);
                onSuccess?.();
            } else {
                message.error(res.data.message || `${operation.label}失败`);
            }
        } catch (e) {
            if (e?.errorFields) return; // form validation error, already shown inline
            message.error(`${operation.label}执行失败`);
        } finally {
            setSubmitting(false);
        }
    };

    // 需求变更：加工的配置/删除比其它任务级操作更容易被误解——明确点出"整体覆盖"
    // 与"不支持局部删除、会清空全部"，其它操作仍用原来的通用提示。
    // V4: 提示统一压成单行（去掉 description）—— 原来的两段式 Alert 在弹窗顶部
    //     占了过多垂直空间，只保留会影响操作结果的信息。
    const alertContent =
        operation.value === "processDelete"
            ? {
                  type: "error",
                  message:
                      "不支持只删部分选项：将清空该任务下所有样品的加工人与全部加工选项，且不可恢复。",
              }
            : operation.value === "processUpdate"
              ? {
                    type: "warning",
                    message:
                        "整体覆盖该任务下所有样品的加工人、加工方法与选项（非追加）。",
                }
              : // V4: 生成重复样是"新增数据"而非覆盖
                operation.value === "duplicate"
                ? {
                      type: "info",
                      message:
                          "仅复制该任务下的普通样，质控样将被忽略；方法数按比例向上取整。",
                  }
                : operation.value === "methodCreate"
                  ? {
                        type: "warning",
                        message: `将对该任务下未分配所选检测方法的样品执行「${operation.label}」，已经分派这些方法的样品不受影响。`,
                    }
                  : {
                        type: "warning",
                        message: `将对该任务下所有已分派了所选检测方法的样品执行「${operation.label}」，未分派这些方法的样品不受影响。`,
                    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-3 p-1">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        {operation.icon}
                    </div>
                    <div>
                        <div className="text-lg font-black text-slate-800">
                            批量操作此任务 · {operation.label}
                        </div>
                    </div>
                </div>
            }
            open={open}
            onCancel={onCancel}
            width={840}
            confirmLoading={submitting}
            destroyOnHidden
            footer={
                <div className="flex justify-between items-center p-2">
                    <Button
                        onClick={onCancel}
                        className="rounded-xl font-bold h-10 px-6 border-slate-200"
                    >
                        取消
                    </Button>
                    <Button
                        type="primary"
                        danger={isDanger}
                        onClick={handleSubmit}
                        loading={submitting}
                        className="rounded-xl font-bold h-10 px-10 shadow-lg shadow-blue-500/20"
                    >
                        确认执行
                    </Button>
                </div>
            }
        >
            <Alert
                type={alertContent.type}
                showIcon
                className="mb-4 rounded-lg text-xs"
                message={alertContent.message}
            />
            <Spin spinning={loading}>
                <Form form={form} layout="vertical">
                    {needsMethodIds && (
                        <Form.Item
                            name="method_ids"
                            label={
                                <span className="font-black text-slate-700">
                                    选择检测项目及方法
                                </span>
                            }
                            rules={[
                                {
                                    required: true,
                                    message: "请选择检测项目及方法",
                                },
                            ]}
                        >
                            <MethodSelector />
                        </Form.Item>
                    )}

                    {/* V4: 加工人必填 —— 只有指定了 processor_id，样品才会进入
                        该加工人的「加工管理」任务/样品列表 */}
                    {operation.value === "processUpdate" && (
                        <>
                            <Form.Item
                                name="processor_id"
                                label={
                                    <span className="font-black text-slate-700">
                                        加工人
                                    </span>
                                }
                                tooltip="该任务下所有样品将进入此加工人的「加工管理」列表，由其完成加工并审批"
                                rules={[
                                    { required: true, message: "请选择加工人" },
                                ]}
                            >
                                <Select
                                    placeholder="请选择加工人"
                                    options={users.map((u) => ({
                                        label: u.nickname || u.name,
                                        value: u.id,
                                    }))}
                                    showSearch
                                    optionFilterProp="label"
                                    className="w-full"
                                />
                            </Form.Item>
                            {/* V4: default=true 时后端按各样品已关联的检测方法自动匹配
                                默认加工选项，与手动勾选的 option_ids 至少二选一 */}
                            <Form.Item
                                name="default"
                                valuePropName="checked"
                                label={
                                    <span className="font-black text-slate-700">
                                        使用默认加工选项
                                    </span>
                                }
                                tooltip="开启后由系统按每个样品已关联的检测方法自动匹配默认加工选项；关闭则必须在下方手动选择"
                            >
                                <Switch />
                            </Form.Item>
                        </>
                    )}

                    {needsOptionIds && (
                        <Form.Item
                            name="option_ids"
                            label={
                                <span className="font-black text-slate-700">
                                    选择加工方法及选项
                                    {useDefaultProc && (
                                        <span className="ml-2 text-[11px] font-bold text-slate-400">
                                            （已启用默认选项，可留空）
                                        </span>
                                    )}
                                </span>
                            }
                            rules={[
                                {
                                    // V4: 与"使用默认加工选项"二选一
                                    required: !useDefaultProc,
                                    message:
                                        "请选择加工选项，或开启「使用默认加工选项」",
                                },
                            ]}
                        >
                            <ProcessingOptionSelector allOptions={procOptions} />
                        </Form.Item>
                    )}

                    {/* V4: 按比例生成重复样 */}
                    {needsRatio && (
                        <>
                            <Form.Item
                                name="ratio"
                                label={
                                    <span className="font-black text-slate-700">
                                        重复比例
                                    </span>
                                }
                                tooltip="拖动滑块或直接填写百分比（可带小数），例如 20% 表示按 20% 的检测方法生成重复样；发给接口的仍是 0~1 的小数"
                                rules={[
                                    {
                                        required: true,
                                        message: "请输入重复比例",
                                    },
                                    {
                                        // 后端约束是开区间下限（0 < ratio ≤ 1），
                                        // async-validator 的 min 是闭区间，这里自行校验。
                                        // V4: 界面是百分比，提示也按百分比措辞
                                        validator: (_, v) =>
                                            v === undefined ||
                                            v === null ||
                                            (v > 0 && v <= 1)
                                                ? Promise.resolve()
                                                : Promise.reject(
                                                      new Error(
                                                          "比例需大于 0% 且不超过 100%",
                                                      ),
                                                  ),
                                    },
                                ]}
                            >
                                {/* V4: 滑块快速选比例 + 输入框精确输入，共享同一个值 */}
                                <RatioSelector />
                            </Form.Item>
                            <Form.Item
                                name="description"
                                label={
                                    <span className="font-black text-slate-700">
                                        描述
                                    </span>
                                }
                            >
                                <Input.TextArea
                                    rows={2}
                                    maxLength={255}
                                    showCount
                                    placeholder="生成的重复样备注（可留空）"
                                />
                            </Form.Item>
                        </>
                    )}

                    {operation.value === "distribute" && (
                        <Form.Item
                            name={
                                module === "workflow"
                                    ? "department_id"
                                    : "tester_id"
                            }
                            label={
                                <span className="font-black text-slate-700">
                                    {module === "workflow"
                                        ? "下发科室"
                                        : "分配检测员"}
                                </span>
                            }
                            rules={[{ required: true, message: "请选择目标" }]}
                        >
                            <Select
                                placeholder={
                                    module === "workflow"
                                        ? "请选择目标科室"
                                        : "请选择检测员"
                                }
                                options={
                                    module === "workflow"
                                        ? departments.map((d) => ({
                                              label: d.name,
                                              value: d.id,
                                          }))
                                        : users.map((u) => ({
                                              label: u.nickname || u.name,
                                              value: u.id,
                                          }))
                                }
                                showSearch
                                optionFilterProp="label"
                                className="w-full"
                            />
                        </Form.Item>
                    )}

                    {needsDeadline && (
                        <Form.Item
                            name="deadline"
                            label={
                                <span className="font-black text-slate-700">
                                    完成期限
                                </span>
                            }
                            rules={[{ required: true, message: "请选择期限" }]}
                        >
                            <DatePicker
                                className="w-full rounded-xl"
                                disabledDate={(current) =>
                                    current && current < dayjs().startOf("day")
                                }
                            />
                        </Form.Item>
                    )}
                </Form>
            </Spin>
        </Modal>
    );
};

export default TaskBatchModal;
