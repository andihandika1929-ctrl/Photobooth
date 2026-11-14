import { redirect } from 'next/navigation';

export default function FramesRedirectPage() {
  redirect('/admin/raw-photos');
}
