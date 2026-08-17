import React from "react";
import { Slider, InputNumber } from "antd";

// V4: 「生成重复样」的比例选择器 —— 交互层统一用百分比（滑块可停在 0~100 的每个整数上，
// 输入框可手填任意小数位），而对外的表单值、以及最终发给接口的 ratio 仍然是 0~1 的小数，
// 两种表示在本组件内换算。SampleBatchModal（按样品）与 TaskBatchModal（按任务）共用。
const RATIO_MARKS = {
    10: "10%",
    20: "20%",
    30: "30%",
    40: "40%",
    50: "50%",
    60: "60%",
    70: "70%",
    80: "80%",
    90: "90%",
    100: "100%",
};

// 百分比 -> 小数。除以 100 会留下浮点尾数（29 / 100 在 double 下没问题，但 33.33 这类
// 手填值除后可能出现长尾），统一收敛到 6 位小数，够表达到 0.0001% 的精度。
const toRatio = (pct) =>
    typeof pct === "number" ? Number((pct / 100).toFixed(6)) : pct;

// 小数 -> 百分比。同样要收敛：0.29 * 100 在 double 下是 28.999999999999996。
const toPercent = (ratio) =>
    typeof ratio === "number" ? Number((ratio * 100).toFixed(4)) : ratio;

const RatioSelector = ({ value, onChange, disabled = false }) => {
    const percent = toPercent(value);
    return (
        // items-start：Slider 自带 10px 上外边距，滑轨中线与 32px 高的输入框中线正好对齐；
        // 滑块的下外边距同时给刻度文字留位置，不额外占用垂直空间。
        <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
                <Slider
                    min={0}
                    max={100}
                    step={1}
                    marks={RATIO_MARKS}
                    value={typeof percent === "number" ? percent : 0}
                    onChange={(v) => onChange?.(toRatio(v))}
                    disabled={disabled}
                    tooltip={{ formatter: (v) => `${v}%` }}
                />
            </div>
            {/* 不设 precision —— 允许手填任意小数位，如 33.33 */}
            <InputNumber
                min={0}
                max={100}
                step={1}
                value={percent}
                onChange={(v) => onChange?.(toRatio(v))}
                disabled={disabled}
                addonAfter="%"
                className="w-[100px] shrink-0"
                placeholder="20"
            />
        </div>
    );
};

export default RatioSelector;
