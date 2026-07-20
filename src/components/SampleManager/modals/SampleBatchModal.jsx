import React, { useState, useEffect, useMemo } from "react";
import {
    Modal,
    Button,
    Cascader,
    Select,
    DatePicker,
    Form,
    message,
    Spin,
    Divider,
    Tag,
    Table as AntTable,
    Input,
} from "antd";
import {
    ContainerOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    RocketOutlined,
    AppstoreAddOutlined,
    DeleteOutlined,
    ToolOutlined,
    FileTextOutlined,
    EditOutlined,
    SendOutlined,
    RollbackOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

// API imports
import * as workflowApi from "../../../api/workflow";
import * as departmentApi from "../../../api/department";
import * as testingApi from "../../../api/testing";
import { comboDepartment } from "../../../api/department";
import { comboTestItem, methodTestItem } from "../../../api/testItem";
import { comboTestMethod } from "../../../api/testMethod";
import { comboProcessingMethod } from "../../../api/processingMethod";
import { comboUser } from "../../../api/user";

import HorizontalTree from "../HorizontalTree";
import MethodSelector from "../MethodSelector";
import ProcessingOptionSelector from "../ProcessingOptionSelector";

// 求多个样品各自已有 id 列表的交集 —— 只有对全部目标样品都已经添加过的
// 方法/加工选项，重复添加才是纯粹的无效操作，才需要置灰禁止选择。
const intersectIds = (samplesList, getIdsForSample) => {
    if (samplesList.length === 0) return [];
    return samplesList.slice(1).reduce((acc, s) => {
        const idSet = new Set(getIdsForSample(s));
        return acc.filter((id) => idSet.has(id));
    }, getIdsForSample(samplesList[0]));
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
// V2: 方法/加工上提到样品级。leaf 表示叶子层级：
//   'sample' -> 只需选样品；'item' -> 样品>检测项目；'method' -> 样品>检测方法
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
        ];
    } else {
        ops = [
            {
                label: "批量添加项目",
                value: "itemCreate",
                icon: <AppstoreAddOutlined />,
                color: "blue",
                leaf: "sample",
            },
            {
                label: "批量删除项目",
                value: "itemDelete",
                icon: <DeleteOutlined />,
                color: "red",
                leaf: "item",
            },
            // V2: 添加方法只需选样品；删除方法为 样品>方法
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
            // V2: 加工上提到样品级 —— 添加/删除加工都只需选样品
            {
                label: "批量添加加工",
                value: "processCreate",
                icon: <ToolOutlined />,
                color: "purple",
                leaf: "sample",
            },
            {
                label: "批量删除加工",
                value: "processDelete",
                icon: <DeleteOutlined />,
                color: "volcano",
                leaf: "process",
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
    const [itemOptions, setItemOptions] = useState([]);
    const [procOptions, setProcOptions] = useState([]);
    const [availableMethods, setAvailableMethods] = useState([]);
    // 与「单独添加」一致：方法/加工都提供“建议的”+“全部”两组选项
    const [allTestMethods, setAllTestMethods] = useState([]);
    const [suggestedProcOptions, setSuggestedProcOptions] = useState([]);
    // 已对所有目标样品都添加过的方法/加工选项 id —— 在选择器里置灰，防止重复添加
    const [disabledMethodIds, setDisabledMethodIds] = useState([]);
    const [disabledProcOptionIds, setDisabledProcOptionIds] = useState([]);

    const [form] = Form.useForm();

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

    // Per-sample summary for the no-tree "add" op (itemCreate).
    const sampleSummary = (s) => {
        if (isSampleRestricted(s))
            return { disabled: true, note: " (非本人创建)" };
        return { disabled: false, note: "" };
    };

    // V2: department/testing 不能操作非本人创建的样品；可操作的样品集合
    const editableSamples = useMemo(
        () => samples.filter((s) => !isSampleRestricted(s)),
        [samples, module],
    );

    // Resolve APIs based on module
    const api = useMemo(() => {
        const maps = {
            workflow: {
                itemCreate: workflowApi.itemCreateSample,
                itemDelete: workflowApi.itemDeleteSample,
                methodCreate: workflowApi.methodCreateSample,
                methodDelete: workflowApi.methodDeleteSample,
                processCreate: workflowApi.processCreateSample,
                processDelete: workflowApi.processDeleteSample,
                distribute: workflowApi.distributeSample,
                approve: workflowApi.approveSample,
                reject: workflowApi.rejectSample,
            },
            department: {
                itemCreate: departmentApi.itemCreateDepartmentSample,
                itemDelete: departmentApi.itemDeleteDepartmentSample,
                methodCreate: departmentApi.methodCreateDepartmentSample,
                methodDelete: departmentApi.methodDeleteDepartmentSample,
                processCreate: null,
                processDelete: null,
                distribute: departmentApi.distributeDepartmentSample,
                approve: departmentApi.approveDepartmentSample,
                reject: departmentApi.rejectDepartmentSample,
                rollback: departmentApi.rollbackDepartmentSample,
            },
            testing: {
                itemCreate: testingApi.itemCreateTestingSample,
                itemDelete: testingApi.itemDeleteTestingSample,
                methodCreate: testingApi.methodCreateTestingSample,
                methodDelete: testingApi.methodDeleteTestingSample,
                processCreate: null,
                processDelete: null,
                distribute: null,
                approve: testingApi.approveTestingSample,
                reject: testingApi.rollbackTestingSample,
                resultCreate: testingApi.resultCreateTestingSample,
            },
        };
        return maps[module] || maps.workflow;
    }, [module]);

    // Reset + load auxiliary data whenever the modal opens for an operation
    useEffect(() => {
        if (!open || !operation) return;
        form.resetFields();
        setAvailableMethods([]);

        // V2: sample 级操作（itemCreate/methodCreate/processCreate/processDelete）
        //     直接作用于可操作样品，预置选择；其它操作在树中选择。
        if (operation.leaf === "sample") {
            setSelections(editableSamples.map((s) => [s.id]));
        } else {
            setSelections([]);
        }

        const load = async () => {
            setLoading(true);
            try {
                if (operation.value === "itemCreate") {
                    const res = await comboTestItem();
                    setItemOptions(res.data.data || []);
                } else if (operation.value === "methodCreate") {
                    // V2: 方法上提到样品级 —— 建议的方法来自所选样品下所有检测项目，全部方法来自 comboTestMethod
                    const allItemIds = Array.from(
                        new Set(
                            editableSamples.flatMap((s) =>
                                (s.items || []).map((i) => i.item_id || i.id),
                            ),
                        ),
                    );
                    const [suggestedRes, allRes] = await Promise.all([
                        allItemIds.length
                            ? methodTestItem({ ids: allItemIds })
                            : Promise.resolve({ data: { data: [] } }),
                        comboTestMethod(),
                    ]);
                    setAvailableMethods(suggestedRes.data.data || []);
                    setAllTestMethods(allRes.data.data || []);
                    // 已对全部目标样品添加过的方法 —— 置灰
                    setDisabledMethodIds(
                        intersectIds(editableSamples, (s) =>
                            (s.methods || []).map((m) => m.method_id || m.id),
                        ),
                    );
                } else if (operation.value === "processCreate") {
                    // 建议的加工选项：来自可操作样品已分派方法关联的加工选项；全部加工选项：comboProcessingMethod
                    const allItemIds = Array.from(
                        new Set(
                            editableSamples.flatMap((s) =>
                                (s.items || []).map((i) => i.item_id || i.id),
                            ),
                        ),
                    );
                    const assignedMethodIds = Array.from(
                        new Set(
                            editableSamples.flatMap((s) =>
                                (s.methods || []).map(
                                    (m) => m.method_id || m.id,
                                ),
                            ),
                        ),
                    );
                    const [methodsRes, allProcRes] = await Promise.all([
                        allItemIds.length
                            ? methodTestItem({ ids: allItemIds })
                            : Promise.resolve({ data: { data: [] } }),
                        comboProcessingMethod(),
                    ]);
                    const suggestedMap = new Map();
                    (methodsRes.data.data || [])
                        .filter((m) => assignedMethodIds.includes(m.id))
                        .forEach((m) =>
                            (m.processing_options || []).forEach((opt) =>
                                suggestedMap.set(opt.id, opt),
                            ),
                        );
                    setSuggestedProcOptions(Array.from(suggestedMap.values()));
                    setProcOptions(allProcRes.data.data || []);
                    // 已对全部目标样品添加过的加工选项 —— 置灰
                    setDisabledProcOptionIds(
                        intersectIds(editableSamples, (s) =>
                            (s.processing || []).map((p) => p.option_id || p.id),
                        ),
                    );
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
    }, [open, operation, samples, module, form, editableSamples]);

    const labCodeOf = (s) =>
        `${task?.lab_code || ""}-${s.lab_code?.toString().padStart(4, "0")}`;

    // V2: 树状选择数据。仅 leaf 为 'item'(样品>项目) 或 'method'(样品>方法) 时使用。
    const treeData = useMemo(() => {
        if (!operation || operation.leaf === "sample") return [];
        const leaf = operation.leaf;
        return samples.map((s) => {
            const fullLabCode = labCodeOf(s);

            const isNotSelfCreated =
                s.creator_id === null ||
                s.creator_id === undefined ||
                s.creator_name === null ||
                s.creator_name === undefined;
            const isOperationRestricted = [
                "itemCreate",
                "itemDelete",
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

            let childNodes = [];
            if (leaf === "item") {
                // itemDelete —— 样品>检测项目
                childNodes = (s.items || []).map((item) => {
                    const itemId = item.item_id || item.id;
                    const itemName = item.item_name || item.name;
                    return {
                        label: itemName,
                        value: itemId,
                        disabled: isSelfRestrictDisabled,
                    };
                });
            } else if (leaf === "process") {
                childNodes = (s.processing || []).map((p) => {
                    return {
                        label: p.method_name + (p.value ? ` - ${p.value}` : ''),
                        value: p.option_id || p.id,
                        disabled: isSelfRestrictDisabled,
                    };
                });
            } else {
                // leaf === 'method' —— 样品>检测方法（V2: 方法上提到样品级）
                childNodes = (s.methods || []).map((m) => {
                    let isDisabled = false;
                    let reason = "";

                    if (isSelfRestrictDisabled) {
                        isDisabled = true;
                    } else if (operation.value === "distribute") {
                        if (sampleProcessing) {
                            isDisabled = true;
                            reason = " (加工未完成)";
                        } else if (module === "workflow" && m.status !== 0) {
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
            }

            // 空占位：让每个被选样品都在树中出现
            if (childNodes.length === 0) {
                return {
                    label: `${fullLabCode} (#${s.id})`,
                    value: s.id,
                    disabled: isSampleDisabled,
                    children: [
                        {
                            label:
                                leaf === "item" ? "未配置项目" : (leaf === "process" ? "未配置加工" : "未分配方法"),
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
        // V2: 只有 leaf 为 item/method 的操作使用树选择
        const usesTree = operation.leaf !== "sample";
        if (usesTree && selections.length === 0) {
            message.warning("请至少选择一项内容");
            return;
        }
        if (operation.leaf === "sample" && editableSamples.length === 0) {
            message.warning("没有可操作的样品");
            return;
        }

        // Validate detail fields for the operations that need them
        try {
            if (operation.value === "itemCreate")
                await form.validateFields(["item_ids"]);
            else if (operation.value === "methodCreate")
                await form.validateFields(["method_ids"]);
            else if (operation.value === "processCreate")
                await form.validateFields(["option_ids", "deadline"]);
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

            if (operation.value === "itemCreate") {
                const sampleIds = Array.from(
                    new Set(selections.map((path) => path[0])),
                );
                const itemIds =
                    details.item_ids?.map((path) =>
                        Array.isArray(path) ? path[path.length - 1] : path,
                    ) || [];
                if (sampleIds.length && itemIds.length)
                    promises.push(
                        api.itemCreate({
                            sample_ids: sampleIds,
                            item_ids: itemIds,
                        }),
                    );
            } else if (operation.value === "itemDelete") {
                const sampleItemMap = {};
                selections.forEach((path) => {
                    const sid = path[0],
                        iid = path[1];
                    if (sid && iid) {
                        if (!sampleItemMap[sid]) sampleItemMap[sid] = new Set();
                        sampleItemMap[sid].add(iid);
                    }
                });
                const itemSetMap = {};
                Object.entries(sampleItemMap).forEach(([sid, itemSet]) => {
                    const key = Array.from(itemSet).sort().join(",");
                    if (!itemSetMap[key]) itemSetMap[key] = [];
                    itemSetMap[key].push(Number(sid));
                });
                Object.entries(itemSetMap).forEach(([itemKey, sids]) =>
                    promises.push(
                        api.itemDelete({
                            sample_ids: sids,
                            item_ids: itemKey.split(",").map(Number),
                        }),
                    ),
                );
            } else if (operation.value === "methodCreate") {
                // V2: 方法上提到样品级 —— 直接给所有可操作样品添加所选方法
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
            } else if (operation.value === "processCreate") {
                // V2: 加工上提到样品级，移除 item_ids
                const optionIds =
                    details.option_ids?.map((path) =>
                        Array.isArray(path) ? path[path.length - 1] : path,
                    ) || [];
                const deadline = details.deadline
                    ? details.deadline.format("YYYY-MM-DD")
                    : null;
                const sampleIds = editableSamples.map((s) => s.id);
                if (sampleIds.length && optionIds.length) {
                    promises.push(
                        api.processCreate({
                            sample_ids: sampleIds,
                            option_ids: optionIds,
                            deadline,
                        }),
                    );
                }
            } else if (operation.value === "processDelete") {
                const sampleProcessMap = {};
                selections.forEach((path) => {
                    const sid = path[0],
                        oid = path[1];
                    if (sid && oid) {
                        if (!sampleProcessMap[sid]) sampleProcessMap[sid] = new Set();
                        sampleProcessMap[sid].add(oid);
                    }
                });
                const processSetMap = {};
                Object.entries(sampleProcessMap).forEach(([sid, processSet]) => {
                    const key = Array.from(processSet).sort().join(",");
                    if (!processSetMap[key]) processSetMap[key] = [];
                    processSetMap[key].push(Number(sid));
                });
                Object.entries(processSetMap).forEach(([processKey, sids]) =>
                    promises.push(
                        api.processDelete({
                            sample_ids: sids,
                            option_ids: processKey.split(",").map(Number),
                        }),
                    ),
                );
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
                // V2: 方法级操作 distribute/approve/reject/rollback/methodDelete
                //     —— selections 为 [sampleId, methodId]，移除 item_id
                const methodMap = {}; // methodId -> Set<sampleId>
                selections.forEach((path) => {
                    const sid = path[0],
                        mid = path[1];
                    if (sid && mid) {
                        if (!methodMap[mid]) methodMap[mid] = new Set();
                        methodMap[mid].add(sid);
                    }
                });
                // 将样品集合完全相同的方法合并成一次请求
                const sampleSetMap = {}; // sampleKey -> [methodId]
                Object.entries(methodMap).forEach(([mid, sSet]) => {
                    const key = Array.from(sSet).sort().join(",");
                    if (!sampleSetMap[key]) sampleSetMap[key] = [];
                    sampleSetMap[key].push(Number(mid));
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

    // V2: leaf 为 'sample' 的操作(itemCreate/methodCreate/processCreate/processDelete)
    //     直接作用于所选样品，不用树；'item'/'method' 操作用树选择。
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
                                {operation.value === "processCreate"
                                    ? "选择目标项目"
                                    : "选择要操作的内容"}
                            </div>
                            <HorizontalTree
                                data={treeData}
                                value={selections}
                                onChange={setSelections}
                            />
                        </div>
                    ) : null}

                    {/* Detail area */}
                    {operation.value === "itemCreate" && (
                        <>
                            <Divider className="my-3" />
                            <Form.Item
                                name="item_ids"
                                label={
                                    <span className="font-black text-slate-700">
                                        选择要添加的项目
                                    </span>
                                }
                                rules={[
                                    { required: true, message: "请选择项目" },
                                ]}
                            >
                                <Cascader
                                    multiple
                                    options={itemOptions.map((cat) => ({
                                        label: cat.name,
                                        value: `cat-${cat.id}`,
                                        children: (cat.items || []).map(
                                            (i) => ({
                                                label: i.name,
                                                value: i.id,
                                            }),
                                        ),
                                    }))}
                                    placeholder="搜索或选择项目"
                                    className="w-full"
                                    showSearch
                                    maxTagCount="responsive"
                                    showCheckedStrategy="SHOW_CHILD"
                                />
                            </Form.Item>
                        </>
                    )}

                    {operation.value === "methodCreate" && (
                        <>
                            <Divider className="my-3" />
                            {/* V2: 方法上提到样品级，与单独添加一致：建议的方法(勾选) + 全部方法(下拉) */}
                            <Form.Item
                                name="method_ids"
                                label={
                                    <span className="font-black text-slate-700">
                                        选择要添加的方法（可多选，将添加到全部目标样品）
                                    </span>
                                }
                                rules={[
                                    { required: true, message: "请选择方法" },
                                ]}
                            >
                                <MethodSelector
                                    suggestedMethods={availableMethods}
                                    allMethods={allTestMethods}
                                    disabledIds={disabledMethodIds}
                                />
                            </Form.Item>
                        </>
                    )}

                    {operation.value === "processCreate" && (
                        <>
                            <Divider className="my-3" />
                            <Form.Item
                                name="option_ids"
                                label={
                                    <span className="font-black text-slate-700">
                                        选择加工方法及选项
                                    </span>
                                }
                                rules={[
                                    {
                                        required: true,
                                        message: "请选择加工选项",
                                    },
                                ]}
                            >
                                <ProcessingOptionSelector
                                    suggestedOptions={suggestedProcOptions}
                                    allOptions={procOptions}
                                    disabledIds={disabledProcOptionIds}
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
