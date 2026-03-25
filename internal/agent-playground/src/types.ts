export type AgentType =
  | 'summary'
  | 'reflection'
  | 'nudge'
  | 'chef'
  | 'onboarding'
  | 'reentry'
  | 'shopping'
  | 'inspire';

export type ScoreKey =
  | 'toneFidelity'
  | 'specificity'
  | 'pressureDiscipline'
  | 'dignityPreservation'
  | 'practicalUsefulness'
  | 'inferenceDiscipline'
  | 'creepinessRisk';

export type Verdict = 'pass' | 'revise' | 'fail';

export interface ScoreSet {
  toneFidelity: number;
  specificity: number;
  pressureDiscipline: number;
  dignityPreservation: number;
  practicalUsefulness: number;
  inferenceDiscipline: number;
  creepinessRisk: number;
}

export interface ScenarioPreset {
  id: string;
  agentType: AgentType;
  label: string;
  scenarioText: string;
}

export interface CandidateResponse {
  id: string;
  label: 'A' | 'B' | 'C';
  styleLabel?: string;
  styleDescription?: string;
  outputText: string;
  bannedPhrases: string[];
  autoScores?: ScoreSet;
  manualScores: ScoreSet;
  notes: string;
  verdict: Verdict;
  preferred: boolean;
}
