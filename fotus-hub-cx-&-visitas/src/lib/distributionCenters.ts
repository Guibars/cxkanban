import type { Occurrence } from '../types';

export type DistributionCenterCode =
  | 'PE'
  | 'SC'
  | 'ES'
  | 'SP'
  | 'GO'
  | 'BA'
  | 'PA'
  | 'MT';

// UFs de cobertura informadas pelo time. Há sobreposição: a origem nunca é inferida da entrega.
export const DISTRIBUTION_CENTERS: ReadonlyArray<{
  code: DistributionCenterCode;
  name: string;
  coverage: readonly string[];
}> = [
  {
    code: 'PE',
    name: 'CD Pernambuco',
    coverage: ['AL', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  },
  { code: 'SC', name: 'CD Santa Catarina', coverage: ['PR', 'RS', 'SC'] },
  { code: 'ES', name: 'CD Espírito Santo', coverage: ['ES', 'MG', 'RJ'] },
  { code: 'SP', name: 'CD São Paulo', coverage: ['MG', 'SP'] },
  {
    code: 'GO',
    name: 'CD Goiás',
    coverage: ['AC', 'DF', 'GO', 'MS', 'RO', 'TO'],
  },
  { code: 'BA', name: 'CD Bahia', coverage: ['BA', 'PE'] },
  { code: 'PA', name: 'CD Pará', coverage: ['AM', 'AP', 'PA', 'RR'] },
  { code: 'MT', name: 'CD Mato Grosso', coverage: ['MT'] },
];

export function isDistributionCenterCode(
  value: unknown,
): value is DistributionCenterCode {
  return (
    typeof value === 'string' &&
    DISTRIBUTION_CENTERS.some((center) => center.code === value)
  );
}

export function distributionCenterName(value: unknown) {
  return (
    DISTRIBUTION_CENTERS.find((center) => center.code === value)?.name ||
    'CD não informado'
  );
}

export function distributionCenterStats(items: readonly Occurrence[]) {
  const centers = DISTRIBUTION_CENTERS.map((center) => {
    const records = items.filter(
      (item) => item.distributionCenter === center.code,
    );
    const finalized = records.filter(
      (item) => item.stage === 'Finalizada',
    ).length;
    return {
      ...center,
      count: records.length,
      open: records.length - finalized,
      finalized,
      damageAmount: records.reduce(
        (sum, item) => sum + Math.max(0, Number(item.damageAmount) || 0),
        0,
      ),
    };
  }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));
  const missing = items.filter(
    (item) => !isDistributionCenterCode(item.distributionCenter),
  ).length;
  return {
    centers,
    missing,
    identified: items.length - missing,
    total: items.length,
  };
}
