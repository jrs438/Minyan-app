'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { Member } from '@/lib/types';

const ROLES = ['member', 'teen', 'preteen', 'gabbai', 'admin'] as const;

export function MemberManager({ members }: { members: Member[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '', role: 'member', neighborhood: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [importing, setImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  // Origin is read after mount so the invite SMS link uses whatever host the
  // gabbai is currently on (vercel.app today, custom domain later).
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);

  function inviteHref(m: Member) {
    const url = `${origin}/auth/login?phone=${encodeURIComponent(m.phone)}`;
    const body = `Hi ${m.first_name} — you've been added to the Beth Tefillah Minyan app. Tap to sign in: ${url}`;
    // sms:phone?&body=... is the cross-platform form that opens iOS Messages
    // (and Android Messaging) with the recipient and body prefilled.
    return `sms:${m.phone}?&body=${encodeURIComponent(body)}`;
  }

  function formatPhone(raw: string) {
    const cleaned = raw.replace(/[^\d+]/g, '');
    return cleaned.startsWith('+') ? cleaned : `+1${cleaned}`;
  }

  async function addMember() {
    if (!form.first_name || !form.last_name) {
      setError('Name required');
      return;
    }
    if (!form.phone && !form.email) {
      setError('Phone or email required (one is enough; both is best)');
      return;
    }
    setError(null);
    setSaving(true);
    const sb = supabaseBrowser();
    const { error } = await sb.from('members').insert({
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone ? formatPhone(form.phone) : null,
      email: form.email ? form.email.toLowerCase().trim() : null,
      role: form.role,
      neighborhood: form.neighborhood || null,
      active: true
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setAdding(false);
    setForm({ first_name: '', last_name: '', phone: '', email: '', role: 'member', neighborhood: '' });
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

  async function toggleDriver(m: Member) {
    const sb = supabaseBrowser();
    await sb.from('members').update({ offers_ride_default: !m.offers_ride_default }).eq('id', m.id);
    router.refresh();
  }

  async function awardPoints(m: Member) {
    const amountStr = window.prompt(`Award points to ${m.first_name} ${m.last_name}\nHow many points?`);
    if (!amountStr) return;
    const amount = parseFloat(amountStr.replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Enter a positive number.');
      return;
    }
    const reason = window.prompt('Reason (e.g. "Led davening", "D\'var Torah")');
    if (!reason) return;
    const sb = supabaseBrowser();
    const { error } = await sb.from('points_ledger').insert({
      member_id: m.id, points: amount, reason: 'gabbai_award', description: reason
    });
    if (error) alert('Could not save: ' + error.message);
    else router.refresh();
  }

  async function bulkImport() {
    setImporting(true);
    setBulkResult(null);

    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    const rows: any[] = [];
    let invalid = 0;

    for (const line of lines) {
      const parts = line.split(/[\t,]/).map(s => s.trim());
      // Accept either: First, Last, Phone[, Role]  OR  First, Last, Email[, Role]
      // Detect email vs phone in the 3rd column.
      const [first, last, contact, rawRole] = parts;
      if (/^first/i.test(first || '') && /^last/i.test(last || '')) continue; // header
      if (!first || !last || !contact) { invalid++; continue; }
      const role = ROLES.includes((rawRole || '').toLowerCase() as any)
        ? (rawRole || '').toLowerCase()
        : 'member';
      const isEmail = contact.includes('@');
      rows.push({
        first_name: first,
        last_name: last,
        phone: isEmail ? null : formatPhone(contact),
        email: isEmail ? contact.toLowerCase().trim() : null,
        role,
        active: true
      });
    }

    if (rows.length === 0) {
      setImporting(false);
      setBulkResult(invalid > 0 ? `No valid rows (${invalid} invalid).` : 'No valid rows.');
      return;
    }

    const sb = supabaseBrowser();
    const { data, error } = await sb.from('members')
      .upsert(rows, { onConflict: 'phone', ignoreDuplicates: true })
      .select('id');

    setImporting(false);
    if (error) { setBulkResult('Error: ' + error.message); return; }

    const added = data?.length || 0;
    const skipped = rows.length - added;
    const parts: string[] = [`Added ${added}`];
    if (skipped > 0) parts.push(`skipped ${skipped} already-existing`);
    if (invalid > 0) parts.push(`${invalid} invalid line${invalid === 1 ? '' : 's'}`);
    setBulkResult(parts.join(' · ') + '.');
    setBulkText('');
    router.refresh();
  }

  return (
    <div className="px-5 pt-4">
      {!adding && !bulkOpen && (
        <div className="flex gap-2 mb-4">
          <button onClick={() => setAdding(true)} className="btn-primary flex-1">
            + Add Member
          </button>
          <button onClick={() => setBulkOpen(true)} className="btn-secondary flex-1">
            Bulk paste
          </button>
        </div>
      )}

      {adding && (
        <div className="bg-cream-warm border border-black/10 rounded-xl p-4 mb-4 space-y-2">
          <input placeholder="First name" value={form.first_name}
            onChange={e => setForm({ ...form, first_name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm" />
          <input placeholder="Last name" value={form.last_name}
            onChange={e => setForm({ ...form, last_name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm" />
          <input placeholder="Email (preferred)" type="email" inputMode="email" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
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
            <option value="preteen">Preteen</option>
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

      {bulkOpen && (
        <div className="bg-cream-warm border border-black/10 rounded-xl p-4 mb-4 space-y-2">
          <div className="text-[11px] text-muted">
            One per line. Tabs or commas. Columns: <strong>First, Last, Phone, Role</strong> (role optional, defaults to <em>member</em>). Paste straight from a spreadsheet.
          </div>
          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            rows={6}
            placeholder={'Jonah\tSpier\t2015551234\tteen\nDavid\tCohen\t2015550199'}
            className="w-full px-3 py-2 rounded-lg bg-parchment border border-black/10 text-sm font-mono"
          />
          {bulkResult && <div className="text-[12px] text-ink">{bulkResult}</div>}
          <div className="flex gap-2">
            <button onClick={bulkImport} disabled={importing || !bulkText.trim()} className="btn-primary flex-1">
              {importing ? 'Importing…' : 'Import'}
            </button>
            <button
              onClick={() => { setBulkOpen(false); setBulkText(''); setBulkResult(null); }}
              className="btn-secondary flex-1"
            >
              Done
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
              <option value="preteen">preteen</option>
              <option value="gabbai">gabbai</option>
              <option value="admin">admin</option>
            </select>
            {origin && (
              <a href={inviteHref(m)}
                className="text-[10px] text-gold-deep font-semibold underline">
                invite
              </a>
            )}
            <Link href={`/commit-multi?member=${m.id}`}
              className="text-[10px] text-gold-deep font-semibold underline">
              rsvp
            </Link>
            <button onClick={() => awardPoints(m)}
              className="text-[10px] text-gold-deep font-semibold underline">
              + pts
            </button>
            <button onClick={() => toggleDriver(m)}
              className={`text-[10px] underline ${m.offers_ride_default ? 'text-gold-deep font-semibold' : 'text-muted'}`}
              title="Toggle whether this member can give rides">
              🚗{m.offers_ride_default ? '✓' : ''}
            </button>
            <button onClick={() => toggleActive(m)}
              className="text-[10px] text-muted underline">
              {m.active ? 'hide' : 'show'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
