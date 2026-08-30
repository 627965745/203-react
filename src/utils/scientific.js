// V5: concentration / uncertainty 的科学计数法换算。
//
// 后端把这两个字段统一成 0~1 的 float（最多 8 位小数）。直接让用户填 0.0000045
// 这种数极易数错小数点，所以界面上拆成两段：尾数 × 数量级(10 的负幂次)，
// 实际存储值 = 尾数 × 10^(-指数)，例如 6 配 10⁻³ => 6 × 10⁻³ = 0.006。
//
// 注意：这里的「数量级」只是录入辅助，不入库，也不是数据里的 unit 字段
// （unit 是 g/mL、mg/kg 这类计量单位）。

// 后端精度上限：8 位小数
export const MAX_DECIMALS = 8;

// 数量级下拉可选值：10⁻¹ ~ 10⁻⁸（数组里存的是正整数指数 1~8）
export const EXPONENTS = Array.from({ length: MAX_DECIMALS }, (_, i) => i + 1);

// 空值时数量级的默认档位：10⁻⁴（新建表单一打开就是这一档）
export const DEFAULT_EXPONENT = 4;

// 上标数字，用来把 10^-3 渲染成 10⁻³。用 Unicode 上标而不是 <sup>，
// 这样同一套写法在下拉选项、已选值、表格单元格、Tooltip 里都能直接当字符串用。
const SUPERSCRIPT_DIGITS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

/** 数字 -> 上标字符串，例如 -3 => "⁻³" */
export const toSuperscript = (n) =>
    String(n)
        .split("")
        .map((ch) =>
            ch === "-" ? "⁻" : (SUPERSCRIPT_DIGITS[Number(ch)] ?? ch),
        )
        .join("");

/** 数量级下拉的显示文案：指数 3 => "10⁻³" */
export const formatExponentLabel = (exponent) =>
    `10${toSuperscript(-exponent)}`;

/**
 * 四舍五入到指定小数位。
 *
 * 不能直接用 toFixed：0.000000045 在 IEEE754 里实际是 4.4999999999999997e-8，
 * (0.000000045).toFixed(8) 会得到 "0.00000004"（往下舍），与用户预期的 0.00000005 不符。
 * 这里借助字符串形式的指数移位来做，绕开浮点表示误差。
 */
export const roundHalfUp = (num, dp) => {
    if (!Number.isFinite(num)) return num;
    const shifted = (num + "e").split("e");
    const rounded = Math.round(Number(`${shifted[0]}e${Number(shifted[1] || 0) + dp}`));
    const back = (rounded + "e").split("e");
    return Number(`${back[0]}e${Number(back[1] || 0) - dp}`);
};

/**
 * 尾数 + 指数 -> 精确的十进制字符串（不做任何舍入）。
 * 纯字符串移位，用来在提示里展示「舍入前的原值」。
 */
export const exactDecimalString = (mantissa, exponent) => {
    if (mantissa === null || mantissa === undefined || mantissa === "")
        return null;
    let str = String(mantissa);
    if (!/^-?\d*\.?\d+$/.test(str)) return null; // 指数形式等异常输入交给调用方兜底
    const negative = str.startsWith("-");
    if (negative) str = str.slice(1);
    const [intPart, fracPart = ""] = str.split(".");
    const digits = intPart + fracPart;
    const pointPos = intPart.length - exponent;
    let out =
        pointPos <= 0
            ? `0.${"0".repeat(-pointPos)}${digits}`
            : `${digits.slice(0, pointPos)}.${digits.slice(pointPos)}`;
    if (out.includes(".")) out = out.replace(/0+$/, "").replace(/\.$/, "");
    return `${negative ? "-" : ""}${out || "0"}`;
};

/** 该「尾数 × 数量级」组合是否超出后端精度、需要四舍五入 */
export const isScientificRounded = (mantissa, exponent) => {
    if (mantissa === null || mantissa === undefined || mantissa === "")
        return false;
    const exact = exactDecimalString(mantissa, exponent);
    if (exact === null) return false;
    const dot = exact.indexOf(".");
    const decimals = dot === -1 ? 0 : exact.length - dot - 1;
    return decimals > MAX_DECIMALS;
};

/** 尾数 + 指数 -> 最终值。用字符串构造避免 6 * 0.001 这类浮点误差 */
export const composeScientific = (mantissa, exponent) => {
    if (mantissa === null || mantissa === undefined || mantissa === "")
        return null;
    const m = Number(mantissa);
    if (!Number.isFinite(m)) return null;
    const composed = Number(`${m}e-${exponent}`);
    if (!Number.isFinite(composed)) return null;
    // 后端只保留 8 位小数，超出部分四舍五入（0.000000045 -> 0.00000005）
    return roundHalfUp(composed, MAX_DECIMALS);
};

/** 最终值 -> 尾数 + 指数。优先选让尾数落在 [1,10) 的指数（标准科学计数法） */
export const decomposeScientific = (value, fallbackExponent = DEFAULT_EXPONENT) => {
    if (value === null || value === undefined || value === "")
        return { mantissa: null, exponent: fallbackExponent };
    const num = Number(value);
    if (!Number.isFinite(num))
        return { mantissa: null, exponent: fallbackExponent };
    if (num === 0) return { mantissa: 0, exponent: fallbackExponent };

    let exponent = Math.min(
        MAX_DECIMALS,
        Math.max(1, -Math.floor(Math.log10(Math.abs(num)))),
    );
    const mantissaAt = (e) =>
        Number((num * Math.pow(10, e)).toFixed(MAX_DECIMALS));
    let mantissa = mantissaAt(exponent);
    // log10 在边界上会有浮点抖动，用两个方向的兜底把尾数拉回 [1,10)
    while (Math.abs(mantissa) >= 10 && exponent > 1) {
        exponent -= 1;
        mantissa = mantissaAt(exponent);
    }
    while (Math.abs(mantissa) < 1 && exponent < MAX_DECIMALS) {
        exponent += 1;
        mantissa = mantissaAt(exponent);
    }
    return { mantissa, exponent };
};

/**
 * 「实际值」提示用：把 0~1 的 float 渲染成普通小数字符串。
 * 直接 String(0.00000002) 会得到 JS 自己的 "2e-8"，反而更难认，
 * 所以按后端精度补齐再去掉尾随 0。
 */
export const formatDecimal = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const num = Number(value);
    if (!Number.isFinite(num)) return "-";
    if (num === 0) return "0";
    const fixed = roundHalfUp(num, MAX_DECIMALS).toFixed(MAX_DECIMALS);
    return fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
};

/** 列表展示用：把 0~1 的 float 渲染成 6×10⁻³ 这种科学计数法写法 */
export const formatScientific = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const num = Number(value);
    if (!Number.isFinite(num)) return "-";
    if (num === 0) return "0";
    // 下拉的指数范围是 1~8，decomposeScientific 会把 1 拆成 10×10⁻¹；
    // 纯展示不受该范围约束，直接写成 1 更自然（字段上限就是 1）。
    if (num >= 1) return String(num);
    const { mantissa, exponent } = decomposeScientific(num);
    return `${mantissa}×${formatExponentLabel(exponent)}`;
};
