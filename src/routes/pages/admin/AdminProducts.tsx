import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, ImagePlus, Package, Pencil, Star, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button, LinkButton } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, LoadingScreen, Skeleton } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/Toast'
import {
  useAdminCategories,
  useAdminProduct,
  useAdminProducts,
  useDeleteProduct,
  useSaveProduct,
  uploadProductImage,
} from '@/features/admin/queries'
import { formatPrice } from '@/lib/format'
import { gradientFor, slugify, toNumber } from '@/lib/utils'
import type { Product } from '@/types/database'

export function AdminProducts() {
  const { data: products, isLoading } = useAdminProducts()
  const deleteProduct = useDeleteProduct()
  const { toast } = useToast()
  const [confirming, setConfirming] = useState<Product | null>(null)

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Products</h1>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Everything listed in the store, including hidden ones.
          </p>
        </div>
        <LinkButton to="/admin/products/new">Add product</LinkButton>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : products && products.length > 0 ? (
          products.map((p) => (
            <Card key={p.id}>
              <div className="flex flex-wrap items-center gap-4">
                <div className="size-14 shrink-0 overflow-hidden rounded-xl">
                  {p.cover_image_url ? (
                    <img src={p.cover_image_url} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="size-full" style={{ background: gradientFor(p.slug) }} aria-hidden />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-medium">{p.title}</h2>
                    {p.is_featured && (
                      <Star className="size-3.5 fill-[var(--warning)] text-[var(--warning)]" aria-label="Featured" />
                    )}
                    {!p.is_active && (
                      <span className="flex items-center gap-1 rounded-full bg-[var(--glass-fill-lo)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                        <EyeOff className="size-3" aria-hidden />
                        Hidden
                      </span>
                    )}
                  </div>
                  <p className="tnum mt-0.5 text-sm text-[var(--text-muted)]">
                    {formatPrice(p.price_inr)} · {p.sales_count} sold · {p.view_count} views
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Link
                    to={`/products/${p.slug}`}
                    className="grid size-9 place-items-center rounded-xl text-[var(--text-muted)] neu-raised hover:text-[var(--text-primary)]"
                    aria-label="View in store"
                  >
                    <Eye className="size-4" aria-hidden />
                  </Link>
                  <Link
                    to={`/admin/products/${p.id}`}
                    className="grid size-9 place-items-center rounded-xl text-[var(--text-muted)] neu-raised hover:text-[var(--text-primary)]"
                    aria-label="Edit product"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Link>
                  <button
                    onClick={() => setConfirming(p)}
                    className="grid size-9 place-items-center rounded-xl text-[var(--danger)] neu-raised"
                    aria-label="Delete product"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Add your first product to start selling."
            action={<LinkButton to="/admin/products/new" size="sm">Add product</LinkButton>}
          />
        )}
      </div>

      <Modal
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        title="Delete this product?"
        description={confirming?.title}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteProduct.isPending}
              onClick={async () => {
                try {
                  await deleteProduct.mutateAsync(confirming!.id)
                  toast('Product deleted.', 'success')
                  setConfirming(null)
                } catch (err) {
                  toast(err instanceof Error ? err.message : 'Could not delete.', 'error')
                }
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-secondary)]">
          This cannot be undone. Past orders keep their own copy of the title and price, so order
          history stays intact.
        </p>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          If you only want to take it off the store, edit it and switch it to hidden instead.
        </p>
      </Modal>
    </>
  )
}

// ---------------------------------------------------------------------

const emptyForm = {
  title: '',
  slug: '',
  short_description: '',
  description: '',
  price_inr: '',
  compare_at_price: '',
  category_id: '',
  cover_image_url: '',
  tech_stack: '',
  features: '',
  demo_url: '',
  version: '',
  is_active: true,
  is_featured: false,
}

export function AdminProductEditor() {
  const { productId } = useParams<{ productId: string }>()
  const isNew = productId === 'new'
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: product, isLoading } = useAdminProduct(productId)
  const { data: categories } = useAdminCategories()
  const saveProduct = useSaveProduct()

  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!product) return
    setSlugTouched(true)
    setForm({
      title: product.title,
      slug: product.slug,
      short_description: product.short_description ?? '',
      description: product.description ?? '',
      price_inr: String(toNumber(product.price_inr)),
      compare_at_price: product.compare_at_price ? String(toNumber(product.compare_at_price)) : '',
      category_id: product.category_id ?? '',
      cover_image_url: product.cover_image_url ?? '',
      tech_stack: product.tech_stack.join(', '),
      features: product.features.join('\n'),
      demo_url: product.demo_url ?? '',
      version: product.version ?? '',
      is_active: product.is_active,
      is_featured: product.is_featured,
    })
  }, [product])

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const url = await uploadProductImage(file)
      set('cover_image_url', url)
      toast('Image uploaded.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Upload failed.', 'error')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const next: Record<string, string> = {}
    if (form.title.trim().length < 3) next.title = 'Give the product a title.'
    const slug = form.slug.trim() || slugify(form.title)
    if (!slug) next.slug = 'A URL slug is required.'
    const price = Number(form.price_inr)
    if (!Number.isFinite(price) || price <= 0) next.price_inr = 'Enter a price above zero.'

    const compareAt = form.compare_at_price ? Number(form.compare_at_price) : null
    if (compareAt !== null && (!Number.isFinite(compareAt) || compareAt < price)) {
      next.compare_at_price = 'The compare-at price must be higher than the price.'
    }

    setErrors(next)
    if (Object.keys(next).length) return

    try {
      const id = await saveProduct.mutateAsync({
        id: isNew ? undefined : productId,
        values: {
          title: form.title.trim(),
          slug,
          short_description: form.short_description.trim() || null,
          description: form.description.trim() || null,
          price_inr: price,
          compare_at_price: compareAt,
          category_id: form.category_id || null,
          cover_image_url: form.cover_image_url.trim() || null,
          tech_stack: form.tech_stack
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          features: form.features
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          demo_url: form.demo_url.trim() || null,
          version: form.version.trim() || null,
          is_active: form.is_active,
          is_featured: form.is_featured,
        },
      })
      toast(isNew ? 'Product created.' : 'Product saved.', 'success')
      navigate(isNew ? `/admin/products/${id}` : '/admin/products')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save the product.', 'error')
    }
  }

  if (!isNew && isLoading) return <LoadingScreen />

  return (
    <>
      <Link
        to="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Products
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl">
        {isNew ? 'New product' : 'Edit product'}
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start" noValidate>
        <div className="space-y-5">
          <Card className="space-y-5">
            <Input
              label="Title"
              required
              value={form.title}
              error={errors.title}
              onChange={(e) => {
                set('title', e.target.value)
                if (!slugTouched) set('slug', slugify(e.target.value))
              }}
              placeholder="Anime Streaming CMS"
            />

            <Input
              label="URL slug"
              required
              value={form.slug}
              error={errors.slug}
              onChange={(e) => {
                setSlugTouched(true)
                set('slug', slugify(e.target.value))
              }}
              hint={`Appears as /products/${form.slug || 'your-slug'}`}
            />

            <Textarea
              label="Short description"
              value={form.short_description}
              onChange={(e) => set('short_description', e.target.value)}
              rows={2}
              maxLength={200}
              hint="Shown on the product card. Keep it to one line."
            />

            <Textarea
              label="Full description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={10}
              hint="Plain text. Line breaks are preserved."
            />
          </Card>

          <Card className="space-y-5">
            <Input
              label="Tech stack"
              value={form.tech_stack}
              onChange={(e) => set('tech_stack', e.target.value)}
              placeholder="PHP 8, MySQL, Bootstrap 5"
              hint="Separate with commas."
            />
            <Textarea
              label="Features"
              value={form.features}
              onChange={(e) => set('features', e.target.value)}
              rows={5}
              placeholder={'Admin panel\nTwo-factor auth\nComment system'}
              hint="One feature per line."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Demo URL"
                type="url"
                value={form.demo_url}
                onChange={(e) => set('demo_url', e.target.value)}
                placeholder="https://demo.example.com"
              />
              <Input
                label="Version"
                value={form.version}
                onChange={(e) => set('version', e.target.value)}
                placeholder="2.1.0"
              />
            </div>
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-24">
          <Card className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Price (₹)"
                type="number"
                required
                min={1}
                step="1"
                value={form.price_inr}
                error={errors.price_inr}
                onChange={(e) => set('price_inr', e.target.value)}
              />
              <Input
                label="Compare at (₹)"
                type="number"
                min={0}
                step="1"
                value={form.compare_at_price}
                error={errors.compare_at_price}
                onChange={(e) => set('compare_at_price', e.target.value)}
                hint="Shown struck through."
              />
            </div>

            <Select
              label="Category"
              value={form.category_id}
              onChange={(e) => set('category_id', e.target.value)}
            >
              <option value="">No category</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold">Cover image</h2>
            <div className="mt-3 aspect-[16/10] overflow-hidden rounded-xl">
              {form.cover_image_url ? (
                <img src={form.cover_image_url} alt="" className="size-full object-cover" />
              ) : (
                <div
                  className="size-full"
                  style={{ background: gradientFor(form.slug || 'placeholder') }}
                  aria-hidden
                />
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleUpload(file)
                e.target.value = ''
              }}
            />

            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="glass"
                size="sm"
                loading={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus className="size-4" aria-hidden />
                Upload
              </Button>
              {form.cover_image_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => set('cover_image_url', '')}
                >
                  Remove
                </Button>
              )}
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Max 5&nbsp;MB. Leave empty to use an auto-generated gradient.
            </p>
          </Card>

          <Card className="space-y-3">
            <Toggle
              label="Visible in store"
              hint="Hidden products stay in the database but disappear from the storefront."
              checked={form.is_active}
              onChange={(v) => set('is_active', v)}
            />
            <Toggle
              label="Featured on home page"
              checked={form.is_featured}
              onChange={(v) => set('is_featured', v)}
            />
          </Card>

          <div className="flex gap-2">
            <Button type="submit" fullWidth loading={saveProduct.isPending}>
              {isNew ? 'Create product' : 'Save changes'}
            </Button>
          </div>
        </div>
      </form>
    </>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3">
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'brand-gradient' : 'neu-well'
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5.5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  )
}
