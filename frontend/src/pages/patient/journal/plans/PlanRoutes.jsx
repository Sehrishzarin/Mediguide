// Plan screens under /patient/journal/plans/*: template picker, setup form and plan detail.
import { Navigate, Route, Routes } from 'react-router-dom';
import TemplatePicker from './TemplatePicker';
import PlanSetup from './PlanSetup';
import PlanDetail from './PlanDetail';

export default function PlanRoutes() {
  return (
    <Routes>
      <Route path="new" element={<TemplatePicker />} />
      <Route path="new/:type" element={<PlanSetup />} />
      <Route path=":id" element={<PlanDetail />} />
      <Route path="*" element={<Navigate to="/patient/journal/plans" replace />} />
    </Routes>
  );
}
