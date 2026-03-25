import { AGENTS, SCENARIO_PRESETS } from './presets.js';
import { generateCandidates, SCORE_KEYS } from './mockGenerator.js';

const STORAGE_KEY = 'outgrow_agent_playground_state_v1';

const scoreLabels = {
  toneFidelity: 'Tone fidelity',
  specificity: 'Specificity',
  pressureDiscipline: 'Pressure discipline',
  dignityPreservation: 'Dignity preservation',
  practicalUsefulness: 'Practical usefulness',
  inferenceDiscipline: 'Inference discipline',
  creepinessRisk: 'Creepiness risk',
};

const state = {
  agentType: 'summary',
  scenarioId: '',
  scenarioText: '',
  candidateCount: 3,
  regenerateCount: 0,
  candidates: [],
  evaluatorNotes: '',
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    Object.assign(state, saved);
  } catch (error) {
    console.warn('Failed to parse saved state', error);
  }
}

function persistState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      agentType: state.agentType,
      scenarioId: state.scenarioId,
      scenarioText: state.scenarioText,
      candidateCount: state.candidateCount,
      evaluatorNotes: state.evaluatorNotes,
    })
  );
}

function filteredPresets() {
  return SCENARIO_PRESETS.filter((preset) => preset.agentType === state.agentType);
}

function defaultScenario() {
  const first = filteredPresets()[0];
  return first ? first.scenarioText : '';
}

function generate() {
  const scenario = state.scenarioText.trim();
  if (!scenario) {
    return;
  }
  state.regenerateCount += 1;
  const seed = `${Date.now()}-${state.regenerateCount}-${Math.random()}`;
  state.candidates = generateCandidates(state.agentType, scenario, state.candidateCount, seed);
  render();
}

function clearAll() {
  state.candidates = [];
  state.scenarioText = '';
  state.scenarioId = '';
  render();
}

function copyPromptContext() {
  const payload = `Agent: ${state.agentType}\nScenario: ${state.scenarioText}`;
  navigator.clipboard.writeText(payload);
}

function copyCandidate(text) {
  navigator.clipboard.writeText(text);
}

function setPreferred(candidateId) {
  state.candidates = state.candidates.map((candidate) => ({
    ...candidate,
    preferred: candidate.id === candidateId,
  }));
  render();
}

function updateCandidate(candidateId, patch) {
  state.candidates = state.candidates.map((candidate) =>
    candidate.id === candidateId ? { ...candidate, ...patch } : candidate
  );
  render();
}

function updateScore(candidateId, key, value) {
  state.candidates = state.candidates.map((candidate) => {
    if (candidate.id !== candidateId) {
      return candidate;
    }
    return {
      ...candidate,
      manualScores: {
        ...candidate.manualScores,
        [key]: Number(value),
      },
    };
  });
  render();
}

function scoreSummary(scores) {
  const values = Object.values(scores);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return avg.toFixed(1);
}

function render() {
  persistState();

  const app = document.getElementById('app');
  app.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'playground';

  const header = document.createElement('header');
  header.className = 'topbar';
  header.innerHTML = `
    <div>
      <h1>Outgrow Agent Playground</h1>
      <p>Internal quality testing surface for side-by-side candidate comparisons.</p>
    </div>
    <div class="actions">
      <button id="generateBtn">Generate</button>
      <button id="rerunBtn">Regenerate</button>
      <button id="clearBtn" class="ghost">Clear</button>
      <button id="copyContextBtn" class="ghost">Copy prompt context</button>
    </div>
  `;

  const main = document.createElement('div');
  main.className = 'layout';

  const sidebar = document.createElement('section');
  sidebar.className = 'sidebar panel';

  const agentSelect = AGENTS.map(
    (agent) =>
      `<option value="${agent.value}" ${agent.value === state.agentType ? 'selected' : ''}>${agent.label}</option>`
  ).join('');

  const presets = filteredPresets()
    .map(
      (preset) => `<option value="${preset.id}" ${preset.id === state.scenarioId ? 'selected' : ''}>${preset.label}</option>`
    )
    .join('');

  sidebar.innerHTML = `
    <h2>Scenario setup</h2>
    <label>Agent
      <select id="agentType">${agentSelect}</select>
    </label>
    <label>Preset
      <select id="scenarioPreset">
        <option value="">Custom scenario...</option>
        ${presets}
      </select>
    </label>
    <label>Candidate count
      <select id="candidateCount">
        <option value="2" ${state.candidateCount === 2 ? 'selected' : ''}>2 candidates</option>
        <option value="3" ${state.candidateCount === 3 ? 'selected' : ''}>3 candidates</option>
      </select>
    </label>
    <label>Scenario text
      <textarea id="scenarioText" rows="12" placeholder="Type a scenario to test...">${state.scenarioText}</textarea>
    </label>
    <button id="duplicateScenario" class="ghost">Duplicate scenario text</button>
  `;

  const content = document.createElement('section');
  content.className = 'content';

  const grid = document.createElement('div');
  grid.className = `cards cards-${state.candidateCount}`;

  if (!state.candidates.length) {
    const empty = document.createElement('div');
    empty.className = 'panel empty';
    empty.textContent = 'No candidates generated yet. Select an agent + scenario, then click Generate.';
    content.appendChild(empty);
  } else {
    state.candidates.forEach((candidate) => {
      const card = document.createElement('article');
      card.className = `card panel ${candidate.preferred ? 'preferred' : ''}`;

      const scoreInputs = SCORE_KEYS.map(
        (key) => `
        <label>${scoreLabels[key]}
          <select data-score-key="${key}">
            ${[1, 2, 3, 4, 5]
              .map((score) => `<option value="${score}" ${candidate.manualScores[key] === score ? 'selected' : ''}>${score}</option>`)
              .join('')}
          </select>
        </label>
      `
      ).join('');

      card.innerHTML = `
        <div class="card-head">
          <h3>Candidate ${candidate.label}</h3>
          ${candidate.preferred ? '<span class="badge">Preferred</span>' : ''}
        </div>
        <div class="style-tag">${candidate.styleLabel || 'Default'} · ${candidate.styleDescription || 'balanced variation'}</div>
        <p class="response">${candidate.outputText}</p>
        <div class="meta">Quick score: <strong>${scoreSummary(candidate.manualScores)}</strong> / 5</div>
        <div class="flags ${candidate.bannedPhrases.length ? 'warn' : 'ok'}">
          ${candidate.bannedPhrases.length ? `⚠️ Banned phrase flags: ${candidate.bannedPhrases.join(', ')}` : 'No banned phrase flags'}
        </div>
        <div class="controls">
          <button data-action="prefer">Preferred</button>
          <button data-action="reject" class="ghost">Reject</button>
          <button data-action="copy" class="ghost">Copy</button>
        </div>
        <div class="scores">${scoreInputs}</div>
        <label>Notes
          <textarea data-action="notes" rows="3" placeholder="Quick evaluator notes...">${candidate.notes || ''}</textarea>
        </label>
        <label>Verdict
          <select data-action="verdict">
            <option value="pass" ${candidate.verdict === 'pass' ? 'selected' : ''}>Pass</option>
            <option value="revise" ${candidate.verdict === 'revise' ? 'selected' : ''}>Revise</option>
            <option value="fail" ${candidate.verdict === 'fail' ? 'selected' : ''}>Fail</option>
          </select>
        </label>
      `;

      card.querySelector('[data-action="prefer"]').onclick = () => setPreferred(candidate.id);
      card.querySelector('[data-action="reject"]').onclick = () => updateCandidate(candidate.id, { preferred: false, verdict: 'fail' });
      card.querySelector('[data-action="copy"]').onclick = () => copyCandidate(candidate.outputText);
      card.querySelector('[data-action="notes"]').oninput = (event) =>
        updateCandidate(candidate.id, { notes: event.target.value });
      card.querySelector('[data-action="verdict"]').onchange = (event) =>
        updateCandidate(candidate.id, { verdict: event.target.value });

      card.querySelectorAll('[data-score-key]').forEach((select) => {
        select.onchange = (event) => updateScore(candidate.id, event.target.dataset.scoreKey, event.target.value);
      });

      grid.appendChild(card);
    });

    content.appendChild(grid);
  }

  const notesPanel = document.createElement('section');
  notesPanel.className = 'panel';
  notesPanel.innerHTML = `
    <h2>Consolidated evaluator notes</h2>
    <textarea id="evaluatorNotes" rows="4" placeholder="Cross-candidate notes, recommendation, or model-side improvements...">${state.evaluatorNotes}</textarea>
  `;
  content.appendChild(notesPanel);

  main.append(sidebar, content);
  container.append(header, main);
  app.appendChild(container);

  document.getElementById('generateBtn').onclick = generate;
  document.getElementById('rerunBtn').onclick = generate;
  document.getElementById('clearBtn').onclick = clearAll;
  document.getElementById('copyContextBtn').onclick = copyPromptContext;

  document.getElementById('agentType').onchange = (event) => {
    state.agentType = event.target.value;
    const presetsForAgent = filteredPresets();
    state.scenarioId = presetsForAgent[0]?.id || '';
    state.scenarioText = presetsForAgent[0]?.scenarioText || '';
    state.candidates = [];
    render();
  };

  document.getElementById('scenarioPreset').onchange = (event) => {
    state.scenarioId = event.target.value;
    const preset = SCENARIO_PRESETS.find((item) => item.id === state.scenarioId);
    if (preset) {
      state.scenarioText = preset.scenarioText;
    }
    render();
  };

  document.getElementById('candidateCount').onchange = (event) => {
    state.candidateCount = Number(event.target.value);
    state.candidates = [];
    render();
  };

  document.getElementById('scenarioText').oninput = (event) => {
    state.scenarioText = event.target.value;
    if (state.scenarioId) {
      state.scenarioId = '';
    }
    persistState();
  };

  document.getElementById('duplicateScenario').onclick = () => {
    state.scenarioText = `${state.scenarioText}\n\n${state.scenarioText}`.trim();
    render();
  };

  document.getElementById('evaluatorNotes').oninput = (event) => {
    state.evaluatorNotes = event.target.value;
    persistState();
  };
}

loadState();
if (!state.scenarioText) {
  state.scenarioText = defaultScenario();
  state.scenarioId = filteredPresets()[0]?.id || '';
}
render();
