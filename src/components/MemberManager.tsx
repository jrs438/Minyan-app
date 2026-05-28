'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { Member } from '@/lib/types';

export function MemberManager({ members }: { members: Member[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', role: 'member', neighborhood: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addMember() {
    if (!form.first_name || !form.last_name || !form.phone) {
      setError('Name and phone required');
      return;
    }
    setError(null);
    setSaving(true);
    const phone = form.phone.replace(/[^\d+]/g, '');
    const formatted = phone.startsWith('+') ? phone : `+1${phone}`;

    const sb = supabaseBrowser();
    const { error } = await sb.from('members').insert({
      first_name: form.first_name,
      last_name: form.last_name,
      phone: formatted,
      role: form.role,
      neighborhood: form.neighborhood || null,
      active: true
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setAdding(false);
    setForm({ first_name: '', last_name: '', phone: '', role: 'member', neighborhood: '' });
    router.refresh();
  }

  async function toggleActive(m: Member) {
    const sb = supabaseBrowser();
    await sb.from('members').update({ active: !m.active }).eq('id', m.id);
    router.refresh();
  }

  async function changeRole(m: Member, role: string) {
    const sb = supabaseBrowser();
    await sb.from('members').update({ role }).eq('id', m.id);
    router.refresh();
  }

  return (
    <div className="px-5 pt-4">
      {!adding ? (
        <button onClick={() => setAdding(true)} className="btn-primary mb-4">
          + Add Member
        </button>
      ) : (
        <div className="bg-cream-warm border border-black/10 rounded-xl p-4 mb-4 space-y-2">
          <input placeholder="First name" value={form.first_name}
            onChange={e => setForm({ ...form, first_name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm" />
          <input placeholder="Last name" value={form.last_name}
            onChange={e => setForm({ ...form, last_name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm" />
          <input placeholder="Phone (201-555-0123)" value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm" />
          <input placeholder="Neighborhood (optional)" value={form.neighborhood}
            onChange={e => setForm({ ...form, neighborhood: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm" />
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm">
            <option value="member">Member</option>
            <option value="teen">Teen</option>
            <option value="gabbai">Gabbai</option>
            <option value="admin">Admin</option>
          </select>
          {error && <div className="text-sm text-alert">{error}</div>}
          <div className="flex gap-2">
            <button onClick={addMember} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setAdding(false)} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="section-label">{members.length} total</div>
      {members.map(m => (
        <div key={m.id}
          className="flex justify-between items-center py-2.5 border-b border-black/5">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-ink">
              {m.first_name} {m.last_name}
              {!m.active && <span className="text-muted italic ml-2 font-normal">(inactive)</span>}
            </div>
            <div className="text-[10px] text-muted">{m.phone} · {m.neighborhood || '—'}</div>
          </div>
          <div className="flex items-center gap-2">
            <select value={m.role} onChange={e => changeRole(m, e.target.value)}
              className="text-[11px] rounded bg-cream-warm border border-black/10 px-2 py-1">
              <option value="member">member</option>
              <option value="teen">teen</option>
              <option value="gabbai">gabbai</option>
              <option value="admin">admin</option>
            </select>
            <button onClick={() => toggleActive(m)}
              className="text-[10px] text-muted underline">
              {m.active ? 'deactivate' : 'activate'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
