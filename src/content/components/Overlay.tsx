import InsightsPanel from "../../shared/InsightsPanel";
import type { VideoData } from "../../shared/metrics";

interface OverlayProps {
  data: VideoData | null;
  onClose: () => void;
}

// On-page modal. All UI + logic lives in the shared InsightsPanel (also used by the popup).
const Overlay = ({ data, onClose }: OverlayProps) => (
  <InsightsPanel data={data} onClose={onClose} variant="modal" />
);

export default Overlay;
