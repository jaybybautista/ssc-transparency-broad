import React from 'react';
import OfficerAvatar from './OfficerAvatar';
import { splitName } from '../lib/officers';
import './OfficerOrgChart.css';

/* Re-exported so the chart's own test keeps importing it from here, and so
   nothing else has to know the name splitter moved into the officers lib. */
export { splitName };

/**
 * The officers laid out the way the council's printed chart reads.
 *
 * The grid and list views answer "who is on the council"; this one answers
 * "how is it organised" — the shape of the body, tier by tier, which is the
 * thing a printed org chart exists to show and which a flat grid loses.
 *
 * Each officer is a plate: surname across the badge, given name and post
 * beneath. Tapping one opens their details rather than cramming course, year
 * and quote onto a tile that has to stay narrow enough to line up with its
 * neighbours.
 */

const OfficerPlate = ({ officer, onSelect }) => {
  const { surname, given } = splitName(officer.name);

  return (
    <button
      type="button"
      className="orgchart-plate"
      onClick={() => onSelect(officer)}
      aria-label={`${officer.name}, ${officer.position || 'officer'}. Show details`}
    >
      <span className="orgchart-photo">
        {/* The navy arc the printed chart sits every portrait on. */}
        <span className="orgchart-arc" aria-hidden="true" />
        <OfficerAvatar src={officer.image} alt="" />
      </span>

      <span className="orgchart-badge">{surname || officer.name}</span>

      <span className="orgchart-meta">
        {!!given && <span className="orgchart-given">{given}</span>}
        {!!officer.position && <span className="orgchart-post">{officer.position}</span>}
      </span>
    </button>
  );
};

const OfficerOrgChart = ({ divisions, onSelect }) => (
  <div className="orgchart">
    {divisions.map(({ division, officers }) => (
      <section key={division} className="orgchart-tier">
        <h2 className="orgchart-tier-title">
          {/* Two-tone heading, matching the printed chart's split styling. */}
          <span className="orgchart-tier-lead">{division.split(' ')[0]}</span>
          <span className="orgchart-tier-rest">{division.split(' ').slice(1).join(' ')}</span>
        </h2>

        <div className="orgchart-row">
          {officers.map((officer) => (
            <OfficerPlate key={officer.id} officer={officer} onSelect={onSelect} />
          ))}
        </div>
      </section>
    ))}
  </div>
);

export default OfficerOrgChart;
