'use client';

import { useAuth } from '@/lib/auth-context';
import { PatientDashboard } from '@/components/dashboards/patient-dashboard';
import { DoctorOverview } from '@/components/dashboards/doctor-overview';
import { PharmacyOverview } from '@/components/dashboards/pharmacy-overview';
import { AdminOverview, LabOverview } from '@/components/dashboards/lab-admin-overview';

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  switch (user.role) {
    case 'patient':
      return <PatientDashboard user={user} />;
    case 'doctor':
      return <DoctorOverview user={user} />;
    case 'pharmacist':
      return <PharmacyOverview user={user} />;
    case 'labtech':
      return <LabOverview user={user} />;
    case 'admin':
      return <AdminOverview user={user} />;
    default:
      return <PatientDashboard user={user} />;
  }
}
