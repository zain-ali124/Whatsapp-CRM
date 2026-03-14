import { scoreColor } from '../../utils/helpers';

export default function LeadScoreBadge({ score, showLabel = false }) {
  const { bg, text, label } = scoreColor(score);
  return (
    <span className={`badge ${bg} ${text}`}>
      {showLabel ? label : `★ ${score}`}
    </span>
  );
}
