import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Dialog } from "@/ui/controls";
import { Button } from "@/ui/controls";
export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel = "Keep", tone = "neutral", pending = false, onConfirm, onCancel, }) {
    return (_jsx(Dialog, { open: open, onClose: onCancel, dismissible: !pending, title: title, description: description, width: "sm", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", size: "sm", disabled: pending, onClick: onCancel, children: cancelLabel }), _jsx(Button, { variant: tone === "danger" ? "danger" : "primary", size: "sm", loading: pending, onClick: onConfirm, children: confirmLabel })] }) }));
}
