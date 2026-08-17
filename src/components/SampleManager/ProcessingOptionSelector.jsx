import React from "react";
import { Cascader } from "antd";

// 通用「加工选项」选择器：按加工方法分组的级联下拉，值为加工选项 id 列表。
// 单独添加（DetailDrawer 的“配置加工任务”弹窗）与批量添加（SampleBatchModal /
// TaskBatchModal）均使用此组件，保持交互一致。
// V4: 移除了“建议的加工选项”勾选区 —— 默认加工选项改由后端在 processUpdate 时按样品
//     已关联的检测方法自动匹配（default 参数），前端不必再预先查出这批 id 并推荐，
//     这里只保留“手动挑选额外选项”的能力。组件本身不再自带标题，由调用方标注。
const ProcessingOptionSelector = ({
    value = [],
    onChange,
    allOptions = [],
    disabledIds = [],
    disabled = false,
}) => (
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
                if (m.options && m.options.some((o) => o.id === id)) {
                    methodId = m.id;
                    break;
                }
            }
            return methodId ? [`m-${methodId}`, id] : [id];
        })}
        onChange={(val) => onChange(val.map((path) => path[path.length - 1]))}
        displayRender={(labels) => labels.join(" / ")}
        placeholder="选择方法及选项"
        className="w-full"
        showCheckedStrategy="SHOW_CHILD"
        showSearch
        disabled={disabled}
        style={{ height: "auto", minHeight: "34px", width: "100%" }}
    />
);

export default ProcessingOptionSelector;
