import InsightsPanel from "../../shared/InsightsPanel";
import type { VideoData } from "../../shared/metrics";

interface OverlayProps {
  data: VideoData | null;
  loading?: boolean;
  onClose: () => void;
}

// On-page modal. All UI + logic lives in the shared InsightsPanel (also used by the popup).
const Overlay = ({ data, loading, onClose }: OverlayProps) => (
  <InsightsPanel
    data={data}
    loading={loading}
    onClose={onClose}
    variant="modal"
  />
);

export default Overlay;
