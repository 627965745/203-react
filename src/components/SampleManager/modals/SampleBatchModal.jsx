import React, { useState, useEffect, useMemo } from "react";
import {
    Modal,
    Button,
    Select,
    DatePicker,
    Form,
    message,
    Spin,
    Divider,
    Tag,
    Table as AntTable,
    Input,
    Alert,
    Switch,
} from "antd";
import {
    ContainerOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    RocketOutlined,
    DeleteOutlined,
    ToolOutlined,
    FileTextOutlined,
    EditOutlined,
    SendOutlined,
    RollbackOutlined,
    RetweetOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

// API imports
import * as workflowApi from "../../../api/workflow";
import * as departmentApi from "../../../api/department";
import * as testingApi from "../../../api/testing";
import { comboDepartment } from "../../../api/department";
import { comboProcessingMethod } from "../../../api/processingMethod";
import { comboUser } from "../../../api/user";

import HorizontalTree from "../HorizontalTree";
import MethodSelector from "../MethodSelector";
import ProcessingOptionSelector from "../ProcessingOptionSelector";
// V4: 生成重复样的比例选择器（滑块 + 输入框），与任务级批量操作共用
import RatioSelector from "../RatioSelector";

// 求多个样品各自已有 id 列表的交集 —— 只有对全部目标样品都已经添加过的
// 方法/加工选项，重复添加才是纯粹的无效操作，才需要置灰禁止选择。
const intersectIds = (samplesList, getIdsForSample) => {
    if (samplesList.length === 0) return [];
    return samplesList.slice(1).reduce((acc, s) => {
        const idSet = new Set(getIdsForSample(s));
        return acc.filter((id) => idSet.has(id));
    }, getIdsForSample(samplesList[0]));
};

// 按 module 解析批量操作对应的接口映射。抽成具名导出，供 TaskBatchModal.jsx
// （任务级批量操作，走 task_id）复用，避免两处各维护一份端点映射。
export const resolveBatchApi = (module) => {
    const maps = {
        workflow: {
            methodCreate: workflowApi.methodCreateSample,
            methodDelete: workflowApi.methodDeleteSample,
            // 需求变更：批量"添加加工"改为批量"配置加工"，统一走 processUpdate（整体覆盖），
            // 不再用 processCreate —— 批量场景下不区分目标样品当前是否已有加工配置。
            processUpdate: workflowApi.processUpdateSample,
            processDelete: workflowApi.processDeleteSample,
            distribute: workflowApi.distributeSample,
            approve: workflowApi.approveSample,
            reject: workflowApi.rejectSample,
            // V4: 新增"按比例生成重复样"，三个模块各有独立端点（权限隔离维度不同）
            duplicate: workflowApi.duplicateSample,
        },
        department: {
            methodCreate: departmentApi.methodCreateDepartmentSample,
            methodDelete: departmentApi.methodDeleteDepartmentSample,
            processUpdate: null,
            processDelete: null,
            distribute: departmentApi.distributeDepartmentSample,
            approve: departmentApi.approveDepartmentSample,
            reject: departmentApi.rejectDepartmentSample,
            rollback: departmentApi.rollbackDepartmentSample,
            // V4: 部门维度按 department_id 隔离，生成的重复样方法初始 status=1
            duplicate: departmentApi.duplicateDepartmentSample,
        },
        testing: {
            methodCreate: testingApi.methodCreateTestingSample,
            methodDelete: testingApi.methodDeleteTestingSample,
            processUpdate: null,
            processDelete: null,
            distribute: null,
            approve: testingApi.approveTestingSample,
            reject: testingApi.rollbackTestingSample,
            resultCreate: testingApi.resultCreateTestingSample,
            // V4: 检测维度按 tester_id 隔离，生成的重复样方法初始 status=2
            duplicate: testingApi.duplicateTestingSample,
        },
    };
    return maps[module] || maps.workflow;
};

// Mirror of DetailDrawer's MethodStatusMap — used to annotate methods when the
// status no longer restricts deletion.
const MethodStatusMap = {
    0: { label: "管理组未下发" },
    1: { label: "组长未下发" },
    2: { label: "正在试验" },
    3: { label: "等待组长审核" },
    4: { label: "等待管理组审核" },
    5: { label: "生命周期结束" },
};

/**
 * The set of batch operations available per module. Exported so the sample
 * pages can build their toolbar `batchActions` from the same source of truth.
 */
// V3: item 与 method 强绑定 —— "批量添加/删除项目"（itemCreate/itemDelete）已删除，不再有
//     独立的项目分配操作。leaf 表示叶子层级：'sample' -> 只需选样品；'method' -> 样品>项目>方法
export const getOperations = (module) => {
    let ops = [];
    if (module === "testing") {
        ops = [
            // { label: "批量录入结果", value: "resultEntry", icon: <EditOutlined />, color: "blue", leaf: "method" },
            {
                label: "批量提交结果",
                value: "approve",
                icon: <SendOutlined />,
                color: "green",
                leaf: "method",
            },
            {
                label: "批量退回任务",
                value: "reject",
                icon: <RollbackOutlined />,
                color: "red",
                leaf: "method",
            },
            // V4: 新增 —— 按比例生成重复样，只需选样品（或走任务级入口按 task_id 生成）
            {
                label: "生成重复样",
                value: "duplicate",
                icon: <RetweetOutlined />,
                color: "orange",
                leaf: "sample",
            },
        ];
    } else {
        ops = [
            // V3: 添加方法只需选样品；删除方法为 样品>项目>方法
            {
                label: "批量添加方法",
                value: "methodCreate",
                icon: <FileTextOutlined />,
                color: "cyan",
                leaf: "sample",
            },
            {
                label: "批量删除方法",
                value: "methodDelete",
                icon: <DeleteOutlined />,
                color: "orange",
                leaf: "method",
            },
            // V2: 加工上提到样品级 —— 配置/删除加工都只需选样品。
            // 需求变更：processDelete 接口不支持按 option 局部删除，传什么 option_ids
            // 都会清空该样品的全部加工，因此两个操作都不再提供"选项/方法"级别的选择，
            // leaf 统一为 'sample'——勾选样品即操作对象，不存在"选中部分加工"这回事。
            {
                label: "批量配置加工",
                value: "processUpdate",
                icon: <ToolOutlined />,
                color: "purple",
                leaf: "sample",
            },
            {
                label: "批量删除加工",
                value: "processDelete",
                icon: <DeleteOutlined />,
                color: "volcano",
                leaf: "sample",
            },
            {
                label: "批量下发",
                value: "distribute",
                icon: <RocketOutlined />,
                color: "emerald",
                leaf: "method",
            },
            {
                label: "批量审核通过",
                value: "approve",
                icon: <CheckCircleOutlined />,
                color: "green",
                leaf: "method",
            },
            {
                label: "批量审核拒绝",
                value: "reject",
                icon: <CloseCircleOutlined />,
                color: "red",
                leaf: "method",
            },
            // V4: 新增 —— 按比例生成重复样，只需选样品（或走任务级入口按 task_id 生成）
            {
                label: "生成重复样",
                value: "duplicate",
                icon: <RetweetOutlined />,
                color: "orange",
                leaf: "sample",
            },
        ];
        if (module === "department") {
            ops.push({
                label: "批量撤回任务",
                value: "rollback",
                icon: <RollbackOutlined />,
                color: "red",
                leaf: "method",
            });
        }
    }

    // Processing operations only exist for the workflow (management) module
    if (module === "department" || module === "testing") {
        return ops.filter((op) => !op.value.includes("process"));
    }
    return ops;
};

/**
 * Single-operation batch modal. Samples are pre-selected in the table and
 * passed in via `samples`; the operation is passed in via `operation`.
 * "Add" operations show a simple picker; delete / method-level operations show
 * a graphical horizontal tree of what the selected samples already contain.
 *
 * @param {object} operation - one entry from getOperations(module)
 * @param {Array} samples - selected sample rows (with nested items/methods/processing)
 * @param {string} module - 'workflow' | 'department' | 'testing'
 * @param {object} task - current task (for lab_code display)
 */
const SampleBatchModal = ({
    open,
    onCancel,
    onSuccess,
    operation,
    samples = [],
    module = "workflow",
    task,
}) => {
    const [loading, setLoading] = useState(false);
    const [selections, setSelections] = useState([]);

    const [departments, setDepartments] = useState([]);
    const [users, setUsers] = useState([]);
    // V4: 只保留全量加工选项目录 —— "建议的加工选项"已由后端的 default 参数取代
    const [procOptions, setProcOptions] = useState([]);
    // V3: item 与 method 强绑定，methodCreate 不再需要"建议的/全部"两组方法列表 ——
    // MethodSelector 自行按项目懒加载方法；这里只需算出已对全部目标样品添加过的
    // {item_id, method_id} 组合键（"itemId-methodId"），在选择器里置灰防止重复添加
    const [disabledPairs, setDisabledPairs] = useState([]);

    const [form] = Form.useForm();
    // V4: 开启"使用默认加工选项"后，option_ids 不再必填（后端按检测方法自动匹配）
    const useDefaultProc = Form.useWatch("default", form);

    // department/testing modules cannot operate on samples they didn't create
    const isSampleRestricted = (s) => {
        const notSelfCreated =
            s.creator_id === null ||
            s.creator_id === undefined ||
            s.creator_name === null ||
            s.creator_name === undefined;
        return (
            (module === "department" || module === "testing") && notSelfCreated
        );
    };

    // Per-sample summary for the no-tree "add" op (methodCreate).
    const sampleSummary = (s) => {
        // V4: 生成重复样按 department_id / tester_id 隔离，与"是否本人创建"无关，不置灰
        if (operation?.value !== "duplicate" && isSampleRestricted(s))
            return { disabled: true, note: " (非本人创建)" };
        if (operation?.value === "duplicate" && s.type !== 0)
            return { disabled: true, note: " (非普通样)" };
        return { disabled: false, note: "" };
    };

    // V2: department/testing 不能操作非本人创建的样品；可操作的样品集合
    const editableSamples = useMemo(
        () => samples.filter((s) => !isSampleRestricted(s)),
        [samples, module],
    );

    // V4: sample 级操作的实际目标集合。生成重复样(duplicate)按 department_id / tester_id
    //     做权限隔离，而不是按创建人 —— 若沿用 editableSamples，管理组下发的普通样
    //     （creator_id 为空）会被整体排除，而它们恰恰是最需要复制的对象。
    //     另外后端只会从中挑出普通样(type=0)，这里同步过滤掉质控样以免误导。
    const targetSamples = useMemo(() => {
        if (operation?.value === "duplicate")
            return samples.filter((s) => s.type === 0 || s.type === undefined);
        return editableSamples;
    }, [operation, samples, editableSamples]);

    // Resolve APIs based on module
    // V3: itemCreate/itemDelete 已删除，不再出现在这些映射里
    const api = useMemo(() => resolveBatchApi(module), [module]);

    // Reset + load auxiliary data whenever the modal opens for an operation
    useEffect(() => {
        if (!open || !operation) return;
        form.resetFields();

        // V3: sample 级操作（methodCreate/processUpdate/processDelete）
        //     直接作用于可操作样品，预置选择；其它操作在树中选择。
        // V4: duplicate 同为 sample 级操作，目标集合见 targetSamples
        if (operation.leaf === "sample") {
            setSelections(targetSamples.map((s) => [s.id]));
        } else {
            setSelections([]);
        }
        // V4: 生成重复样默认比例 0.2（后端约束 0 < ratio ≤ 1）；描述不预填，留给用户自己写
        if (operation.value === "duplicate") {
            form.setFieldsValue({ ratio: 0.2 });
        }
        // V4: 批量配置加工默认打开"使用默认加工选项"，此时 option_ids 可留空，
        //     由后端按样品已关联的检测方法自动匹配默认加工选项。
        if (operation.value === "processUpdate") {
            form.setFieldsValue({ default: true });
        }

        const load = async () => {
            setLoading(true);
            try {
                if (operation.value === "methodCreate") {
                    // V3: item 与 method 强绑定，MethodSelector 自行按项目懒加载可选方法，
                    //     这里只需算出已对全部目标样品添加过的 {item_id, method_id} 组合键
                    setDisabledPairs(
                        intersectIds(editableSamples, (s) =>
                            (s.methods || []).map(
                                (m) => `${m.item_id}-${m.method_id || m.id}`,
                            ),
                        ),
                    );
                } else if (operation.value === "processUpdate") {
                    // 需求变更：批量配置加工是整体覆盖（processUpdate），不是新增，所以不再计算
                    // "已对全部目标样品添加过的选项"并置灰——覆盖语义下，已有的选项也应该能
                    // 被重新选中（否则反而无法在新配置里保留它）。
                    // V4: 不再按已分派方法查 TestMethod/processingOption 推荐"建议的加工选项" ——
                    //     默认加工选项由后端在 processUpdate 时按 default 参数自动匹配，
                    //     前端只需提供全量选项目录供手动补充，以及加工人下拉。
                    const [allProcRes, userRes] = await Promise.all([
                        comboProcessingMethod(),
                        comboUser(),
                    ]);
                    setUsers(userRes.data.data || []);
                    setProcOptions(allProcRes.data.data || []);
                } else if (operation.value === "distribute") {
                    if (module === "workflow") {
                        const res = await comboDepartment();
                        setDepartments(res.data.data || []);
                    } else {
                        const res = await comboUser();
                        setUsers(res.data.data || []);
                    }
                }
            } catch (e) {
                message.error("加载配置数据失败");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [
        open,
        operation,
        samples,
        module,
        form,
        editableSamples,
        targetSamples,
    ]);

    const labCodeOf = (s) =>
        `${task?.lab_code || ""}-${s.lab_code?.toString().padStart(4, "0")}`;

    // V3: 树状选择数据。仅 leaf 为 'method'(样品>项目>方法) 时使用 —— 'sample' 级操作
    //     （含加工的配置/删除）不用树，见上方 getOperations 的注释。
    //     item 与 method 强绑定，'method' 为三级：样品 > 检测项目 > 检测方法。
    const treeData = useMemo(() => {
        if (!operation || operation.leaf === "sample") return [];
        return samples.map((s) => {
            const fullLabCode = labCodeOf(s);

            const isNotSelfCreated =
                s.creator_id === null ||
                s.creator_id === undefined ||
                s.creator_name === null ||
                s.creator_name === undefined;
            const isOperationRestricted = [
                "methodCreate",
                "methodDelete",
            ].includes(operation.value);
            const isSelfRestrictDisabled =
                (module === "department" || module === "testing") &&
                isNotSelfCreated &&
                isOperationRestricted;

            const isSampleDisabled = isSelfRestrictDisabled;
            // V2: 加工状态读取样品级
            const sampleProcessing = s.processing_status === 1;

            // leaf === 'method' —— 样品 > 检测项目 > 检测方法（V3: item 与 method 强绑定）
            // 先按 item_id 分组，方法节点挂在其所属项目节点下
            const itemGroups = new Map(); // item_id -> { itemName, methods: [] }
            (s.methods || []).forEach((m) => {
                const itemId = m.item_id;
                if (!itemGroups.has(itemId)) {
                    itemGroups.set(itemId, {
                        itemName: m.item_name,
                        methods: [],
                    });
                }
                itemGroups.get(itemId).methods.push(m);
            });

            const childNodes = Array.from(itemGroups.entries()).map(
                ([itemId, group]) => {
                    const methodNodes = group.methods.map((m) => {
                        let isDisabled = false;
                        let reason = "";

                        if (isSelfRestrictDisabled) {
                            isDisabled = true;
                        } else if (operation.value === "distribute") {
                            if (sampleProcessing) {
                                isDisabled = true;
                                reason = " (加工未完成)";
                            } else if (
                                module === "workflow" &&
                                m.status !== 0
                            ) {
                                isDisabled = true;
                                reason = " (状态非待下发)";
                            } else if (
                                module === "department" &&
                                !(m.status === 0 || m.status === 1)
                            ) {
                                isDisabled = true;
                                reason = " (状态不可分配)";
                            }
                        } else if (
                            operation.value === "approve" ||
                            operation.value === "reject"
                        ) {
                            let targetStatus = 4; // Workflow
                            if (module === "department") targetStatus = 3;
                            else if (module === "testing") targetStatus = 2;

                            if (m.status !== targetStatus) {
                                isDisabled = true;
                                reason = ` (非待处理状态)`;
                            }
                        } else if (operation.value === "rollback") {
                            if (module === "department" && m.status !== 1) {
                                isDisabled = true;
                                reason = " (状态不可撤回)";
                            }
                        } else if (operation.value === "methodDelete") {
                            // No status restriction on deletion — surface status.
                            reason = ` · ${
                                MethodStatusMap[m.status]?.label || "未知状态"
                            }`;
                        }

                        return {
                            label: (m.method_name || m.name) + reason,
                            value: m.method_id || m.id,
                            disabled: isDisabled,
                        };
                    });

                    return {
                        label: group.itemName || `#${itemId}`,
                        value: itemId,
                        children: methodNodes,
                        disabled: methodNodes.every((n) => n.disabled),
                    };
                },
            );

            // 空占位：让每个被选样品都在树中出现
            if (childNodes.length === 0) {
                return {
                    label: `${fullLabCode} (#${s.id})`,
                    value: s.id,
                    disabled: isSampleDisabled,
                    children: [
                        {
                            label: "未分配检测项目及方法",
                            value: `__empty_${s.id}`,
                            checkable: false,
                        },
                    ],
                };
            }

            return {
                label: `${fullLabCode} (#${s.id})`,
                value: s.id,
                children: childNodes,
                disabled:
                    isSampleDisabled || childNodes.every((n) => n.disabled),
            };
        });
    }, [operation, samples, task, module]);

    const handleSubmit = async () => {
        if (!operation) return;
        // V3: 只有 leaf 为 process/method 的操作使用树选择
        const usesTree = operation.leaf !== "sample";
        if (usesTree && selections.length === 0) {
            message.warning("请至少选择一项内容");
            return;
        }
        if (operation.leaf === "sample" && targetSamples.length === 0) {
            message.warning(
                operation.value === "duplicate"
                    ? "所选样品中没有普通样，无法生成重复样"
                    : "没有可操作的样品",
            );
            return;
        }

        // Validate detail fields for the operations that need them
        try {
            if (operation.value === "methodCreate")
                await form.validateFields(["method_ids"]);
            else if (operation.value === "processUpdate")
                // V4: 加工人必填；option_ids 仅在未启用"默认加工选项"时必填（见下方校验规则）
                await form.validateFields([
                    "processor_id",
                    "option_ids",
                    "deadline",
                ]);
            else if (operation.value === "duplicate")
                await form.validateFields(["ratio"]);
            else if (operation.value === "distribute")
                await form.validateFields([
                    module === "workflow" ? "department_id" : "tester_id",
                    "deadline",
                ]);
        } catch (e) {
            return;
        }

        setLoading(true);
        try {
            const details = form.getFieldsValue(true);
            const promises = [];

            if (operation.value === "methodCreate") {
                // V3: item 与 method 强绑定 —— 直接给所有可操作样品添加所选 {item_id, method_id} 组合
                const methodIds = details.method_ids || [];
                const sampleIds = editableSamples.map((s) => s.id);
                if (sampleIds.length && methodIds.length) {
                    promises.push(
                        api.methodCreate({
                            sample_ids: sampleIds,
                            method_ids: methodIds,
                        }),
                    );
                }
            } else if (operation.value === "processUpdate") {
                // V2: 加工上提到样品级，移除 item_ids
                // 需求变更：批量配置加工整体覆盖所选样品的加工配置（processUpdate），
                // 而非在原有基础上新增
                const optionIds =
                    details.option_ids?.map((path) =>
                        Array.isArray(path) ? path[path.length - 1] : path,
                    ) || [];
                const deadline = details.deadline
                    ? details.deadline.format("YYYY-MM-DD")
                    : null;
                const sampleIds = targetSamples.map((s) => s.id);
                // V4: 新增 processor_id（加工人）与 default（使用默认加工选项）。
                //     后端要求 processor_id + deadline + (default 或 option_ids 非空)
                //     三者同时满足才会置为加工中，否则会清空加工 —— 这里也按同样的
                //     条件把关，避免"以为配置成功、实际被清空"。
                const useDefault = !!details.default;
                if (sampleIds.length && (useDefault || optionIds.length)) {
                    promises.push(
                        api.processUpdate({
                            sample_ids: sampleIds,
                            processor_id: details.processor_id,
                            default: useDefault,
                            option_ids: optionIds,
                            deadline,
                        }),
                    );
                }
            } else if (operation.value === "duplicate") {
                // V4: 按比例从所选普通样(type=0)复制生成重复样(type=3)，
                //     client_code 与父样品关联由后端处理，前端只传范围与比例。
                //     task_id 是必传项 —— 即使已经给了 sample_ids 也要一并带上。
                const sampleIds = targetSamples.map((s) => s.id);
                if (!task?.id) {
                    message.warning("缺少所属任务，无法生成重复样");
                    setLoading(false);
                    return;
                }
                if (sampleIds.length) {
                    promises.push(
                        api.duplicate({
                            task_id: task.id,
                            sample_ids: sampleIds,
                            ratio: details.ratio,
                            description: details.description || "",
                        }),
                    );
                }
            } else if (operation.value === "processDelete") {
                // 需求变更：processDelete 接口不支持按 option 局部删除——传入的 option_ids
                // 会被忽略，直接清空该样品的全部加工，因此这里不再收集/传 option_ids，
                // 一次请求清空所有可操作样品的加工配置即可。
                const sampleIds = editableSamples.map((s) => s.id);
                if (sampleIds.length) {
                    promises.push(api.processDelete({ sample_ids: sampleIds }));
                }
            } else if (operation.value === "resultEntry") {
                if (details.results) {
                    Object.entries(details.results).forEach(
                        ([sid, methodGroup]) => {
                            Object.entries(methodGroup).forEach(
                                ([mid, fields]) => {
                                    promises.push(
                                        api.resultCreate({
                                            sample_id: Number(sid),
                                            method_id: Number(mid),
                                            results: fields,
                                        }),
                                    );
                                },
                            );
                        },
                    );
                }
            } else {
                // V3: 方法级操作 distribute/approve/reject/rollback/methodDelete
                //     —— selections 为 [sampleId, itemId, methodId]，item 与 method 强绑定，
                //     合并/去重的 key 必须是完整的 {item_id, method_id} 对，不能只用裸 methodId
                //     （否则同一 methodId 挂在不同 item 下的两条独立记录会被错误地合并成一条）
                const pairMap = {}; // "itemId-methodId" -> Set<sampleId>
                selections.forEach((path) => {
                    const sid = path[0],
                        iid = path[1],
                        mid = path[2];
                    if (sid && iid && mid) {
                        const pairKey = `${iid}-${mid}`;
                        if (!pairMap[pairKey]) pairMap[pairKey] = new Set();
                        pairMap[pairKey].add(sid);
                    }
                });
                // 将样品集合完全相同的 {item_id, method_id} 对合并成一次请求
                const sampleSetMap = {}; // sampleKey -> [{item_id, method_id}]
                Object.entries(pairMap).forEach(([pairKey, sSet]) => {
                    const key = Array.from(sSet).sort().join(",");
                    const [iid, mid] = pairKey.split("-").map(Number);
                    if (!sampleSetMap[key]) sampleSetMap[key] = [];
                    sampleSetMap[key].push({ item_id: iid, method_id: mid });
                });
                Object.entries(sampleSetMap).forEach(([sKey, methodIds]) => {
                    const sids = sKey.split(",").map(Number);
                    const payload = { sample_ids: sids, method_ids: methodIds };
                    if (operation.value === "distribute") {
                        const distributePayload = {
                            ...payload,
                            deadline: details.deadline
                                ? details.deadline.format("YYYY-MM-DD")
                                : null,
                        };
                        if (module === "workflow")
                            distributePayload.department_id =
                                details.department_id;
                        else distributePayload.tester_id = details.tester_id;
                        promises.push(api.distribute(distributePayload));
                    } else if (operation.value === "approve")
                        promises.push(api.approve(payload));
                    else if (operation.value === "reject")
                        promises.push(api.reject(payload));
                    else if (operation.value === "rollback")
                        promises.push(api.rollback(payload));
                    else if (operation.value === "methodDelete")
                        promises.push(api.methodDelete(payload));
                });
            }

            if (promises.length === 0) {
                message.warning("未识别到有效的操作对象或参数");
                setLoading(false);
                return;
            }
            await Promise.all(promises);
            message.success(`${operation.label}成功`);
            onSuccess?.();
        } catch (error) {
            message.error(`${operation.label}执行失败`);
        } finally {
            setLoading(false);
        }
    };

    if (!operation) return null;

    // V3: leaf 为 'sample' 的操作(methodCreate/processUpdate/processDelete)
    //     直接作用于所选样品，不用树；'method' 操作用树选择。
    const isSampleLevel = operation.leaf === "sample";
    const showTree = !isSampleLevel;

    const resultEntryRows = () => {
        const entryItems = [];
        // V2: 方法上提到样品级，selections 为 [sampleId, methodId]
        selections.forEach((path) => {
            const sid = path[0],
                mid = path[1];
            const sample = samples.find((s) => s.id === sid);
            const method = (sample?.methods || []).find(
                (m) => (m.method_id || m.id) === mid,
            );
            if (method && method.fields) {
                method.fields.forEach((field) => {
                    entryItems.push({
                        id: `${sid}_${mid}_${field.id}`,
                        sampleId: sid,
                        methodId: mid,
                        fieldId: field.id,
                        labCode: labCodeOf(sample),
                        fieldName: field.name,
                        methodName: method.method_name || method.name,
                        initialValue: field.value,
                    });
                });
            }
        });
        return entryItems;
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-3 p-1">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        {operation.icon || <ContainerOutlined />}
                    </div>
                    <div>
                        <div className="text-lg font-black text-slate-800">
                            {operation.label}
                        </div>
                        <div className="text-[11px] text-slate-400 font-bold">
                            已选 {samples.length} 个样品
                        </div>
                    </div>
                </div>
            }
            open={open}
            onCancel={onCancel}
            width={840}
            confirmLoading={loading}
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
                        danger={
                            operation.value.includes("Delete") ||
                            operation.value === "reject"
                        }
                        onClick={handleSubmit}
                        loading={loading}
                        className="rounded-xl font-bold h-10 px-10 shadow-lg shadow-blue-500/20"
                    >
                        确认执行
                    </Button>
                </div>
            }
        >
            <Spin spinning={loading} description="正在处理中...">
                <Form form={form} layout="vertical" preserve className="pt-2">
                    {/* Selection area —— V2: sample 级操作展示目标样品，其它用树选择 */}
                    {isSampleLevel ? (
                        <div className="mb-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="text-xs font-bold text-slate-500 mb-2">
                                目标样品
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                {samples.map((s) => {
                                    const info = sampleSummary(s);
                                    return (
                                        <Tag
                                            key={s.id}
                                            color={
                                                info.disabled
                                                    ? "default"
                                                    : "blue"
                                            }
                                            className="m-0 font-mono"
                                        >
                                            {labCodeOf(s)}
                                            {info.note}
                                        </Tag>
                                    );
                                })}
                            </div>
                        </div>
                    ) : showTree ? (
                        <div className="mb-4">
                            <div className="text-sm font-black text-slate-700 mb-2">
                                选择要操作的内容
                            </div>
                            <HorizontalTree
                                data={treeData}
                                value={selections}
                                onChange={setSelections}
                            />
                        </div>
                    ) : null}

                    {/* Detail area */}
                    {operation.value === "methodCreate" && (
                        <>
                            <Divider className="my-3" />
                            {/* V3: item 与 method 强绑定，选择方法即选择「检测项目+检测方法」组合 */}
                            <Form.Item
                                name="method_ids"
                                label={
                                    <span className="font-black text-slate-700">
                                        选择要添加的检测项目及方法（可多选，将添加到全部目标样品）
                                    </span>
                                }
                                rules={[
                                    {
                                        required: true,
                                        message: "请选择检测项目及方法",
                                    },
                                ]}
                            >
                                <MethodSelector disabledPairs={disabledPairs} />
                            </Form.Item>
                        </>
                    )}

                    {operation.value === "processUpdate" && (
                        <>
                            <Divider className="my-3" />
                            {/* V4: 提示压成单行，去掉与标题重复的 description */}
                            <Alert
                                type="warning"
                                showIcon
                                className="mb-3 rounded-lg text-xs"
                                message="整体覆盖所选样品当前的加工人、加工方法与选项（非追加）。"
                            />
                            {/* V4: 加工人必填 —— 只有指定了 processor_id，样品才会进入
                                该加工人的「加工管理」任务/样品列表 */}
                            <Form.Item
                                name="processor_id"
                                label={
                                    <span className="font-black text-slate-700">
                                        加工人
                                    </span>
                                }
                                tooltip="样品将进入该加工人的「加工管理」列表，由其完成加工并审批"
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
                            {/* V4: default=true 时后端按样品已关联的检测方法自动匹配默认
                                加工选项，与手动勾选的 option_ids 至少二选一 */}
                            <Form.Item
                                name="default"
                                valuePropName="checked"
                                label={
                                    <span className="font-black text-slate-700">
                                        使用默认加工选项
                                    </span>
                                }
                                tooltip="开启后由系统按样品已关联的检测方法自动匹配默认加工选项；关闭则必须在下方手动选择"
                            >
                                <Switch />
                            </Form.Item>
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
                                        required: !useDefaultProc,
                                        message:
                                            "请选择加工选项，或开启「使用默认加工选项」",
                                    },
                                ]}
                            >
                                <ProcessingOptionSelector
                                    allOptions={procOptions}
                                />
                            </Form.Item>
                            <Form.Item
                                name="deadline"
                                label={
                                    <span className="font-black text-slate-700">
                                        完成期限
                                    </span>
                                }
                                rules={[
                                    { required: true, message: "请选择期限" },
                                ]}
                            >
                                <DatePicker
                                    placeholder="请输入完成期限"
                                    className="w-full rounded-xl"
                                    disabledDate={(current) =>
                                        current &&
                                        current < dayjs().startOf("day")
                                    }
                                />
                            </Form.Item>
                        </>
                    )}

                    {/* V4: 按比例生成重复样 —— 后端从所选普通样(type=0)按 ratio 向上取整
                        计算需复制的方法数，生成 type=3 的重复样并自动关联父样品 */}
                    {operation.value === "duplicate" && (
                        <>
                            <Divider className="my-3" />
                            {/* V4: 提示压成单行，只保留会影响操作结果的信息（有效目标数） */}
                            <Alert
                                type="info"
                                showIcon
                                className="mb-3 rounded-lg text-xs"
                                message={`仅复制普通样，质控样将被忽略；当前有效目标 ${targetSamples.length} 个，方法数按比例向上取整。`}
                            />
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

                    {operation.value === "processDelete" && (
                        <>
                            <Divider className="my-3" />
                            {/* V4: 提示压成单行 */}
                            <Alert
                                type="error"
                                showIcon
                                className="mb-1 rounded-lg text-xs"
                                message="不支持只删部分选项：将清空所选样品的加工人与全部加工选项，且不可恢复。"
                            />
                        </>
                    )}

                    {operation.value === "distribute" && (
                        <>
                            <Divider className="my-3" />
                            <div className="space-y-4 p-4 bg-emerald-50/30 border border-emerald-100 rounded-3xl">
                                <Form.Item
                                    name={
                                        module === "workflow"
                                            ? "department_id"
                                            : "tester_id"
                                    }
                                    label={
                                        <span className="font-black text-emerald-800">
                                            {module === "workflow"
                                                ? "下发科室"
                                                : "分配检测员"}
                                        </span>
                                    }
                                    rules={[
                                        {
                                            required: true,
                                            message: "请选择目标",
                                        },
                                    ]}
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
                                                      label:
                                                          u.nickname || u.name,
                                                      value: u.id,
                                                  }))
                                        }
                                        className="w-full"
                                    />
                                </Form.Item>
                                <Form.Item
                                    name="deadline"
                                    label={
                                        <span className="font-black text-emerald-800">
                                            完成期限
                                        </span>
                                    }
                                    rules={[
                                        {
                                            required: true,
                                            message: "请选择期限",
                                        },
                                    ]}
                                >
                                    <DatePicker
                                        placeholder="请输入完成期限"
                                        className="w-full rounded-xl"
                                        disabledDate={(current) =>
                                            current &&
                                            current < dayjs().startOf("day")
                                        }
                                    />
                                </Form.Item>
                            </div>
                        </>
                    )}

                    {operation.value === "resultEntry" &&
                        selections.length > 0 && (
                            <>
                                <Divider className="my-3" />
                                <AntTable
                                    dataSource={resultEntryRows()}
                                    rowKey="id"
                                    pagination={false}
                                    size="small"
                                    scroll={{ y: 300 }}
                                    columns={[
                                        {
                                            title: "样品编号",
                                            dataIndex: "labCode",
                                            width: 140,
                                            className: "font-mono",
                                        },
                                        {
                                            title: "项目/方法",
                                            dataIndex: "methodName",
                                            width: 140,
                                            ellipsis: true,
                                        },
                                        {
                                            title: "字段",
                                            dataIndex: "fieldName",
                                            width: 100,
                                        },
                                        {
                                            title: "录入值",
                                            dataIndex: "value",
                                            render: (_, record) => (
                                                <Form.Item
                                                    name={[
                                                        "results",
                                                        record.sampleId,
                                                        record.methodId,
                                                        record.fieldId,
                                                    ]}
                                                    initialValue={
                                                        record.initialValue
                                                    }
                                                    noStyle
                                                >
                                                    <Input
                                                        size="small"
                                                        placeholder="结果"
                                                        className="rounded-lg"
                                                    />
                                                </Form.Item>
                                            ),
                                        },
                                    ]}
                                />
                            </>
                        )}
                </Form>
            </Spin>
        </Modal>
    );
};

export default SampleBatchModal;
