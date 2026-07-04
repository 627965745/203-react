import React, { useState, useEffect } from "react";
import { Modal, Select, message, Spin, Button, Space, Alert } from "antd";

/**
 * Generic batch "arrange" modal.
 *
 * Reuses the per-row Arrange semantics (see e.g. pages/User/ArrangeModal.jsx) but
 * applies the chosen association set to MANY selected rows at once via an
 * `arrange` endpoint that accepts `ids: [...]`.
 *
 * NOTE: `arrange` is REPLACE semantics on the backend — the chosen set overwrites
 * whatever each selected row currently has. The alert below makes this explicit.
 *
 * @param {boolean} open
 * @param {string} title
 * @param {string} hint - description above the selector
 * @param {function} comboApi - () => Promise, returns { data: { status, data: [...] } }
 * @param {function} arrangeApi - (payload) => Promise
 * @param {string} extraKey - payload key for the chosen ids (e.g. 'role_ids')
 * @param {Array} selectedRows - the rows selected in the table
 * @param {function} [getIds] - (rows) => number[]; defaults to rows.map(r => r.id)
 * @param {function} [optionMapper] - (item) => ({ label, value })
 * @param {function} [optionsBuilder] - (rawData) => Select options[]; overrides optionMapper
 *                   (use for grouped/nested combo payloads, e.g. categories-with-items)
 * @param {function} onSuccess
 * @param {function} onCancel
 */
const BatchArrangeModal = ({
    open,
    title = "批量关联",
    hint = "请选择要关联的内容（支持多选）：",
    comboApi,
    arrangeApi,
    extraKey,
    selectedRows = [],
    getIds,
    optionMapper = (item) => ({ label: item.name, value: item.id }),
    optionsBuilder,
    onSuccess,
    onCancel,
}) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [options, setOptions] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        if (open) {
            setSelectedIds([]);
            fetchOptions();
        }
    }, [open]);

    const fetchOptions = async () => {
        setLoading(true);
        try {
            const res = await comboApi();
            if (res.data.status === 0) {
                const raw = res.data.data || [];
                setOptions(
                    optionsBuilder ? optionsBuilder(raw) : raw.map(optionMapper),
                );
            } else {
                message.error(res.data.message || "获取选项失败");
            }
        } catch (e) {
            message.error("获取选项异常");
        } finally {
            setLoading(false);
        }
    };

    const handleOk = async () => {
        const ids = getIds ? getIds(selectedRows) : selectedRows.map((r) => r.id);
        if (!ids.length) {
            message.warning("未选择任何数据");
            return;
        }
        setSubmitting(true);
        try {
            const res = await arrangeApi({ ids, [extraKey]: selectedIds });
            if (res.data.status === 0) {
                message.success("批量关联成功");
                onSuccess?.();
                onCancel?.();
            } else {
                message.error(res.data.message || "批量关联失败");
            }
        } catch (e) {
            message.error("接口异常");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            title={title}
            open={open}
            onCancel={onCancel}
            destroyOnHidden
            footer={
                <div className="flex justify-between w-full">
                    <Button danger onClick={() => setSelectedIds([])}>
                        清空选择
                    </Button>
                    <Space>
                        <Button onClick={onCancel}>取消</Button>
                        <Button
                            type="primary"
                            loading={submitting}
                            onClick={handleOk}
                        >
                            保存
                        </Button>
                    </Space>
                </div>
            }
        >
            <div className="pt-2 pb-2 space-y-3">
                <Alert
                    type="warning"
                    showIcon
                    message={
                        <span className="text-xs">
                            将把所选 <b>{selectedRows.length}</b>{" "}
                            项的现有关联<b>覆盖</b>为下面所选集合（未选则清空关联）。
                        </span>
                    }
                />
                <div className="text-gray-500">{hint}</div>
                {loading && options.length === 0 ? (
                    <div className="text-center py-4">
                        <Spin size="small" />
                    </div>
                ) : (
                    <Select
                        open={dropdownOpen}
                        onOpenChange={setDropdownOpen}
                        mode="multiple"
                        placeholder="下拉选择或搜索..."
                        value={selectedIds}
                        onChange={setSelectedIds}
                        style={{ width: "100%" }}
                        popupRender={(menu) => (
                            <>
                                {menu}
                                <div
                                    className="p-2 border-t border-gray-100 bg-gray-50 flex justify-center"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                >
                                    <Button
                                        type="primary"
                                        size="small"
                                        className="w-full text-xs"
                                        onClick={() => setDropdownOpen(false)}
                                    >
                                        完成选择
                                    </Button>
                                </div>
                            </>
                        )}
                        filterOption={(input, option) =>
                            (option?.label ?? "")
                                .toLowerCase()
                                .includes(input.toLowerCase())
                        }
                        options={options}
                    />
                )}
            </div>
        </Modal>
    );
};

export default BatchArrangeModal;
