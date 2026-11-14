import { redirect } from 'next/navigation';

export default function MediaPageRedirect() {
  redirect('/admin/raw-photos');
}
