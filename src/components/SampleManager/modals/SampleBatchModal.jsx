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
    Alert,
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
import { comboProcessingMethod } from "../../../api/processingMethod";
import { comboUser } from "../../../api/user";

import HorizontalTree from "../HorizontalTree";

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

const ProcessingStatusMap = {
    0: { label: "不加工" },
    1: { label: "正在加工" },
    2: { label: "加工完成" },
};

// An item can only have processing configured/removed while it hasn't been
// distributed to a department (no method has advanced past status 0).
const isItemDistributed = (item) =>
    (item.methods || []).some((m) => m.status > 0);

/**
 * The set of batch operations available per module. Exported so the sample
 * pages can build their toolbar `batchActions` from the same source of truth.
 */
export const getOperations = (module) => {
    let ops = [];
    if (module === "testing") {
        ops = [
            { label: "批量录入结果", value: "resultEntry", icon: <EditOutlined />, color: "blue", levels: 3 },
            { label: "批量提交结果", value: "approve", icon: <SendOutlined />, color: "green", levels: 3 },
            { label: "批量退回任务", value: "reject", icon: <RollbackOutlined />, color: "red", levels: 3 },
        ];
    } else {
        ops = [
            { label: "批量添加项目", value: "itemCreate", icon: <AppstoreAddOutlined />, color: "blue", levels: 1 },
            { label: "批量删除项目", value: "itemDelete", icon: <DeleteOutlined />, color: "red", levels: 2 },
            { label: "批量添加方法", value: "methodCreate", icon: <FileTextOutlined />, color: "cyan", levels: 2 },
            { label: "批量删除方法", value: "methodDelete", icon: <DeleteOutlined />, color: "orange", levels: 3 },
            { label: "批量添加加工", value: "processCreate", icon: <ToolOutlined />, color: "purple", levels: 2 },
            { label: "批量删除加工", value: "processDelete", icon: <DeleteOutlined />, color: "volcano", levels: 3 },
            { label: "批量下发", value: "distribute", icon: <RocketOutlined />, color: "emerald", levels: 3 },
            { label: "批量审核通过", value: "approve", icon: <CheckCircleOutlined />, color: "green", levels: 3 },
            { label: "批量审核拒绝", value: "reject", icon: <CloseCircleOutlined />, color: "red", levels: 3 },
        ];
        if (module === "department") {
            ops.push({ label: "批量撤回任务", value: "rollback", icon: <RollbackOutlined />, color: "red", levels: 3 });
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
    const [mcItemId, setMcItemId] = useState(null); // methodCreate: chosen item

    const [form] = Form.useForm();

    // department/testing modules cannot operate on samples they didn't create
    const isSampleRestricted = (s) => {
        const notSelfCreated =
            s.creator_id === null ||
            s.creator_id === undefined ||
            s.creator_name === null ||
            s.creator_name === undefined;
        return (module === "department" || module === "testing") && notSelfCreated;
    };

    // Per-sample summary for the no-tree "add" op (itemCreate).
    const sampleSummary = (s) => {
        if (isSampleRestricted(s))
            return { disabled: true, note: " (非本人创建)" };
        return { disabled: false, note: "" };
    };

    // methodCreate: the union of items across the (editable) selected samples,
    // each carrying the ids of the samples that actually contain it. The item
    // dropdown is limited to these; picking one reveals which samples lack it.
    const methodCreateItems = useMemo(() => {
        const map = new Map();
        samples.forEach((s) => {
            if (isSampleRestricted(s)) return;
            (s.items || []).forEach((item) => {
                const id = item.item_id || item.id;
                const name = item.item_name || item.name;
                if (!map.has(id))
                    map.set(id, { itemId: id, itemName: name, sampleIds: [] });
                map.get(id).sampleIds.push(s.id);
            });
        });
        return Array.from(map.values());
    }, [samples, module]);

    // Samples the user selected that do NOT contain the chosen item (adding the
    // method there would be a no-op) — surfaced as a warning.
    const missingSamplesForItem = useMemo(() => {
        if (!mcItemId) return [];
        const entry = methodCreateItems.find((i) => i.itemId === mcItemId);
        const withItem = new Set(entry?.sampleIds || []);
        return samples.filter((s) => !withItem.has(s.id));
    }, [mcItemId, methodCreateItems, samples]);

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
        setMcItemId(null);

        // itemCreate operates on samples directly (levels=1): pre-seed selection
        // with the samples the current user is actually allowed to modify.
        if (operation.value === "itemCreate") {
            setSelections(
                samples
                    .filter((s) => !isSampleRestricted(s))
                    .map((s) => [s.id]),
            );
        } else {
            setSelections([]);
        }

        const load = async () => {
            setLoading(true);
            try {
                if (operation.value === "itemCreate") {
                    const res = await comboTestItem();
                    setItemOptions(res.data.data || []);
                } else if (operation.value === "processCreate") {
                    const res = await comboProcessingMethod();
                    setProcOptions(res.data.data || []);
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
    }, [open, operation, samples, module, form]);

    // methodCreate: an item can have multiple methods — fetch the chosen item's
    // methods (ResourceAdmin/TestItem/method) for the multi-select.
    useEffect(() => {
        if (!open || operation?.value !== "methodCreate" || !mcItemId) {
            setAvailableMethods([]);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await methodTestItem({ id: mcItemId });
                if (!cancelled) setAvailableMethods(res.data.data || []);
            } catch (e) {
                if (!cancelled) setAvailableMethods([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open, operation, mcItemId]);

    const labCodeOf = (s) =>
        `${task?.lab_code || ""}-${s.lab_code?.toString().padStart(4, "0")}`;

    // Build the horizontal-tree data (ported from the old cascaderOptions, with
    // all the same disable rules) from the pre-selected `samples`.
    const treeData = useMemo(() => {
        if (!operation) return [];
        return samples
            .map((s) => {
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

                if (operation.levels === 1) {
                    return {
                        label: `${fullLabCode} (#${s.id})`,
                        value: s.id,
                        disabled: isSampleDisabled,
                    };
                }

                const itemNodes = (s.items || [])
                    .map((item) => {
                        const itemId = item.item_id || item.id;
                        const itemName = item.item_name || item.name;

                        const isProcessingUnfinished =
                            operation.value === "distribute" &&
                            item.processing_status === 1;

                        if (operation.levels === 2) {
                            let itemDisabled = isSelfRestrictDisabled;
                            let itemReason = "";
                            // processCreate: gated only by status — an item can be
                            // configured while undistributed and not yet processed.
                            if (operation.value === "processCreate") {
                                if (isItemDistributed(item)) {
                                    itemDisabled = true;
                                    itemReason = " (已下发)";
                                } else if (item.processing_status !== 0) {
                                    itemDisabled = true;
                                    itemReason = " (已添加加工)";
                                }
                            } else if (isProcessingUnfinished) {
                                itemDisabled = true;
                            }
                            return {
                                label: itemName + itemReason,
                                value: itemId,
                                disabled: itemDisabled,
                            };
                        }

                        let subNodes = [];
                        if (operation.value.includes("process")) {
                            // processDelete: cannot remove processing once the
                            // item has been distributed to a department.
                            const procDistributed = isItemDistributed(item);
                            subNodes = (item.processing || []).map((p) => ({
                                label:
                                    `${p.method_name || p.name} - ${
                                        p.option_value ||
                                        p.value ||
                                        p.option_name ||
                                        ""
                                    }` +
                                    (procDistributed
                                        ? " (已下发科室，不可删除加工)"
                                        : ""),
                                value: p.id || p.option_id,
                                disabled: procDistributed,
                            }));
                        } else {
                            subNodes = (item.methods || []).map((m) => {
                                let isDisabled = false;
                                let reason = "";

                                if (isSelfRestrictDisabled) {
                                    isDisabled = true;
                                } else if (operation.value === "distribute") {
                                    if (item.processing_status === 1) {
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
                                    if (module === "department")
                                        targetStatus = 3;
                                    else if (module === "testing")
                                        targetStatus = 2;

                                    if (m.status !== targetStatus) {
                                        isDisabled = true;
                                        reason = ` (非待处理状态)`;
                                    }
                                } else if (operation.value === "rollback") {
                                    if (
                                        module === "department" &&
                                        m.status !== 1
                                    ) {
                                        isDisabled = true;
                                        reason = " (状态不可撤回)";
                                    }
                                } else if (operation.value === "methodDelete") {
                                    // No status restriction on deletion — just
                                    // surface the current status for awareness.
                                    reason = ` · ${
                                        MethodStatusMap[m.status]?.label ||
                                        "未知状态"
                                    }`;
                                }

                                return {
                                    label: (m.method_name || m.name) + reason,
                                    value: m.method_id || m.id,
                                    disabled: isDisabled,
                                };
                            });
                        }

                        return {
                            label: itemName,
                            value: itemId,
                            children: subNodes,
                            disabled:
                                (operation.levels === 3 &&
                                    subNodes.length > 0 &&
                                    subNodes.every((n) => n.disabled)) ||
                                isSelfRestrictDisabled,
                        };
                    });

                // levels===3: an item with no methods/processing is still shown
                // with a non-checkable "未分配方法/加工" placeholder.
                const decoratedItems =
                    operation.levels === 3
                        ? itemNodes.map((node) =>
                              node.children && node.children.length > 0
                                  ? node
                                  : {
                                        ...node,
                                        children: [
                                            {
                                                label: operation.value.includes(
                                                    "process",
                                                )
                                                    ? "未分配加工"
                                                    : "未分配方法",
                                                value: `__empty_sub_${s.id}_${node.value}`,
                                                checkable: false,
                                            },
                                        ],
                                    },
                          )
                        : itemNodes;

                // A sample with no items at all is still shown with a
                // non-checkable "未配置项目" placeholder — the modal always
                // reflects every sample the user selected in the table.
                if (decoratedItems.length === 0) {
                    return {
                        label: `${fullLabCode} (#${s.id})`,
                        value: s.id,
                        disabled: isSampleDisabled,
                        children: [
                            {
                                label: "未配置项目",
                                value: `__empty_item_${s.id}`,
                                checkable: false,
                            },
                        ],
                    };
                }

                return {
                    label: `${fullLabCode} (#${s.id})`,
                    value: s.id,
                    children: decoratedItems,
                    disabled:
                        isSampleDisabled ||
                        (operation.levels > 1 &&
                            decoratedItems.every((n) => n.disabled)),
                };
            });
    }, [operation, samples, task, module]);

    const handleSubmit = async () => {
        if (!operation) return;
        const usesTree =
            operation.levels >= 2 &&
            !["itemCreate", "methodCreate"].includes(operation.value);
        if (usesTree && selections.length === 0) {
            message.warning("请至少选择一项内容");
            return;
        }
        if (operation.value === "methodCreate" && !mcItemId) {
            message.warning("请选择检测项目");
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
                // Single item_id + multiple method_ids; apply only to the
                // selected samples that actually contain the chosen item.
                const methodIds = details.method_ids || [];
                const entry = methodCreateItems.find(
                    (i) => i.itemId === mcItemId,
                );
                const sampleIds = entry?.sampleIds || [];
                if (mcItemId && sampleIds.length && methodIds.length) {
                    promises.push(
                        api.methodCreate({
                            sample_ids: sampleIds,
                            item_id: mcItemId,
                            method_ids: methodIds,
                        }),
                    );
                }
            } else if (operation.value === "processCreate") {
                const optionIds =
                    details.option_ids?.map((path) =>
                        Array.isArray(path) ? path[path.length - 1] : path,
                    ) || [];
                const deadline = details.deadline
                    ? details.deadline.format("YYYY-MM-DD")
                    : null;
                // Group the picked (sample → item) leaves by sample and issue one
                // call per sample with just that sample's selected items.
                const bySample = {};
                selections.forEach((path) => {
                    const sid = path[0],
                        iid = path[1];
                    if (sid && iid) {
                        if (!bySample[sid]) bySample[sid] = [];
                        bySample[sid].push(iid);
                    }
                });
                if (optionIds.length) {
                    Object.entries(bySample).forEach(([sid, itemIds]) => {
                        promises.push(
                            api.processCreate({
                                sample_ids: [Number(sid)],
                                item_ids: itemIds,
                                option_ids: optionIds,
                                deadline,
                            }),
                        );
                    });
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
                // distribute / approve / reject / rollback / methodDelete / processDelete
                const itemMap = {};
                selections.forEach((path) => {
                    const sid = path[0],
                        iid = path[1],
                        subid = path[2];
                    if (sid && iid && subid) {
                        if (!itemMap[iid]) itemMap[iid] = {};
                        if (!itemMap[iid][subid]) itemMap[iid][subid] = new Set();
                        itemMap[iid][subid].add(sid);
                    }
                });
                Object.entries(itemMap).forEach(([itemId, subGroup]) => {
                    const sampleSetMap = {};
                    Object.entries(subGroup).forEach(([subId, sSet]) => {
                        const key = Array.from(sSet).sort().join(",");
                        if (!sampleSetMap[key]) sampleSetMap[key] = [];
                        sampleSetMap[key].push(Number(subId));
                    });
                    Object.entries(sampleSetMap).forEach(([sKey, subIds]) => {
                        const sids = sKey.split(",").map(Number),
                            iid = Number(itemId),
                            payload = { sample_ids: sids, item_id: iid };
                        if (operation.value === "distribute") {
                            const distributePayload = {
                                ...payload,
                                method_ids: subIds,
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
                            promises.push(
                                api.approve({ ...payload, method_ids: subIds }),
                            );
                        else if (operation.value === "reject")
                            promises.push(
                                api.reject({ ...payload, method_ids: subIds }),
                            );
                        else if (operation.value === "rollback")
                            promises.push(
                                api.rollback({ ...payload, method_ids: subIds }),
                            );
                        else if (operation.value === "methodDelete")
                            promises.push(
                                api.methodDelete({
                                    ...payload,
                                    method_ids: subIds,
                                }),
                            );
                        else if (operation.value === "processDelete")
                            promises.push(
                                api.processDelete({
                                    sample_ids: sids,
                                    item_ids: [iid],
                                }),
                            );
                    });
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

    // Only itemCreate skips the item tree (it targets whole samples). Every
    // other levels>=2 op (incl. processCreate) picks items/methods in the tree.
    // itemCreate targets whole samples; methodCreate targets one shared item —
    // neither uses the item tree. Everything else (delete/distribute/…) does.
    const noTreeOps = ["itemCreate", "methodCreate"];
    const showTree =
        operation.levels >= 2 && !noTreeOps.includes(operation.value);

    const resultEntryRows = () => {
        const entryItems = [];
        selections.forEach((path) => {
            const sid = path[0],
                iid = path[1],
                mid = path[2];
            const sample = samples.find((s) => s.id === sid);
            const item = (sample?.items || []).find(
                (i) => (i.item_id || i.id) === iid,
            );
            const method = (item?.methods || []).find(
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
                        danger={operation.value.includes("Delete") || operation.value === "reject"}
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
                    {/* Selection area */}
                    {operation.value === "itemCreate" ? (
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
                                                info.disabled ? "default" : "blue"
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
                                rules={[{ required: true, message: "请选择项目" }]}
                            >
                                <Cascader
                                    multiple
                                    options={itemOptions.map((cat) => ({
                                        label: cat.name,
                                        value: `cat-${cat.id}`,
                                        children: (cat.items || []).map((i) => ({
                                            label: i.name,
                                            value: i.id,
                                        })),
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
                            <Form.Item
                                label={
                                    <span className="font-black text-slate-700">
                                        选择检测项目（仅限所选样品中已有的项目）
                                    </span>
                                }
                                required
                            >
                                <Select
                                    placeholder={
                                        methodCreateItems.length
                                            ? "请选择检测项目"
                                            : "所选样品均未配置检测项目"
                                    }
                                    className="w-full"
                                    disabled={methodCreateItems.length === 0}
                                    value={mcItemId}
                                    onChange={(val) => {
                                        setMcItemId(val);
                                        form.setFieldValue("method_ids", []);
                                    }}
                                    showSearch
                                    optionFilterProp="label"
                                    options={methodCreateItems.map((i) => ({
                                        label: `${i.itemName}（${i.sampleIds.length}/${samples.length} 样品含此项目）`,
                                        value: i.itemId,
                                    }))}
                                />
                            </Form.Item>

                            {mcItemId && missingSamplesForItem.length > 0 && (
                                <Alert
                                    type="warning"
                                    showIcon
                                    className="mb-4 rounded-xl"
                                    message={
                                        <span className="text-xs">
                                            以下 <b>{missingSamplesForItem.length}</b>{" "}
                                            个样品不含该项目，添加的方法不会对其生效：
                                            {missingSamplesForItem
                                                .map((s) => labCodeOf(s))
                                                .join("、")}
                                        </span>
                                    }
                                />
                            )}

                            <Divider className="my-3" />
                            <Form.Item
                                name="method_ids"
                                label={
                                    <span className="font-black text-slate-700">
                                        选择要添加的方法（可多选）
                                    </span>
                                }
                                rules={[{ required: true, message: "请选择方法" }]}
                            >
                                <Select
                                    mode="multiple"
                                    placeholder={
                                        mcItemId
                                            ? "选择方法"
                                            : "请先在上方选择检测项目"
                                    }
                                    className="w-full"
                                    disabled={!mcItemId}
                                    options={availableMethods.map((m) => ({
                                        label: m.method_name || m.name,
                                        value: m.method_id || m.id,
                                    }))}
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
                                        选择加工工艺及选项
                                    </span>
                                }
                                rules={[
                                    { required: true, message: "请选择加工选项" },
                                ]}
                            >
                                <Cascader
                                    multiple
                                    options={procOptions.map((m) => ({
                                        label: m.name,
                                        value: `m-${m.id}`,
                                        children: (m.options || []).map((o) => ({
                                            label: o.value,
                                            value: o.id,
                                        })),
                                    }))}
                                    placeholder="选择加工"
                                    className="w-full"
                                    showCheckedStrategy="SHOW_CHILD"
                                />
                            </Form.Item>
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
                                        { required: true, message: "请选择目标" },
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
                            </div>
                        </>
                    )}

                    {operation.value === "resultEntry" && selections.length > 0 && (
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
                                                initialValue={record.initialValue}
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
