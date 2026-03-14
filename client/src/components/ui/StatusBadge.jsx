import { statusStyle } from '../../utils/helpers';

export default function StatusBadge({ status }) {
  const { bg, text, label } = statusStyle(status);
  return (
    <span className={`badge ${bg} ${text} uppercase tracking-wide`}>
      {label}
    </span>
  );
}
