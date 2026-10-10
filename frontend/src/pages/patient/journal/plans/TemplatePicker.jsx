// /patient/journal/plans/new: choose a plan type.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Info, Settings } from 'lucide-react';
import { getCycle } from '../../../../services/api';
import { Alert, Badge, Button, Card, ErrorState, PageHeader, Skeleton } from '../../../../components/ui';
import { useAuth } from '../../../../context/AuthContext';
import { useTemplates, loadTemplates, usePlans } from './plansStore';
import { PlanIcon } from './Icons';
import s from './Plans.module.css';

export default function TemplatePicker() {
  const { status, data, error } = useTemplates();
  const { user } = useAuth();
  const { plans } = usePlans(user?.id || user?._id);
  // Pregnancy plans need cycle tracking turned on (the server enforces this too)
  const [cycleOff, setCycleOff] = useState(false);
  useEffect(() => {
    let cancelled = false;
    getCycle()
      .then((res) => { if (!cancelled) setCycleOff(res?.data?.enabled === false); })
      .catch(() => { /* the server explains if a plan can't be started */ });
    return () => { cancelled = true; };
  }, []);

  let body;
  if (status === 'error') {
    body = <ErrorState message={error} onRetry={loadTemplates} />;
  } else if (status !== 'ready') {
    body = (
      <div className={s.grid} aria-busy="true" aria-label="Loading plan types">
        {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={92} radius="var(--r-lg)" />)}
      </div>
    );
  } else {
    body = (
      <div className={s.grid}>
        {data.map((t) => {
          const current = plans.find((p) => p.type === t.type && p.status === 'active');
          if (current) {
            return (
              <Card key={t.type} as={Link} to={`/patient/journal/plans/${current.id}`} interactive className={s.tplCard}>
                <span className={s.iconTile}><PlanIcon type={t.type} /></span>
                <span className={s.tplText}>
                  <span className={s.homeTitleRow}><span className={s.planTitle}>{t.title}</span><Badge tone="brand">Active</Badge></span>
                  <span className={s.muted}>You're already following this plan. Open it.</span>
                </span>
                <ChevronRight size={18} className={s.chev} aria-hidden="true" />
              </Card>
            );
          }
          if (t.type === 'pregnancy' && cycleOff) {
            return (
              <Card key={t.type} className={s.tplCard} aria-disabled="true">
                <span className={`${s.iconTile} ${s.iconTileMuted}`}><PlanIcon type={t.type} /></span>
                <span className={s.tplText}>
                  <span className={s.planTitle}>{t.title}</span>
                  <span className={s.muted}>Turn on cycle tracking in your journal settings to start a pregnancy plan.</span>
                  <Button variant="ghost" size="sm" icon={Settings} to="/patient/profile?section=journal" className={s.inlineLinkBtn}>Journal settings</Button>
                </span>
              </Card>
            );
          }
          return (
            <Card key={t.type} as={Link} to={`/patient/journal/plans/new/${t.type}`} interactive className={s.tplCard}>
              <span className={s.iconTile}><PlanIcon type={t.type} /></span>
              <span className={s.tplText}>
                <span className={s.planTitle}>{t.title}</span>
                <span className={s.muted}>{t.summary}</span>
              </span>
              <ChevronRight size={18} className={s.chev} aria-hidden="true" />
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className={s.page}>
      <PageHeader title="Start a care plan" subtitle="Choose what you'd like to follow." back="/patient/journal/plans" />
      {body}
      <Alert tone="info" icon={Info}>Plans follow general guidance. Always follow your own doctor's schedule.</Alert>
    </div>
  );
}
