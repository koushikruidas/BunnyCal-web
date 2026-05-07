import { useEffect, useRef, useState } from "react";
/** Counts down from `target` ISO timestamp. Calls onExpire once at zero. */
export function useCountdown(targetISO, onExpire) {
    const [remaining, setRemaining] = useState(0);
    const firedRef = useRef(false);
    useEffect(() => {
        if (!targetISO)
            return;
        firedRef.current = false;
        const target = new Date(targetISO).getTime();
        const tick = () => {
            const r = Math.max(0, Math.floor((target - Date.now()) / 1000));
            setRemaining(r);
            if (r === 0 && !firedRef.current) {
                firedRef.current = true;
                onExpire?.();
            }
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [targetISO, onExpire]);
    const mm = Math.floor(remaining / 60);
    const ss = String(remaining % 60).padStart(2, "0");
    return { remaining, mm, ss, formatted: `${mm}:${ss}` };
}
