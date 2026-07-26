import { useEffect, useState } from 'react'
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/Toast'
import { useTheme } from '@/components/theme/ThemeProvider'
import {
  useAdminCategories,
  useDeleteCategory,
  useSaveCategory,
  useSaveSettings,
} from '@/features/admin/queries'
import { useStoreSettings } from '@/features/catalog/queries'
import { isValidWhatsApp, normalizeWhatsApp, slugify } from '@/lib/utils'
import type { Category } from '@/types/database'

export function AdminCategories() {
  const { data: categories, isLoading } = useAdminCategories()
  const saveCategory = useSaveCategory()
  const deleteCategory = useDeleteCategory()
  const { toast } = useToast()

  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (editing && editing !== 'new') {
      setName(editing.name)
      setSlug(editing.slug)
      setDescription(editing.description ?? '')
    } else {
      setName('')
      setSlug('')
      setDescription('')
    }
  }, [editing])

  async function save() {
    const finalSlug = slug.trim() || slugify(name)
    if (name.trim().length < 2 || !finalSlug) {
      toast('Give the category a name.', 'error')
      return
    }

    try {
      await saveCategory.mutateAsync({
        id: editing !== 'new' && editing ? editing.id : undefined,
        values: {
          name: name.trim(),
          slug: finalSlug,
          description: description.trim() || null,
        },
      })
      toast('Category saved.', 'success')
      setEditing(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save.', 'error')
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Categories</h1>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            How products are grouped on the storefront.
          </p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden />
          Add category
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : categories && categories.length > 0 ? (
          categories.map((c) => (
            <Card key={c.id}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-medium">{c.name}</h2>
                  <p className="mt-0.5 truncate text-sm text-[var(--text-muted)]">
                    /{c.slug}
                    {c.description ? ` · ${c.description}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setEditing(c)}
                    aria-label={`Edit ${c.name}`}
                    className="grid size-9 place-items-center rounded-xl text-[var(--text-muted)] neu-raised hover:text-[var(--text-primary)]"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await deleteCategory.mutateAsync(c.id)
                        toast('Category deleted.', 'success')
                      } catch (err) {
                        toast(err instanceof Error ? err.message : 'Could not delete.', 'error')
                      }
                    }}
                    aria-label={`Delete ${c.name}`}
                    className="grid size-9 place-items-center rounded-xl text-[var(--danger)] neu-raised"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={FolderTree}
            title="No categories"
            description="Categories help buyers find things. Add one to get started."
          />
        )}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New category' : 'Edit category'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button loading={saveCategory.isPending} onClick={() => void save()}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (editing === 'new') setSlug(slugify(e.target.value))
            }}
            placeholder="Web Scripts"
          />
          <Input
            label="URL slug"
            required
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
      </Modal>
    </>
  )
}

// ---------------------------------------------------------------------

export function AdminSettings() {
  const { data: settings } = useStoreSettings()
  const saveSettings = useSaveSettings()
  const { toast } = useToast()
  const { reduceGlass, setReduceGlass } = useTheme()

  const [form, setForm] = useState({
    store_name: '',
    whatsapp_number: '',
    support_email: '',
    announcement_text: '',
    hero_headline: '',
    hero_subheadline: '',
    is_store_open: true,
  })

  useEffect(() => {
    if (!settings) return
    setForm({
      store_name: settings.store_name,
      whatsapp_number: settings.whatsapp_number ?? '',
      support_email: settings.support_email ?? '',
      announcement_text: settings.announcement_text ?? '',
      hero_headline: settings.hero_headline ?? '',
      hero_subheadline: settings.hero_subheadline ?? '',
      is_store_open: settings.is_store_open,
    })
  }, [settings])

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const whatsapp = form.whatsapp_number ? normalizeWhatsApp(form.whatsapp_number) : ''
    if (whatsapp && !isValidWhatsApp(whatsapp)) {
      toast('Enter a valid WhatsApp number with country code, e.g. 919876543210.', 'error')
      return
    }

    try {
      await saveSettings.mutateAsync({
        store_name: form.store_name.trim() || 'UX Store',
        whatsapp_number: whatsapp || null,
        support_email: form.support_email.trim() || null,
        announcement_text: form.announcement_text.trim() || null,
        hero_headline: form.hero_headline.trim() || null,
        hero_subheadline: form.hero_subheadline.trim() || null,
        is_store_open: form.is_store_open,
      })
      toast('Settings saved.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save settings.', 'error')
    }
  }

  return (
    <>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Settings</h1>
      <p className="mt-1.5 text-sm text-[var(--text-muted)]">
        Store details, contact info and the text on the home page.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-5" noValidate>
        <Card className="space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Store
          </h2>
          <Input
            label="Store name"
            value={form.store_name}
            onChange={(e) => set('store_name', e.target.value)}
          />
          <Input
            label="WhatsApp number"
            value={form.whatsapp_number}
            onChange={(e) => set('whatsapp_number', e.target.value)}
            placeholder="919876543210"
            hint="With country code, no + sign. This is the number buyers contact you on."
          />
          <Input
            label="Support email"
            type="email"
            value={form.support_email}
            onChange={(e) => set('support_email', e.target.value)}
            placeholder="support@yourstore.com"
          />
        </Card>

        <Card className="space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Home page
          </h2>
          <Input
            label="Headline"
            value={form.hero_headline}
            onChange={(e) => set('hero_headline', e.target.value)}
          />
          <Textarea
            label="Sub-headline"
            value={form.hero_subheadline}
            onChange={(e) => set('hero_subheadline', e.target.value)}
            rows={2}
          />
          <Input
            label="Announcement bar"
            value={form.announcement_text}
            onChange={(e) => set('announcement_text', e.target.value)}
            placeholder="Diwali sale — 30% off everything"
            hint="Leave empty to hide the bar at the top of the site."
          />
        </Card>

        <Card>
          <label className="flex cursor-pointer items-start justify-between gap-3">
            <span>
              <span className="text-sm font-medium">Store is open</span>
              <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                Turning this off blocks new orders at checkout. Existing orders are unaffected.
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={form.is_store_open}
              aria-label="Store is open"
              onClick={() => set('is_store_open', !form.is_store_open)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                form.is_store_open ? 'brand-gradient' : 'neu-well'
              }`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                  form.is_store_open ? 'translate-x-5.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>
        </Card>

        <Button type="submit" loading={saveSettings.isPending}>
          Save settings
        </Button>
      </form>

      <Card className="mt-6 max-w-2xl">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Display
        </h2>
        <label className="mt-4 flex cursor-pointer items-start justify-between gap-3">
          <span>
            <span className="text-sm font-medium">Reduce transparency</span>
            <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
              Replaces the frosted-glass panels with solid ones. Helps readability, and makes the
              site noticeably faster on older phones. Saved on this device only.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={reduceGlass}
            aria-label="Reduce transparency"
            onClick={() => setReduceGlass(!reduceGlass)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              reduceGlass ? 'brand-gradient' : 'neu-well'
            }`}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                reduceGlass ? 'translate-x-5.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>
      </Card>
    </>
  )
}
