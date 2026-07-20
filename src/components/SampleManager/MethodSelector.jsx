import React from "react";
import { Select, Checkbox } from "antd";

// 通用「检测方法」选择器：建议的方法（勾选，来自检测项目关联）+ 全部方法（下拉搜索），
// 两者共享同一个已选值数组。单独添加（ItemConfigModal）与批量添加（BatchOperationModal/
// SampleBatchModal）均使用此组件，保持交互一致。
const MethodSelector = ({
    value = [],
    onChange,
    suggestedMethods = [],
    allMethods = [],
    disabledIds = [],
    disabled = false,
}) => {
    // 注意：Checkbox.Group 的 onChange 只会保留“它自己渲染过的”选项（registeredValues），
    // 如果直接把它的回调结果原样传给外部 onChange，会把通过下方“所有检测方法”下拉选中的、
    // 不在建议列表里的 id 一并清掉。这里手动把这部分 id 合并回去。
    const suggestedIds = suggestedMethods.map(m => m.id);
    const handleSuggestedChange = (checkedValues) => {
        const outsideSuggested = value.filter(v => !suggestedIds.includes(v));
        onChange([...outsideSuggested, ...checkedValues]);
    };

    return (
        <div className="space-y-4">
            {suggestedMethods.length > 0 && (
                <div>
                    <div className="text-sm font-bold text-slate-700 mb-2">建议的检测方法</div>
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 max-h-48 overflow-y-auto">
                        <Checkbox.Group
                            value={value}
                            onChange={handleSuggestedChange}
                            disabled={disabled}
                            className="flex flex-wrap gap-x-4 gap-y-2"
                        >
                            {suggestedMethods.map(m => (
                                <Checkbox
                                    key={m.id}
                                    value={m.id}
                                    disabled={disabledIds.includes(m.id)}
                                >
                                    <span className="text-sm font-medium">
                                        {m.code ? `${m.name} (${m.code})` : m.name}
                                    </span>
                                </Checkbox>
                            ))}
                        </Checkbox.Group>
                    </div>
                </div>
            )}
            <div>
                <div className="text-sm font-bold text-slate-700 mb-2">所有检测方法</div>
                <Select
                    mode="multiple"
                    placeholder={allMethods.length > 0 ? "可多选检测方法" : "暂无可选方法"}
                    showSearch
                    optionFilterProp="label"
                    className="w-full"
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    options={allMethods.map(m => ({
                        label: m.code ? `${m.name} (${m.code})` : m.name,
                        value: m.id,
                        disabled: disabledIds.includes(m.id),
                    }))}
                />
            </div>
        </div>
    );
};

export default MethodSelector;
