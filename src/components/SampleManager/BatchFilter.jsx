import React, { useState } from "react";
import { Select, InputNumber, Button, Divider, Space, Tooltip } from "antd";
import { NumberOutlined } from "@ant-design/icons";

/**
 * V5: 样品批次筛选器。
 *
 * 对应各 Sample/read 接口新增的可选参数 `batch`，语义由后端统一约定：
 *   · 不传（null/undefined）—— 不过滤，返回全部样品
 *   · 0                    —— 仅返回未分批（batch IS NULL）的样品
 *   · N（≥1）              —— 仅返回第 N 批的样品
 *
 * 批次号是任意整数，无法枚举，所以下拉里预置「未分批」+ 当前页数据中出现过的批次，
 * 下拉底部再提供一个数字输入框直接跳到任意批次。清空即恢复“全部批次”。
 *
 * 注意：批量操作接口（approve/distribute/... 与 task_id 联用）的 `batch` 没有
 * “0 = 未分批”这层语义，不要把这里的值直接透传过去。
 */
const BatchFilter = ({
    value,
    onChange,
    knownBatches = [],
    style,
    className,
}) => {
    const [custom, setCustom] = useState(null);

    const options = [
        { label: "未分批", value: 0 },
        ...knownBatches.map((b) => ({ label: `第 ${b} 批`, value: b })),
    ];
    // 用户手动指定过、但当前页数据里没有的批次号，也要保留在选项中才能正常回显
    if (value != null && value !== 0 && !knownBatches.includes(value)) {
        options.push({ label: `第 ${value} 批`, value });
    }

    const applyCustom = () => {
        if (custom == null) return;
        onChange?.(custom);
        setCustom(null);
    };

    return (
        <Tooltip title="留空=全部批次；未分批=后端 batch IS NULL">
            <Select
                allowClear
                placeholder="批次"
                value={value}
                onChange={(val) => onChange?.(val ?? null)}
                options={options}
                style={{ width: 130, ...style }}
                className={className}
                popupRender={(menu) => (
                    <>
                        {menu}
                        <Divider className="my-1" />
                        <Space.Compact className="w-full p-1">
                            <InputNumber
                                min={1}
                                precision={0}
                                value={custom}
                                onChange={setCustom}
                                onPressEnter={applyCustom}
                                className="flex-1"
                                size="small"
                            />
                            <Button
                                size="small"
                                type="primary"
                                icon={<NumberOutlined />}
                                onClick={applyCustom}
                            >
                                跳转
                            </Button>
                        </Space.Compact>
                    </>
                )}
            />
        </Tooltip>
    );
};

export default BatchFilter;
