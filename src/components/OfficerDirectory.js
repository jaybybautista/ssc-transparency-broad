import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiArrowDown, FiArrowUp, FiEdit2, FiMail, FiMove, FiSearch, FiShare2, FiTrash2, FiX } from 'react-icons/fi';
import OfficerAvatar from './OfficerAvatar';
import OfficerOrgChart from './OfficerOrgChart';
import OfficerDetailModal from './OfficerDetailModal';
import OrgChartModal from './OrgChartModal';
import ViewToggle from './ViewToggle';
import { matchesQuery } from './AdminSearchBar';
import { useLanguage } from '../context/LanguageContext';
import { groupOfficersByDivision, moveInList, orderUpdates } from '../lib/officers';
import { staggerDelay } from '../lib/stagger';
import './OfficerDirectory.css';

/**
 * The officer directory, in one place.
 *
 * It used to exist twice: the public page under About SSC and the management
 * copy in the admin dashboard, each with its own copy of the division list and
 * its own near-identical card markup differing only in class names. That is why
 * the organisational chart first landed in the admin copy alone, where no
 * student could ever see it.
 */
const OfficerDirectory = ({
  officers = [],
  orgChartUrl = '',
  academicYear = '',
  isAdmin = false,
  onEdit,
  onDelete,
  onReorder,
  headingLevel: Heading = 'h3'
}) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState(() => {
    try {
      return window.localStorage.getItem('officersViewMode') || 'grid';
    } catch {
      return 'grid';
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [arranging, setArranging] = useState(false);
  const [showOrgChart, setShowOrgChart] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState(null);

  useEffect(() => {
    try {
      window.localStorage.setItem('officersViewMode', viewMode);
    } catch {
      /* A browser with storage blocked still switches views, it just forgets. */
    }
  }, [viewMode]);

  // Sections first, then the filters, so the chips can count the whole
  // directory while the grid below shows only what was asked for.
  const allGroups = useMemo(() => groupOfficersByDivision(officers), [officers]);

  const matching = useMemo(() => {
    const term = searchTerm.trim();
    if (!term) return allGroups;
    return allGroups
      .map((group) => ({
        ...group,
        officers: group.officers.filter((officer) =>
          matchesQuery(term, [
            officer.name,
            officer.position,
            officer.division,
            officer.course,
            officer.yearLevel,
            officer.email
          ])
        )
      }))
      .filter((group) => group.officers.length);
  }, [allGroups, searchTerm]);

  const groups = useMemo(
    () => (divisionFilter === 'all' ? matching : matching.filter((g) => g.division === divisionFilter)),
    [matching, divisionFilter]
  );

  const shown = groups.reduce((count, group) => count + group.officers.length, 0);

  /*
   * Arranging is offered only on the full, unfiltered list. Moving somebody
   * "up" inside a set of search results would write an order taken from a list
   * nobody else can see, silently shuffling the officers that were filtered out.
   */
  const canArrange = isAdmin && !!onReorder && !searchTerm.trim();

  useEffect(() => {
    if (!canArrange && arranging) setArranging(false);
  }, [canArrange, arranging]);

  const commit = (ordered) => {
    const updates = orderUpdates(ordered);
    if (updates.length) onReorder(updates);
  };

  const move = (division, index, delta) => {
    const group = allGroups.find((entry) => entry.division === division);
    if (!group) return;
    commit(moveInList(group.officers, index, index + delta));
  };

  /*
   * Dragging.
   *
   * Pointer events rather than HTML5 drag and drop, which does not fire at all
   * on a touch screen: the council arranges the board from a phone as often as
   * from a desk, and a feature that only works with a mouse is not the feature
   * that was asked for. The arrows stay for keyboard use and for precision.
   *
   * The list being dragged is held in a ref as well as in state. The ref is
   * what the drop reads, because a state updater must stay pure and must not
   * be the thing that writes to Firestore.
   */
  const dragRef = useRef(null);
  const dragListRef = useRef(null);
  const [dragList, setDragList] = useState(null);

  const applyDragList = (next) => {
    dragListRef.current = next;
    setDragList(next);
  };

  const beginDrag = (event, division, officerId) => {
    if (typeof event.button === 'number' && event.button !== 0) return;
    const group = allGroups.find((entry) => entry.division === division);
    if (!group) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      division,
      officerId: String(officerId),
      pointerId: event.pointerId,
      // What the section looked like before the finger went down, so a drag
      // that ends where it began can be told apart from one that moved.
      startIds: group.officers.map((officer) => String(officer.id)).join(',')
    };
    applyDragList({ division, officerId: String(officerId), officers: group.officers });
  };

  const onDragMove = (event) => {
    const state = dragRef.current;
    const current = dragListRef.current;
    if (!state || !current || event.pointerId !== state.pointerId) return;

    // The card under the finger, whatever it is now. Positions are recomputed
    // against the working list, so an index cannot go stale mid-drag.
    const card = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-officer-id]');
    if (!card || card.dataset.officerDivision !== state.division) return;

    const from = current.officers.findIndex((officer) => String(officer.id) === state.officerId);
    const to = current.officers.findIndex((officer) => String(officer.id) === card.dataset.officerId);
    if (from < 0 || to < 0 || from === to) return;

    applyDragList({ ...current, officers: moveInList(current.officers, from, to) });
  };

  const endDrag = () => {
    const state = dragRef.current;
    const current = dragListRef.current;
    dragRef.current = null;
    dragListRef.current = null;
    setDragList(null);
    if (!state || !current) return;

    /*
     * Only when something actually moved. Committing regardless would number
     * a whole section on a stray tap, or on a drag that wandered over another
     * section and was rightly ignored: writes nobody asked for, on a record
     * nobody meant to touch.
     */
    const endIds = current.officers.map((officer) => String(officer.id)).join(',');
    if (endIds !== state.startIds) commit(current.officers);
  };

  const renderCard = (officer, index, group) => (
    <div
      key={officer.id}
      className={`officer-card${
        dragList && String(dragList.officerId) === String(officer.id) ? ' is-dragging' : ''
      }`}
      style={{ animationDelay: dragList ? '0s' : staggerDelay(index) }}
      data-officer-id={officer.id}
      data-officer-division={group.division}
    >
      <div className="officer-image">
        <OfficerAvatar src={officer.image} alt={officer.name} />
        {!!officer.email && (
          <div className="officer-overlay">
            <a href={`mailto:${officer.email}`} className="overlay-btn" title={`Email ${officer.name}`}>
              <FiMail />
            </a>
          </div>
        )}
      </div>
      <div className="officer-info">
        <span className="officer-position">{officer.position}</span>
        <h3 className="officer-name">{officer.name}</h3>
        {!!officer.course && <p className="officer-course">{officer.course}</p>}
        {!!officer.yearLevel && <p className="officer-year">{officer.yearLevel}</p>}
      </div>

      {/* Shown only in the list view, where the photo is too small to carry
          the hover overlay the grid uses. */}
      {!!officer.email && (
        <a
          href={`mailto:${officer.email}`}
          className="officer-mail"
          title={`Email ${officer.name}`}
          aria-label={`Email ${officer.name}`}
        >
          <FiMail />
        </a>
      )}

      {arranging && (
        <div className="officer-arrange">
          <button
            type="button"
            className="officer-drag-handle"
            aria-label={`Drag to reorder ${officer.name}`}
            onPointerDown={(event) => beginDrag(event, group.division, officer.id)}
            onPointerMove={onDragMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <FiMove />
          </button>
          <button
            type="button"
            onClick={() => move(group.division, index, -1)}
            disabled={index === 0}
            aria-label={`Move ${officer.name} up`}
          >
            <FiArrowUp />
          </button>
          <span className="officer-arrange-pos">{index + 1}</span>
          <button
            type="button"
            onClick={() => move(group.division, index, 1)}
            disabled={index === group.officers.length - 1}
            aria-label={`Move ${officer.name} down`}
          >
            <FiArrowDown />
          </button>
        </div>
      )}

      {isAdmin && !arranging && (
        <div className="admin-actions">
          <button className="admin-edit-btn" onClick={() => onEdit?.(officer)} aria-label={`Edit ${officer.name}`}>
            <FiEdit2 />
          </button>
          <button
            className="admin-delete-btn"
            onClick={() => onDelete?.(officer.id)}
            aria-label={`Delete ${officer.name}`}
          >
            <FiTrash2 />
          </button>
        </div>
      )}
    </div>
  );

  if (!officers.length) return null;

  return (
    <div className="officer-directory">
      <div className="view-toolbar">
        <span className="view-toolbar-count">
          {officers.length} officer{officers.length === 1 ? '' : 's'}
          {/* Which council this is. Switching to an archived year used to swap
              every name on the page with nothing saying the term had changed. */}
          {!!academicYear && <em className="officer-term">A.Y. {academicYear}</em>}
        </span>
        <div className="view-toolbar-actions">
          {canArrange && (
            <button
              type="button"
              className={`officer-arrange-btn${arranging ? ' is-on' : ''}`}
              onClick={() => setArranging((on) => !on)}
              aria-pressed={arranging}
            >
              <FiMove /> {arranging ? 'Done arranging' : 'Arrange'}
            </button>
          )}
          {/* Only offered once a chart has actually been set. */}
          {!!orgChartUrl && (
            <button type="button" className="orgchart-open-btn" onClick={() => setShowOrgChart(true)}>
              <FiShare2 /> {t('off.seeChart')}
            </button>
          )}
          <ViewToggle value={viewMode} onChange={setViewMode} showChart />
        </div>
      </div>

      {/* Searching used to be an admin-only tool. Forty nine officers is more
          than a student will scroll through to find their own representative. */}
      <div className="officer-finder">
        <div className="officer-search">
          <FiSearch aria-hidden="true" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('off.searchPlaceholder')}
            aria-label={t('off.searchPlaceholder')}
          />
          {!!searchTerm && (
            <button type="button" onClick={() => setSearchTerm('')} aria-label={t('common.close')}>
              <FiX />
            </button>
          )}
        </div>

        <div className="officer-divisions" role="group" aria-label="Filter by section">
          <button
            type="button"
            className={`officer-division-chip${divisionFilter === 'all' ? ' is-active' : ''}`}
            onClick={() => setDivisionFilter('all')}
            aria-pressed={divisionFilter === 'all'}
          >
            {t('common.all')} <span>{officers.length}</span>
          </button>
          {allGroups.map((group) => (
            <button
              key={group.division}
              type="button"
              className={`officer-division-chip${divisionFilter === group.division ? ' is-active' : ''}`}
              onClick={() => setDivisionFilter(group.division)}
              aria-pressed={divisionFilter === group.division}
            >
              {group.division} <span>{group.officers.length}</span>
            </button>
          ))}
        </div>
      </div>

      {arranging && (
        <p className="officer-arrange-note">
          Drag by the handle, or use the arrows, to place officers within a section. The order
          saves as you go and is what students see. An officer added later joins the end of
          their section.
        </p>
      )}

      {!shown && (
        <div className="officer-empty">
          <h3>{t('off.noMatch')}</h3>
          <p>{t('off.noMatchHint')}</p>
        </div>
      )}

      {/* Chart view renders every tier in one frame, so it replaces the
          per-division grids rather than sitting alongside them. */}
      {viewMode === 'chart' && !!shown && (
        <OfficerOrgChart divisions={groups} onSelect={setSelectedOfficer} />
      )}

      {viewMode !== 'chart' &&
        groups.map((group) => {
          /* Mid-drag the section shows the working order, so the cards move
             under the finger rather than jumping once it is let go. */
          const shownGroup =
            dragList && dragList.division === group.division
              ? { ...group, officers: dragList.officers }
              : group;
          return (
            <section key={group.division} className="officer-section">
              <Heading className="officer-section-title">{group.division}</Heading>
              <div
                className={`officers-grid${viewMode === 'list' ? ' is-list' : ''}${
                  dragList && dragList.division === group.division ? ' is-dragging-in' : ''
                }`}
              >
                {shownGroup.officers.map((officer, index) => renderCard(officer, index, shownGroup))}
              </div>
            </section>
          );
        })}

      <OrgChartModal url={showOrgChart ? orgChartUrl : ''} onClose={() => setShowOrgChart(false)} />
      <OfficerDetailModal officer={selectedOfficer} onClose={() => setSelectedOfficer(null)} />
    </div>
  );
};

export default OfficerDirectory;
