function emit(level, event) {
    if (!import.meta.env.DEV)
        return;
    const payload = {
        category: event.category,
        message: event.message,
        ...(event.details ? { details: event.details } : {}),
    };
    if (level === "error") {
        console.error("[ops]", payload);
        return;
    }
    console.warn("[ops]", payload);
}
export const opsLogger = {
    warn(event) {
        emit("warn", event);
    },
    error(event) {
        emit("error", event);
    },
};
