import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCurrentOrganization } from '@/lib/organization';
import { PatientsClient } from '@/components/patient/patients-client';

export default async function PatientsPage() {
  const [session, org] = await Promise.all([auth(), getCurrentOrganization()]);
  if (!org) redirect('/login');

  const patients = await prisma.patient.findMany({
    where: {
      isActive: true,
      ...(org.isSuperAdmin ? {} : { organizationId: org.organizationId }),
    },
    select: {
      id: true,
      name: true,
      nameKana: true,
      phone: true,
      area: true,
      facility: { select: { id: true, name: true } },
    },
    orderBy: { nameKana: 'asc' },
  });

  const canEdit = session?.user?.role !== 'viewer';

  return <PatientsClient patients={patients} canEdit={canEdit} />;
}
