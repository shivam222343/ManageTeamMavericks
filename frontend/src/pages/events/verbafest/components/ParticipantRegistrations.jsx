import React from 'react';
import EventBadge from './EventBadge';

/**
 * ParticipantRegistrations
 * Renders badges for a participant's registered events (GD, Debate, Mind Saga).
 * Clearly distinguishes single events and combinations.
 *
 * @param {Object} props
 * @param {boolean|number} props.regGd
 * @param {boolean|number} props.regDebate
 * @param {boolean|number} props.regMindsaga
 * @param {'sm'|'md'} [props.size='sm']
 * @param {boolean} [props.short=true]
 */
const ParticipantRegistrations = ({
  regGd,
  regDebate,
  regMindsaga,
  size = 'sm',
  short = true,
  className = ''
}) => {
  const isGd = Boolean(Number(regGd));
  const isDebate = Boolean(Number(regDebate));
  const isMindSaga = Boolean(Number(regMindsaga));

  const hasAny = isGd || isDebate || isMindSaga;

  if (!hasAny) {
    return (
      <span className="inline-flex items-center text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500">
        None
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {isGd && <EventBadge event="gd" size={size} short={short} />}
      {isDebate && <EventBadge event="debate" size={size} short={short} />}
      {isMindSaga && <EventBadge event="mindsaga" size={size} short={short} />}
    </div>
  );
};

export default ParticipantRegistrations;
