import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, UnauthorizedError, type Chain } from '@/lib/api'

const emptyForm = { nameEn: '', nameAr: '' }

export function ChainsPage() {
  const navigate = useNavigate()
  const [chains, setChains] = useState<Chain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    api
      .chains()
      .then(setChains)
      .catch((err) => {
        if (err instanceof UnauthorizedError) navigate('/login', { replace: true })
        else setError('Could not reach the server.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const startEdit = (chain: Chain) => {
    setEditingId(chain.id)
    setForm({ nameEn: chain.nameEn, nameAr: chain.nameAr })
  }

  const submit = async () => {
    setError(null)
    setSaving(true)
    try {
      if (editingId) {
        const updated = await api.updateChain(editingId, form)
        setChains((prev) => prev.map((c) => (c.id === editingId ? updated : c)))
      } else {
        const created = await api.createChain(form)
        setChains((prev) => [...prev, { ...created, _count: { restaurants: 0 } }])
      }
      resetForm()
    } catch {
      setError('Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (chain: Chain) => {
    if (chain._count.restaurants > 0) {
      if (!confirm(`${chain.nameEn} has ${chain._count.restaurants} restaurant(s) linked to it. Delete anyway? They'll just be unlinked, not removed.`)) {
        return
      }
    }
    await api.deleteChain(chain.id)
    setChains((prev) => prev.filter((c) => c.id !== chain.id))
    if (editingId === chain.id) resetForm()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Chains</h1>
        <p className="text-sm text-muted-foreground">
          Brands with multiple branches. Linking a restaurant to a chain doesn't change its login, menu, or
          staff — it only records that two or more restaurants are the same brand, for grouping and search
          later. Set which chain a restaurant belongs to from its row on the Restaurants page.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 text-sm font-semibold text-primary">{editingId ? 'Edit chain' : 'Add chain'}</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={submit}
            disabled={saving || !form.nameEn.trim() || !form.nameAr.trim()}
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
              <th className="px-4 py-2 font-medium">Branches</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {chains.map((chain) => (
              <tr key={chain.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2">{chain.nameEn}</td>
                <td className="px-4 py-2">{chain.nameAr}</td>
                <td className="px-4 py-2 text-muted-foreground">{chain._count.restaurants}</td>
                <td className="px-4 py-2">
                  <button onClick={() => startEdit(chain)} className="mr-3 text-muted-foreground hover:text-foreground">
                    Edit
                  </button>
                  <button onClick={() => remove(chain)} className="text-destructive">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!loading && chains.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  No chains yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
