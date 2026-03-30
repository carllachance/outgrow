import { useState } from 'react';
import type { StoredFocusArea, StoredSupportItem } from '../../types';

type SupportFrameworkSurfaceProps = {
  focusAreas: StoredFocusArea[];
  supportItems: StoredSupportItem[];
  focusAreaById: Map<string, StoredFocusArea>;
  onPauseSupport: (supportItemId: string) => void;
  onRetireSupport: (supportItemId: string) => void;
  onActivateSupport: (supportItemId: string) => void;
  onEditSupport: (supportItemId: string, nextText: string) => void;
  emptySupportMessage?: string;
};

const SUPPORT_TYPE_LABEL: Record<StoredSupportItem['type'], string> = {
  planning: 'Plan',
  reminder: 'Reminder',
  fallback: 'Fallback',
  check_in: 'Check-in',
  reflection: 'Reflection',
  environment_cue: 'Cue',
  recovery: 'Recovery',
  encouragement: 'Encouragement'
};

const SupportItemCard = ({
  item,
  focusLabel,
  onPauseSupport,
  onRetireSupport,
  onActivateSupport,
  onEditSupport
}: {
  item: StoredSupportItem;
  focusLabel?: string;
  onPauseSupport: (supportItemId: string) => void;
  onRetireSupport: (supportItemId: string) => void;
  onActivateSupport: (supportItemId: string) => void;
  onEditSupport: (supportItemId: string, nextText: string) => void;
}) => {
  const [showWhy, setShowWhy] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [editDraft, setEditDraft] = useState(item.text);

  return (
    <article className={`support-item-card support-item-${item.status}`}>
      <div className="support-item-body">
        <p className="support-item-meta">
          <span>{SUPPORT_TYPE_LABEL[item.type]}</span>
          {focusLabel ? <span>for {focusLabel}</span> : null}
        </p>
        {isEditing ? (
          <>
            <textarea
              className="support-item-edit"
              value={editDraft}
              rows={2}
              onChange={(event) => setEditDraft(event.target.value)}
            />
            <div className="support-item-controls">
              <button
                type="button"
                className="support-quiet-button"
                onClick={() => {
                  onEditSupport(item.id, editDraft);
                  setIsEditing(false);
                }}
              >
                Save
              </button>
              <button
                type="button"
                className="support-quiet-button"
                onClick={() => {
                  setEditDraft(item.text);
                  setIsEditing(false);
                }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <p className="support-item-text">{item.text}</p>
        )}
        {showWhy && item.whyThisExists ? <p className="support-item-why">{item.whyThisExists}</p> : null}
      </div>
      {isEditing ? null : (
        <div className="support-item-controls">
          <button type="button" className="support-link-button" onClick={() => setShowActions((current) => !current)}>
            {showActions ? 'Close' : 'Adjust'}
          </button>
          {item.whyThisExists ? (
            <button type="button" className="support-link-button" onClick={() => setShowWhy((current) => !current)}>
              {showWhy ? 'Hide note' : "Why it's here"}
            </button>
          ) : null}
        </div>
      )}
      {showActions && !isEditing ? (
        <div className="support-item-controls support-item-controls-secondary">
          <button
            type="button"
            className="support-link-button"
            onClick={() => {
              setIsEditing(true);
              setShowActions(false);
            }}
          >
            Edit wording
          </button>
          {item.status === 'active' ? (
            <button type="button" className="support-link-button" onClick={() => onPauseSupport(item.id)}>
              Pause for now
            </button>
          ) : (
            <button type="button" className="support-link-button" onClick={() => onActivateSupport(item.id)}>
              Use again
            </button>
          )}
          {item.status !== 'retired' ? (
            <button type="button" className="support-link-button" onClick={() => onRetireSupport(item.id)}>
              Remove
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
};

export const SupportFrameworkSurface = ({
  focusAreas,
  supportItems,
  focusAreaById,
  onPauseSupport,
  onRetireSupport,
  onActivateSupport,
  onEditSupport,
  emptySupportMessage = 'No supports yet. We can start simple when you are ready.'
}: SupportFrameworkSurfaceProps) => {
  const activeFocusAreas = focusAreas.slice(0, 6);
  const activeSupports = supportItems.filter((item) => item.status !== 'retired');

  return (
    <section className="support-framework-surface" aria-label="Focus areas and supports">
      {activeFocusAreas.length ? (
        <div className="support-framework-block">
          <h3 className="support-framework-title">Focus right now</h3>
          <div className="focus-area-chip-row" role="list">
            {activeFocusAreas.map((focusArea) => (
              <span className="focus-area-chip" key={focusArea.id} role="listitem">
                {focusArea.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="support-framework-block">
        <h3 className="support-framework-title">If it helps</h3>
        {activeSupports.length ? (
          <div className="support-item-list">
            {activeSupports.map((supportItem) => (
              <SupportItemCard
                key={supportItem.id}
                item={supportItem}
                focusLabel={focusAreaById.get(supportItem.focusAreaId)?.label}
                onPauseSupport={onPauseSupport}
                onRetireSupport={onRetireSupport}
                onActivateSupport={onActivateSupport}
                onEditSupport={onEditSupport}
              />
            ))}
          </div>
        ) : (
          <p className="muted">{emptySupportMessage}</p>
        )}
      </div>
    </section>
  );
};
