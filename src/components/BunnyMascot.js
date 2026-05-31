import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "@/lib/clsx";
import "./bunny-mascot.css";
export function BunnyMascot({ className, happy = false }) {
    return (_jsx("div", { className: clsx("bcm-wrap", className), children: _jsxs("div", { className: clsx("bcm-bob", happy && "is-happy"), children: [_jsx("div", { className: "bcm-shadow" }), _jsxs("div", { className: "bcm-bunny", children: [_jsx("div", { className: "bcm-ear left", children: _jsx("span", { className: "inner" }) }), _jsx("div", { className: "bcm-ear right", children: _jsx("span", { className: "inner" }) }), _jsx("div", { className: "bcm-body", children: _jsx("span", { className: "bcm-belly" }) }), _jsx("div", { className: "bcm-paw left" }), _jsx("div", { className: "bcm-paw right" }), _jsxs("div", { className: "bcm-head", children: [_jsx("span", { className: "bcm-cheek left" }), _jsx("span", { className: "bcm-cheek right" }), _jsx("span", { className: "bcm-eye left" }), _jsx("span", { className: "bcm-eye right" }), _jsx("span", { className: "bcm-nose" })] })] })] }) }));
}
