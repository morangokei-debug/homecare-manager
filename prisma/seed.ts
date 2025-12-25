import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 シードデータを作成中...');

  // 管理者ユーザー作成
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@homecare.local' },
    update: {},
    create: {
      email: 'admin@homecare.local',
      passwordHash: adminPassword,
      name: '管理者',
      role: UserRole.admin,
      isActive: true,
    },
  });

  // 管理者のリマインド設定を作成
  await prisma.reminderSetting.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      visitEnabled: true,
      visitTimings: ['day_before_18', 'same_day_9'],
      rxEnabled: true,
      rxTimings: ['day_before_18', 'same_day_9'],
    },
  });

  console.log('✅ 管理者ユーザーを作成しました');
  console.log('   メール: admin@homecare.local');
  console.log('   パスワード: admin123');

  // サンプル施設を作成
  const facility = await prisma.facility.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'ケアホーム東京',
      nameKana: 'ケアホームトウキョウ',
      address: '東京都江東区豊洲1-1-1',
      area: '江東区豊洲',
      phone: '03-1234-5678',
      contactPerson: '田中',
      displayMode: 'grouped',
    },
  });

  console.log('✅ サンプル施設を作成しました');

  // サンプル患者を作成（個人宅）
  const patient1 = await prisma.patient.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: '山田太郎',
      nameKana: 'ヤマダタロウ',
      facilityId: null, // 個人宅
      address: '東京都品川区東五反田2-2-2',
      area: '品川区東五反田',
      phone: '03-2345-6789',
    },
  });

  // サンプル患者を作成（施設入所）
  const patient2 = await prisma.patient.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      name: '佐藤花子',
      nameKana: 'サトウハナコ',
      facilityId: facility.id, // 施設入所
      address: null,
      area: null,
      phone: null,
    },
  });

  console.log('✅ サンプル患者を作成しました');

  console.log('');
  console.log('🎉 シードデータの作成が完了しました！');
}

main()
  .catch((e) => {
    console.error('❌ エラーが発生しました:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

