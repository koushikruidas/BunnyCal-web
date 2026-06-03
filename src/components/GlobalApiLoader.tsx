import { useEffect } from "react";
import { useNetworkActivity } from "@/lib/networkActivity";

export function GlobalApiLoader() {
  const { visible, pendingCount } = useNetworkActivity();

  useEffect(() => {
    document.body.classList.toggle("api-loader-open", visible);
    return () => {
      document.body.classList.remove("api-loader-open");
    };
  }, [visible]);

  return (
    <div
      className={`api-loader-shell${visible ? " is-visible" : ""}`}
      aria-hidden={visible ? undefined : "true"}
      data-visible={visible ? "true" : "false"}
      data-pending-count={pendingCount}
    >
      <div className="api-loader-backdrop" />
      <div className="api-loader" role="status" aria-live="polite" aria-label="Loading bunnyCal">
        <div className="api-loader-stage" aria-hidden="true">
          <span className="api-loader-aura" />
          <span className="api-loader-orbit"><i /><i /><i /></span>
          <div className="api-loader-bob">
            <div className="api-loader-shadow" />
            <div className="api-loader-bunny">
              <div className="api-loader-ear left"><span className="inner" /></div>
              <div className="api-loader-ear right"><span className="inner" /></div>
              <div className="api-loader-body"><span className="api-loader-belly" /></div>
              <div className="api-loader-paw left" />
              <div className="api-loader-paw right" />
              <div className="api-loader-head">
                <span className="api-loader-cheek left" />
                <span className="api-loader-cheek right" />
                <span className="api-loader-eye left" />
                <span className="api-loader-eye right" />
                <span className="api-loader-nose" />
              </div>
            </div>
          </div>
        </div>

        <div className="api-loader-word">
          <span className="api-loader-wm">bunny<b>Cal</b></span>
          <span className="api-loader-track"><span className="api-loader-fill" /></span>
          <span className="api-loader-cap">Hopping things into place<span className="api-loader-dots" /></span>
        </div>
      </div>
    </div>
  );
}
