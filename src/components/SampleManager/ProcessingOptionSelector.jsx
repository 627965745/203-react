import React from "react";
import { Checkbox, Cascader } from "antd";

// 通用「加工选项」选择器：建议的加工选项（勾选，来自已分派检测方法关联的加工选项）+
// 全部加工选项（级联下拉），两者共享同一个已选值数组（加工选项 id 列表）。
// 单独添加（DetailDrawer 的“配置加工任务”弹窗）与批量添加（SampleBatchModal）
// 均使用此组件，保持交互一致。
const ProcessingOptionSelector = ({
    value = [],
    onChange,
    suggestedOptions = [],
    allOptions = [],
    disabledIds = [],
    disabled = false,
}) => {
    // 注意：Checkbox.Group 的 onChange 只会保留“它自己渲染过的”选项（registeredValues），
    // 如果直接把它的回调结果原样传给外部 onChange，会把通过下方“所有加工选项”级联选中的、
    // 不在建议列表里的 id 一并清掉。这里手动把这部分 id 合并回去。
    const suggestedIds = suggestedOptions.map((o) => o.id);
    const handleSuggestedChange = (checkedValues) => {
        const outsideSuggested = value.filter((v) => !suggestedIds.includes(v));
        onChange([...outsideSuggested, ...checkedValues]);
    };

    return (
        <div className="space-y-4">
            {suggestedOptions.length > 0 && (
                <div>
                    <div className="text-sm font-bold text-slate-700 mb-2">
                        建议的加工选项
                    </div>
                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 max-h-48 overflow-y-auto">
                        <Checkbox.Group
                            value={value}
                            onChange={handleSuggestedChange}
                            disabled={disabled}
                            className="flex flex-wrap gap-x-4 gap-y-2"
                        >
                            {suggestedOptions.map((o) => (
                                <Checkbox
                                    key={o.id}
                                    value={o.id}
                                    disabled={disabledIds.includes(o.id)}
                                >
                                    <span className="text-sm font-medium">
                                        {o.processing_method_name}
                                        {o.processing_option_value
                                            ? ` - ${o.processing_option_value}`
                                            : ""}
                                    </span>
                                </Checkbox>
                            ))}
                        </Checkbox.Group>
                    </div>
                </div>
            )}
            <div>
                <div className="text-sm font-bold text-slate-700 mb-2">
                    所有加工选项
                </div>
                <Cascader
                    multiple
                    options={allOptions.map((m) => ({
                        label: m.name,
                        value: `m-${m.id}`,
                        children: (m.options || []).map((o) => ({
                            label: o.value,
                            value: o.id,
                            disabled: disabledIds.includes(o.id),
                        })),
                    }))}
                    value={value.map((id) => {
                        let methodId = null;
                        for (const m of allOptions) {
                            if (
                                m.options &&
                                m.options.some((o) => o.id === id)
                            ) {
                                methodId = m.id;
                                break;
                            }
                        }
                        return methodId ? [`m-${methodId}`, id] : [id];
                    })}
                    onChange={(val) =>
                        onChange(val.map((path) => path[path.length - 1]))
                    }
                    displayRender={(labels) => labels.join(" / ")}
                    placeholder="选择方法及选项"
                    className="w-full"
                    showCheckedStrategy="SHOW_CHILD"
                    showSearch
                    disabled={disabled}
                    style={{ height: "auto", minHeight: "34px" }}
                />
            </div>
        </div>
    );
};

export default ProcessingOptionSelector;
