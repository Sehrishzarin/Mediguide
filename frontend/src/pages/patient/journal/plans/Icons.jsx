// Icons for plan types and milestone kinds (lucide-react, decorative).
import { createElement } from 'react';
import { planIcon, kindIcon } from './planFormat';

export function PlanIcon({ type, size = 20 }) {
  return createElement(planIcon(type), { size, 'aria-hidden': true });
}

export function KindIcon({ kind, size = 14 }) {
  return createElement(kindIcon(kind), { size, 'aria-hidden': true });
}
