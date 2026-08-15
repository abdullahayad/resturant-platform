import { useEffect, useState } from 'react'
import { api, UnauthorizedError, type MasterDataItemFull, type MasterDataKind } from '@/lib/api'
import { useNavigate } from 'react-router-dom'

const emptyForm = { nameEn: '', nameAr: '', sortOrder: 0, icon: '' }

interface MasterDataListProps {
  kind: MasterDataKind
  showIcon?: boolean
}

export function MasterDataList({ kind, showIcon }: MasterDataListProps) {
  const navigate = useNavigate()
  const [items, setItems] = useState<MasterDataItemFull[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api
      .masterData(kind)
      .then(setItems)
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [kind])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const startEdit = (item: MasterDataItemFull) => {
    setEditingId(item.id)
    setForm({ nameEn: item.nameEn, nameAr: item.nameAr, sortOrder: item.sortOrder, icon: item.icon ?? '' })
  }

  const submit = async () => {
    setError(null)
    const payload = {
      nameEn: form.nameEn,
      nameAr: form.nameAr,
      sortOrder: Number(form.sortOrder) || 0,
      ...(showIcon ? { icon: form.icon || undefined } : {}),
    }
    try {
      if (editingId) {
        const updated = await api.updateMasterDataItem(kind, editingId, payload)
        setItems((prev) => prev.map((i) => (i.id === editingId ? updated : i)))
      } else {
        const created = await api.createMasterDataItem(kind, payload)
        setItems((prev) => [...prev, created])
      }
      resetForm()
    } catch {
      setError('Save failed.')
    }
  }

  const toggleActive = async (item: MasterDataItemFull) => {
    const updated = await api.updateMasterDataItem(kind, item.id, { isActive: !item.isActive })
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
  }

  const remove = async (id: string) => {
    await api.deleteMasterDataItem(kind, id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    if (editingId === id) resetForm()
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 text-sm font-semibold text-primary">{editingId ? 'Edit item' : 'Add item'}</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            value={form.nameEn}
            onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
            placeholder="Name (English)"
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={form.nameAr}
            onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
            placeholder="Name (Arabic)"
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
            placeholder="Sort order"
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          />
          {showIcon && (
            <input
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              placeholder="Icon (optional)"
              className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
            />
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={submit}
            disabled={!form.nameEn.trim() || !form.nameAr.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {editingId ? 'Save Changes' : 'Add'}
          </button>
          {editingId && (
            <button onClick={resetForm} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground">
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-2 font-medium">English</th>
              <th className="px-4 py-2 font-medium">Arabic</th>
              <th className="px-4 py-2 font-medium">Order</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2">{item.nameEn}</td>
                <td className="px-4 py-2">{item.nameAr}</td>
                <td className="px-4 py-2 text-muted-foreground">{item.sortOrder}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleActive(item)}
                    className={
                      item.isActive
                        ? 'rounded-full bg-success/15 px-2.5 py-1 text-xs text-success'
                        : 'rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground'
                    }
                  >
                    {item.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-2">
                  <button onClick={() => startEdit(item)} className="mr-3 text-muted-foreground hover:text-foreground">
                    Edit
                  </button>
                  <button onClick={() => remove(item.id)} className="text-destructive">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
