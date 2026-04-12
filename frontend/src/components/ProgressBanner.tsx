type ProgressBannerProps = {
  progress: number;
  completedTopics: number;
  totalTopics: number;
  completedEvals: number;
  totalEvals: number;
};

const ProgressBanner = ({
  progress,
  completedTopics,
  totalTopics,
  completedEvals,
  totalEvals,
}: ProgressBannerProps) => {
  const progressPercent = Math.round(progress * 100);
  const ringRadius = 34;
  const ringCirc = 2 * Math.PI * ringRadius;
  const ringOffset = ringCirc - progress * ringCirc;

  return (
    <div className="disc-progress-banner">
      <div className="disc-progress-ring">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <defs>
            <linearGradient id="disc-progress-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--primary-container)" />
            </linearGradient>
          </defs>
          <circle className="disc-progress-ring-bg" cx="40" cy="40" r={ringRadius} />
          <circle
            className="disc-progress-ring-fill"
            cx="40"
            cy="40"
            r={ringRadius}
            strokeDasharray={ringCirc}
            strokeDashoffset={ringOffset}
          />
        </svg>
        <span className="disc-progress-ring-label">{progressPercent}%</span>
      </div>
      <div className="disc-progress-details">
        <div className="disc-progress-stat">
          <span className="disc-progress-stat-value">{completedTopics}/{totalTopics}</span>
          <span className="disc-progress-stat-label">Tópicos concluídos</span>
        </div>
        <div className="disc-progress-stat">
          <span className="disc-progress-stat-value">{completedEvals}/{totalEvals}</span>
          <span className="disc-progress-stat-label">Avaliações concluídas</span>
        </div>
      </div>
    </div>
  );
};

export default ProgressBanner;
