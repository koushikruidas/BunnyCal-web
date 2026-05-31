import clsx from "@/lib/clsx";
import "./bunny-mascot.css";

interface BunnyMascotProps {
  className?: string;
  happy?: boolean;
}

export function BunnyMascot({ className, happy = false }: BunnyMascotProps) {
  return (
    <div className={clsx("bcm-wrap", className)}>
      <div className={clsx("bcm-bob", happy && "is-happy")}>
        <div className="bcm-shadow" />
        <div className="bcm-bunny">
          <div className="bcm-ear left"><span className="inner" /></div>
          <div className="bcm-ear right"><span className="inner" /></div>
          <div className="bcm-body"><span className="bcm-belly" /></div>
          <div className="bcm-paw left" />
          <div className="bcm-paw right" />
          <div className="bcm-head">
            <span className="bcm-cheek left" />
            <span className="bcm-cheek right" />
            <span className="bcm-eye left" />
            <span className="bcm-eye right" />
            <span className="bcm-nose" />
          </div>
        </div>
      </div>
    </div>
  );
}
