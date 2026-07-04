import React, { useMemo } from "react";
import { Checkbox, Button, Empty } from "antd";

/**
 * Graphical horizontal (left-to-right) tree selector.
 *
 * Used by the sample batch centers so users can, after picking samples in the
 * table, drill sample → item → method and multi-select the leaf branches (or
 * one-click select all). Leaf paths are emitted in exactly the same shape the
 * old Cascader produced (`[[sampleId, itemId, methodId], ...]`), so the submit
 * grouping logic in SampleBatchModal is reused unchanged.
 *
 * A node is treated as a selectable LEAF when it has no (non-empty) children.
 * Parent nodes render a tri-state checkbox that toggles all enabled descendant
 * leaves.
 *
 * @param {Array} data - tree nodes: { label, value, disabled?, children? }
 * @param {Array<Array>} value - selected leaf paths
 * @param {function} onChange - (paths) => void
 * @param {number} [maxHeight=420]
 */
const isLeafNode = (node) => !node.children || node.children.length === 0;

const collectLeafPaths = (nodes, prefix = [], onlyEnabled = false) => {
    const out = [];
    (nodes || []).forEach((node) => {
        // Placeholder / info nodes (e.g. "未分配方法") are never selectable
        if (node.checkable === false) return;
        const path = [...prefix, node.value];
        if (isLeafNode(node)) {
            if (!onlyEnabled || !node.disabled) out.push(path);
        } else {
            out.push(...collectLeafPaths(node.children, path, onlyEnabled));
        }
    });
    return out;
};

const keyOf = (path) => path.join("/");

const HorizontalTree = ({ data = [], value = [], onChange, maxHeight = 420 }) => {
    const selectedKeys = useMemo(
        () => new Set(value.map(keyOf)),
        [value],
    );

    const allEnabledLeaves = useMemo(
        () => collectLeafPaths(data, [], true),
        [data],
    );

    const setPaths = (paths) => onChange?.(paths);

    const toggleLeaf = (path) => {
        const k = keyOf(path);
        if (selectedKeys.has(k)) {
            setPaths(value.filter((p) => keyOf(p) !== k));
        } else {
            setPaths([...value, path]);
        }
    };

    const toggleBranch = (descPaths) => {
        const keys = descPaths.map(keyOf);
        const allSelected = keys.every((k) => selectedKeys.has(k));
        if (allSelected) {
            setPaths(value.filter((p) => !keys.includes(keyOf(p))));
        } else {
            const existing = new Set(value.map(keyOf));
            const added = descPaths.filter((p) => !existing.has(keyOf(p)));
            setPaths([...value, ...added]);
        }
    };

    const renderNode = (node, prefix, depth) => {
        const path = [...prefix, node.value];
        const k = keyOf(path);

        // Non-checkable info node: render a muted label with no checkbox
        if (node.checkable === false) {
            return (
                <div key={k} className="flex items-center py-1">
                    {depth > 0 && (
                        <span className="w-6 h-px bg-slate-200 mr-1 flex-shrink-0" />
                    )}
                    <span className="text-slate-300 text-sm italic">
                        {node.label}
                    </span>
                </div>
            );
        }

        if (isLeafNode(node)) {
            return (
                <div
                    key={k}
                    className="flex items-center py-1"
                >
                    <span className="w-6 h-px bg-slate-200 mr-1 flex-shrink-0" />
                    <Checkbox
                        checked={selectedKeys.has(k)}
                        disabled={node.disabled}
                        onChange={() => toggleLeaf(path)}
                        className="text-sm"
                    >
                        <span
                            className={
                                node.disabled
                                    ? "text-slate-300"
                                    : "text-slate-700"
                            }
                        >
                            {node.label}
                        </span>
                    </Checkbox>
                </div>
            );
        }

        const descLeaves = collectLeafPaths(node.children, path, true);
        const descKeys = descLeaves.map(keyOf);
        const checkedCount = descKeys.filter((dk) =>
            selectedKeys.has(dk),
        ).length;
        const allChecked =
            descKeys.length > 0 && checkedCount === descKeys.length;
        const someChecked = checkedCount > 0 && !allChecked;

        return (
            <div key={k} className="flex items-start">
                {/* Node label + branch checkbox */}
                <div className="flex items-center flex-shrink-0 py-1">
                    {depth > 0 && (
                        <span className="w-6 h-px bg-slate-200 mr-1" />
                    )}
                    <Checkbox
                        checked={allChecked}
                        indeterminate={someChecked}
                        disabled={descLeaves.length === 0}
                        onChange={() => toggleBranch(descLeaves)}
                    >
                        <span
                            className={`font-bold whitespace-nowrap ${
                                depth === 0
                                    ? "text-blue-700"
                                    : "text-slate-600"
                            }`}
                        >
                            {node.label}
                        </span>
                    </Checkbox>
                </div>
                {/* Children column with a connecting rail */}
                <div className="border-l-2 border-slate-100 pl-2 ml-1">
                    {node.children.map((child) =>
                        renderNode(child, path, depth + 1),
                    )}
                </div>
            </div>
        );
    };

    if (!data || data.length === 0) {
        return (
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="所选样品中没有可操作的内容"
            />
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Button
                    size="small"
                    onClick={() => setPaths(allEnabledLeaves)}
                    disabled={allEnabledLeaves.length === 0}
                    className="rounded-lg"
                >
                    一键全选
                </Button>
                <Button
                    size="small"
                    onClick={() => setPaths([])}
                    disabled={value.length === 0}
                    className="rounded-lg"
                >
                    清空
                </Button>
                <span className="text-xs text-slate-400 ml-auto">
                    已选 <b className="text-blue-600">{value.length}</b> /{" "}
                    {allEnabledLeaves.length}
                </span>
            </div>
            <div
                className="overflow-auto rounded-2xl border border-slate-100 bg-slate-50/40 p-3"
                style={{ maxHeight }}
            >
                {data.map((node) => (
                    <div
                        key={node.value}
                        className="mb-2 pb-2 border-b border-dashed border-slate-100 last:border-0 last:mb-0 last:pb-0"
                    >
                        {renderNode(node, [], 0)}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HorizontalTree;
