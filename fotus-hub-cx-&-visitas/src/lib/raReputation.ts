import type { RACase } from '../types';

export interface RaReputation {
  responseRate: number;
  solutionRate: number;
  customerScore: number | null;
  wouldDoBusinessRate: number | null;
  finalScore: number | null;
  evaluatedCases: number;
  classification: 'Ótima' | 'Boa' | 'Regular' | 'Ruim' | 'Não recomendada' | 'Sem avaliações';
}

export function percentValue(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, value <= 10 ? value * 10 : value));
}

function hasLegacySwappedEvaluation(item: RACase) {
  const response = item.indicatorIR;
  const solution = item.indicatorIS;
  return (typeof response === 'number' && response > 0 && response <= 10)
    || (typeof solution === 'number' && solution > 0 && solution <= 10);
}

export function customerScoreValue(item: RACase) {
  const value = hasLegacySwappedEvaluation(item) ? item.indicatorIN : item.indicatorMA;
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(10, value > 10 ? value / 10 : value));
}

export function wouldDoBusinessValue(item: RACase) {
  const percentage = percentValue(hasLegacySwappedEvaluation(item) ? item.indicatorMA : item.indicatorIN);
  return percentage === null ? null : percentage >= 50;
}

export function classifyRaScore(score: number | null, responseRate: number) : RaReputation['classification'] {
  if (score === null) return 'Sem avaliações';
  if (score < 5 || responseRate < 50) return 'Não recomendada';
  if (score < 6) return 'Ruim';
  if (score < 7) return 'Regular';
  if (score < 8) return 'Boa';
  return 'Ótima';
}

export function calculateRaReputation(cases: RACase[]): RaReputation {
  const total = cases.length;
  const responseRate = total ? (cases.filter((item) => item.status !== 'Aberto').length / total) * 100 : 0;
  const solutionRate = total ? (cases.filter((item) => item.status === 'Resolvido').length / total) * 100 : 0;
  const scores = cases.map(customerScoreValue).filter((value): value is number => value !== null);
  const recommendations = cases.map(wouldDoBusinessValue).filter((value): value is boolean => value !== null);
  const customerScore = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;
  const wouldDoBusinessRate = recommendations.length
    ? (recommendations.filter(Boolean).length / recommendations.length) * 100
    : null;
  const finalScore = customerScore === null || wouldDoBusinessRate === null
    ? null
    : ((responseRate * 2) + (customerScore * 10 * 3) + (solutionRate * 3) + (wouldDoBusinessRate * 2)) / 100;

  return {
    responseRate,
    solutionRate,
    customerScore,
    wouldDoBusinessRate,
    finalScore,
    evaluatedCases: Math.min(scores.length, recommendations.length),
    classification: classifyRaScore(finalScore, responseRate),
  };
}

export function calculateSingleRaScore(status: RACase['status'], customerScore: number | null, wouldDoBusiness: boolean | null) {
  if (customerScore === null || wouldDoBusiness === null) return null;
  const responseRate = status === 'Aberto' ? 0 : 100;
  const solutionRate = status === 'Resolvido' ? 100 : 0;
  return ((responseRate * 2) + (customerScore * 10 * 3) + (solutionRate * 3) + ((wouldDoBusiness ? 100 : 0) * 2)) / 100;
}
