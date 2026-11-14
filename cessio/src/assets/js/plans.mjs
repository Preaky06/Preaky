import config from './config.mjs';
import { currentPlanId } from './license.mjs';

const ORDER = Object.keys(config.plans); // free, solo, studio

export function limits() {
  const id = currentPlanId();
  return { ...config.plans[id].limits, planId: id, planName: config.plans[id].name };
}

/** Le plan courant autorise-t-il cette fonctionnalité (booléen ou nombre) ? */
export function can(feature, needed = 1) {
  const v = limits()[feature];
  return typeof v === 'number' ? v >= needed : !!v;
}

/** Plan le moins cher qui débloque la fonctionnalité. */
export function planFor(feature, needed = 1) {
  return ORDER.find((id) => {
    const v = config.plans[id].limits[feature];
    return typeof v === 'number' ? v >= needed : !!v;
  }) || ORDER[ORDER.length - 1];
}

export const planName = (id) => config.plans[id]?.name ?? id;
