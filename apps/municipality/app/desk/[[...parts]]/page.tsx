import { Desk } from '../../../components/shell';

export default async function Page({
  params,
}: {
  params: Promise<{ parts?: string[] }>;
}) {
  const { parts = [] } = await params;
  return <Desk section={parts[0] ?? 'home'} detail={parts[1]} />;
}
