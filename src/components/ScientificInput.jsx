import { useEffect, useState } from "react";
import { InputNumber, Select, Space, Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import {
    MAX_DECIMALS,
    EXPONENTS,
    composeScientific,
    decomposeScientific,
    formatExponentLabel,
    formatDecimal,
    exactDecimalString,
    isScientificRounded,
} from "../utils/scientific";

// 数量级下拉的固定宽度：要能完整显示 10⁻⁸ 加下拉箭头
const EXPONENT_WIDTH = 78;

/**
 * V5: 科学计数法输入器 —— 用于 concentration / uncertainty。
 *
 * 后端把这两个字段统一成 0~1 的 float（最多 8 位小数）。直接让用户填 0.0000045
 * 这种数极易数错小数点，所以拆成两段输入：
 *   [ 尾数输入框 ] × [ 数量级下拉 10⁻¹ ~ 10⁻⁸ ]
 * 实际提交值 = 尾数 × 10^(-指数)，例如 6 配 10⁻³ => 6 × 10⁻³ = 0.006。
 *
 * 注意：右侧「数量级」下拉不是数据里的 unit 字段（unit 是 g/mL、mg/kg 这类计量单位），
 * 它不单独入库，只参与前端取值换算。
 *
 * 对外是标准受控组件：value / onChange 收发的都是换算后的 0~1 float，
 * 因此既能直接用在 antd Form.Item 里，也能用在手写的 record/onChange 表单里。
 *
 * @param {number|string|null} value 换算后的最终值（0~1）
 * @param {(v:number|null)=>void} onChange
 * @param {boolean} disabled
 * @param {string} status antd 校验态（"error" 等），透传给尾数输入框
 * @param {string} placeholder 尾数输入框占位符
 * @param {boolean} showActual 是否在下方显示换算后的「实际值」，方便用户核对小数点
 */
const ScientificInput = ({
    value,
    onChange,
    disabled = false,
    status,
    placeholder = "数值",
    className = "",
    showActual = false,
}) => {
    // 指数属于组件自身的展示状态：外部只认换算后的最终值，
    // 同一个 0.006 既可以是 6×10⁻³ 也可以是 60×10⁻⁴，不该因为回显而强行改写用户的选择。
    const [exponent, setExponent] = useState(
        () => decomposeScientific(value).exponent,
    );
    const [mantissa, setMantissa] = useState(
        () => decomposeScientific(value).mantissa,
    );

    // 外部值变化时（打开编辑弹窗、表单重置等）重新拆解；
    // 若外部值与当前 尾数×指数 已经一致，就不动用户正在编辑的指数。
    useEffect(() => {
        const current = composeScientific(mantissa, exponent);
        const next =
            value === null || value === undefined || value === ""
                ? null
                : Number(Number(value).toFixed(MAX_DECIMALS));
        if (current === next) return;
        const d = decomposeScientific(value, exponent);
        setMantissa(d.mantissa);
        setExponent(d.exponent);
        // 只跟随外部值变化，不能把 mantissa/exponent 加进依赖（会和用户输入互相打架）
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const emit = (m, e) => {
        onChange?.(composeScientific(m, e));
    };

    return (
        <div className={`w-full ${className}`}>
            {/* 数量级下拉给固定宽度、尾数占剩余空间：
                按百分比分配时，窄容器（如成分表的表格单元格）里下拉会被压到 40px 左右，
                10⁻⁸ 这种标签直接被裁掉只剩箭头。 */}
            <Space.Compact className="w-full">
                <InputNumber
                    style={{ width: `calc(100% - ${EXPONENT_WIDTH}px)` }}
                    min={0}
                    value={mantissa}
                    onChange={(m) => {
                        setMantissa(m);
                        emit(m, exponent);
                    }}
                    disabled={disabled}
                    status={status}
                    placeholder={placeholder}
                />
                <Select
                    style={{ width: EXPONENT_WIDTH }}
                    value={exponent}
                    onChange={(e) => {
                        setExponent(e);
                        emit(mantissa, e);
                    }}
                    disabled={disabled}
                    options={EXPONENTS.map((e) => ({
                        label: formatExponentLabel(e),
                        value: e,
                    }))}
                />
            </Space.Compact>
            {/* 把换算结果显式写出来，避免用户对着 尾数×数量级 心算小数点。
                超出后端 8 位小数精度时会四舍五入，这种情况必须让用户看见。 */}
            {showActual &&
                (() => {
                    const actual = composeScientific(mantissa, exponent);
                    const rounded = isScientificRounded(mantissa, exponent);
                    if (!rounded) {
                        return (
                            <div className="text-[11px] text-slate-400 leading-tight mt-1">
                                实际值 {formatDecimal(actual)}
                            </div>
                        );
                    }
                    const exact = exactDecimalString(mantissa, exponent);
                    return (
                        <Tooltip
                            title={`后端最多保留 ${MAX_DECIMALS} 位小数，${exact} 已四舍五入为 ${formatDecimal(actual)}`}
                        >
                            <div className="text-[11px] text-amber-600 leading-tight mt-1 cursor-help">
                                <InfoCircleOutlined className="mr-1" />
                                实际值 {formatDecimal(actual)}（已四舍五入）
                            </div>
                        </Tooltip>
                    );
                })()}
        </div>
    );
};

export default ScientificInput;
