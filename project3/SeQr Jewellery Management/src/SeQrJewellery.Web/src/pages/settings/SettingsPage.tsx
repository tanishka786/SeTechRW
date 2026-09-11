import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Save, Pencil, Wifi, Upload } from 'lucide-react'
import { catalogApi, settingsApi } from '../../api'
import { fmtDate } from '../../utils/format'
import type { Category, Metal, Supplier, UpdateInvoiceSettingsRequest } from '../../types'
import { InvoicePaperSize } from '../../types'
import Button from '../../components/ui/Button'
import { Input, Select, TextArea } from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'

type Tab = 'categories' | 'metals' | 'suppliers' | 'templates' | 'rfid' | 'invoice' | 'social'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('metals')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'metals', label: 'Metals & Rates' },
    { key: 'categories', label: 'Categories' },
    { key: 'suppliers', label: 'Suppliers' },
    { key: 'templates', label: 'Label Templates' },
    { key: 'invoice', label: 'Invoice Template' },
    { key: 'social', label: 'Social Accounts' },
    { key: 'rfid', label: 'RFID Readers' },
  ]

  return (
    <div className="space-y-5">
      <h1 className="page-title">Settings</h1>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >{label}</button>
        ))}
      </div>

      {tab === 'metals' && <MetalsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'suppliers' && <SuppliersTab />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'invoice' && <InvoiceSettingsTab />}
      {tab === 'social' && <SocialSettingsTab />}
      {tab === 'rfid' && <RFIDTab />}
    </div>
  )
}

function InvoiceSettingsTab() {
  const qc = useQueryClient()
  const { data: settings, isLoading } = useQuery({ queryKey: ['invoice-settings'], queryFn: settingsApi.getInvoiceSettings })
  const [form, setForm] = useState<UpdateInvoiceSettingsRequest | null>(null)

  const effective = form ?? (settings ? {
    shopName: settings.shopName, addressLine1: settings.addressLine1, addressLine2: settings.addressLine2,
    city: settings.city, state: settings.state, stateCode: settings.stateCode, postalCode: settings.postalCode,
    phone: settings.phone, email: settings.email, gstin: settings.gstin, pan: settings.pan,
    bankName: settings.bankName, bankAccountName: settings.bankAccountName, bankAccountNumber: settings.bankAccountNumber,
    bankIFSC: settings.bankIFSC, bankBranch: settings.bankBranch, upiId: settings.upiId,
    termsAndConditions: settings.termsAndConditions, declaration: settings.declaration,
    signatoryName: settings.signatoryName, signatoryDesignation: settings.signatoryDesignation,
    jurisdiction: settings.jurisdiction, defaultHSNCode: settings.defaultHSNCode,
    tagline: settings.tagline, footerNote: settings.footerNote,
    showIGST: settings.showIGST, showHallmark: settings.showHallmark, showOldGoldSection: settings.showOldGoldSection,
    showLogo: settings.showLogo, showBankDetails: settings.showBankDetails,
    showPaymentHistory: settings.showPaymentHistory, showTagline: settings.showTagline,
    primaryColorHex: settings.primaryColorHex ?? '#B45309',
    accentColorHex: settings.accentColorHex ?? '#FEF3C7',
    paperSize: settings.paperSize ?? InvoicePaperSize.A4,
    marginMm: settings.marginMm ?? 12, logoHeightMm: settings.logoHeightMm ?? 18, fontSizePt: settings.fontSizePt ?? 9,
    razorpayEnabled: settings.razorpayEnabled, razorpayKeyId: settings.razorpayKeyId, razorpayKeySecret: '',
  } as UpdateInvoiceSettingsRequest : null)

  const update = <K extends keyof UpdateInvoiceSettingsRequest>(key: K, value: UpdateInvoiceSettingsRequest[K]) => {
    if (!effective) return
    setForm({ ...effective, [key]: value })
  }

  const saveMutation = useMutation({
    mutationFn: () => settingsApi.updateInvoiceSettings(effective!),
    onSuccess: () => { toast.success('Invoice settings saved'); qc.invalidateQueries({ queryKey: ['invoice-settings'] }); setForm(null) },
    onError: () => toast.error('Failed to save settings'),
  })

  const logoMutation = useMutation({
    mutationFn: (file: File) => settingsApi.uploadLogo(file),
    onSuccess: () => { toast.success('Logo uploaded'); qc.invalidateQueries({ queryKey: ['invoice-settings'] }) },
    onError: () => toast.error('Failed to upload logo'),
  })

  if (isLoading || !effective) return <div className="text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Shop Details</h3>
          <div className="flex items-center gap-3">
            {settings?.logoPath && <img src={settings.logoPath} alt="Logo" className="h-10 object-contain" />}
            <label className="text-xs text-amber-600 hover:underline cursor-pointer flex items-center gap-1">
              <Upload size={13} /> {settings?.logoPath ? 'Change Logo' : 'Upload Logo'}
              <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) logoMutation.mutate(f) }} />
            </label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Shop Name *" value={effective.shopName} onChange={e => update('shopName', e.target.value)} className="col-span-2" />
          <Input label="Tagline" value={effective.tagline ?? ''} onChange={e => update('tagline', e.target.value)} className="col-span-2" placeholder="e.g. Trusted jewellery since 1985" />
          <Input label="Address Line 1" value={effective.addressLine1 ?? ''} onChange={e => update('addressLine1', e.target.value)} className="col-span-2" />
          <Input label="Address Line 2" value={effective.addressLine2 ?? ''} onChange={e => update('addressLine2', e.target.value)} className="col-span-2" />
          <Input label="City" value={effective.city ?? ''} onChange={e => update('city', e.target.value)} />
          <Input label="State" value={effective.state ?? ''} onChange={e => update('state', e.target.value)} />
          <Input label="State Code (GST)" value={effective.stateCode ?? ''} onChange={e => update('stateCode', e.target.value)} placeholder="e.g. 27" />
          <Input label="Postal Code" value={effective.postalCode ?? ''} onChange={e => update('postalCode', e.target.value)} />
          <Input label="Phone" value={effective.phone ?? ''} onChange={e => update('phone', e.target.value)} />
          <Input label="Email" value={effective.email ?? ''} onChange={e => update('email', e.target.value)} />
          <Input label="GSTIN" value={effective.gstin ?? ''} onChange={e => update('gstin', e.target.value)} />
          <Input label="PAN" value={effective.pan ?? ''} onChange={e => update('pan', e.target.value)} />
          <Input label="Default HSN Code" value={effective.defaultHSNCode ?? ''} onChange={e => update('defaultHSNCode', e.target.value)} />
          <Input label="Jurisdiction" value={effective.jurisdiction ?? ''} onChange={e => update('jurisdiction', e.target.value)} placeholder="e.g. Mumbai" />
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Theme, Size & Layout</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Primary Color</label>
            <div className="flex gap-2 mt-1">
              <input type="color" value={effective.primaryColorHex || '#B45309'} onChange={e => update('primaryColorHex', e.target.value)} className="h-10 w-14 rounded border cursor-pointer" />
              <Input value={effective.primaryColorHex ?? ''} onChange={e => update('primaryColorHex', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Accent Color</label>
            <div className="flex gap-2 mt-1">
              <input type="color" value={effective.accentColorHex || '#FEF3C7'} onChange={e => update('accentColorHex', e.target.value)} className="h-10 w-14 rounded border cursor-pointer" />
              <Input value={effective.accentColorHex ?? ''} onChange={e => update('accentColorHex', e.target.value)} />
            </div>
          </div>
          <Select
            label="Paper Size"
            value={effective.paperSize}
            onChange={e => update('paperSize', Number(e.target.value) as InvoicePaperSize)}
            options={[
              { value: InvoicePaperSize.A4, label: 'A4' },
              { value: InvoicePaperSize.A5, label: 'A5' },
              { value: InvoicePaperSize.Letter, label: 'Letter' },
            ]}
          />
          <Input label="Margin (mm)" type="number" min={5} max={40} value={effective.marginMm} onChange={e => update('marginMm', Number(e.target.value))} />
          <Input label="Logo Height (mm)" type="number" min={8} max={40} value={effective.logoHeightMm} onChange={e => update('logoHeightMm', Number(e.target.value))} />
          <Input label="Font Size (pt)" type="number" min={7} max={14} step={0.5} value={effective.fontSizePt} onChange={e => update('fontSizePt', Number(e.target.value))} />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={effective.showLogo} onChange={e => update('showLogo', e.target.checked)} className="rounded text-amber-600" /> Show logo</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={effective.showTagline} onChange={e => update('showTagline', e.target.checked)} className="rounded text-amber-600" /> Show tagline</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={effective.showBankDetails} onChange={e => update('showBankDetails', e.target.checked)} className="rounded text-amber-600" /> Show bank details</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={effective.showPaymentHistory} onChange={e => update('showPaymentHistory', e.target.checked)} className="rounded text-amber-600" /> Show payment history</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={effective.showIGST} onChange={e => update('showIGST', e.target.checked)} className="rounded text-amber-600" /> Show IGST (interstate)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={effective.showHallmark} onChange={e => update('showHallmark', e.target.checked)} className="rounded text-amber-600" /> Show hallmark</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={effective.showOldGoldSection} onChange={e => update('showOldGoldSection', e.target.checked)} className="rounded text-amber-600" /> Show old gold section</label>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Bank & UPI Details</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Bank Name" value={effective.bankName ?? ''} onChange={e => update('bankName', e.target.value)} />
          <Input label="Account Name" value={effective.bankAccountName ?? ''} onChange={e => update('bankAccountName', e.target.value)} />
          <Input label="Account Number" value={effective.bankAccountNumber ?? ''} onChange={e => update('bankAccountNumber', e.target.value)} />
          <Input label="IFSC Code" value={effective.bankIFSC ?? ''} onChange={e => update('bankIFSC', e.target.value)} />
          <Input label="Branch" value={effective.bankBranch ?? ''} onChange={e => update('bankBranch', e.target.value)} />
          <Input label="UPI ID" value={effective.upiId ?? ''} onChange={e => update('upiId', e.target.value)} />
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Signature & Declaration</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Input label="Signatory Name" value={effective.signatoryName ?? ''} onChange={e => update('signatoryName', e.target.value)} />
          <Input label="Signatory Designation" value={effective.signatoryDesignation ?? ''} onChange={e => update('signatoryDesignation', e.target.value)} />
        </div>
        <TextArea label="Terms & Conditions" value={effective.termsAndConditions ?? ''} onChange={e => update('termsAndConditions', e.target.value)} />
        <TextArea label="Declaration" value={effective.declaration ?? ''} onChange={e => update('declaration', e.target.value)} />
        <TextArea label="Footer Note" value={effective.footerNote ?? ''} onChange={e => update('footerNote', e.target.value)} placeholder="This is a computer generated invoice." />
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Razorpay Payment Gateway</h3>
        <label className="flex items-center gap-2 text-sm mb-3">
          <input type="checkbox" checked={effective.razorpayEnabled} onChange={e => update('razorpayEnabled', e.target.checked)} className="rounded text-amber-600" />
          Enable online payments via Razorpay
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Razorpay Key ID" value={effective.razorpayKeyId ?? ''} onChange={e => update('razorpayKeyId', e.target.value)} />
          <Input label="Razorpay Key Secret" type="password" value={effective.razorpayKeySecret ?? ''}
            onChange={e => update('razorpayKeySecret', e.target.value)}
            placeholder={settings?.razorpayKeySecretConfigured ? 'Configured — leave blank to keep' : 'Enter secret'} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}><Save size={15} /> Save Invoice Settings</Button>
      </div>
    </div>
  )
}

function SocialSettingsTab() {
  const qc = useQueryClient()
  const { data: settings, isLoading } = useQuery({ queryKey: ['social-settings'], queryFn: settingsApi.getSocialSettings })

  const [google, setGoogle] = useState({ accountName: '', accountExternalId: '', clientId: '', clientSecret: '', accessToken: '', refreshToken: '' })
  const [instagram, setInstagram] = useState({ accountName: '', accountExternalId: '', accessToken: '' })

  const googleMutation = useMutation({
    mutationFn: () => settingsApi.updateGoogleSocial(google),
    onSuccess: () => { toast.success('Google Business Profile settings saved'); qc.invalidateQueries({ queryKey: ['social-settings'] }) },
  })
  const instagramMutation = useMutation({
    mutationFn: () => settingsApi.updateInstagramSocial(instagram),
    onSuccess: () => { toast.success('Instagram settings saved'); qc.invalidateQueries({ queryKey: ['social-settings'] }) },
  })

  if (isLoading) return <div className="text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Google Business Profile</h3>
          <span className={`badge ${settings?.googleConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {settings?.googleConnected ? `Connected: ${settings.googleAccountName}` : 'Not connected'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Account / Location Name" value={google.accountName} onChange={e => setGoogle(p => ({ ...p, accountName: e.target.value }))} />
          <Input label="Location External ID" value={google.accountExternalId} onChange={e => setGoogle(p => ({ ...p, accountExternalId: e.target.value }))} />
          <Input label="OAuth Client ID" value={google.clientId} onChange={e => setGoogle(p => ({ ...p, clientId: e.target.value }))} />
          <Input label="OAuth Client Secret" type="password" value={google.clientSecret} onChange={e => setGoogle(p => ({ ...p, clientSecret: e.target.value }))} />
          <Input label="Access Token" type="password" value={google.accessToken} onChange={e => setGoogle(p => ({ ...p, accessToken: e.target.value }))} />
          <Input label="Refresh Token" type="password" value={google.refreshToken} onChange={e => setGoogle(p => ({ ...p, refreshToken: e.target.value }))} />
        </div>
        <div className="flex justify-end mt-3">
          <Button size="sm" onClick={() => googleMutation.mutate()} loading={googleMutation.isPending}>Save</Button>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Instagram (Meta Graph API)</h3>
          <span className={`badge ${settings?.instagramConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {settings?.instagramConnected ? `Connected: ${settings.instagramAccountName}` : 'Not connected'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Account Name" value={instagram.accountName} onChange={e => setInstagram(p => ({ ...p, accountName: e.target.value }))} />
          <Input label="Instagram Business Account ID" value={instagram.accountExternalId} onChange={e => setInstagram(p => ({ ...p, accountExternalId: e.target.value }))} />
          <Input label="Access Token" type="password" value={instagram.accessToken} onChange={e => setInstagram(p => ({ ...p, accessToken: e.target.value }))} className="col-span-2" />
        </div>
        <div className="flex justify-end mt-3">
          <Button size="sm" onClick={() => instagramMutation.mutate()} loading={instagramMutation.isPending}>Save</Button>
        </div>
      </div>
    </div>
  )
}

function MetalsTab() {
  const { data: metals, isLoading } = useQuery({ queryKey: ['metals'], queryFn: catalogApi.metals })
  const [editRate, setEditRate] = useState<{ metalId: string; purityId: string; current: number } | null>(null)
  const [newRate, setNewRate] = useState('')
  const qc = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: ({ metalId, purityId, rate }: { metalId: string; purityId: string; rate: number }) =>
      catalogApi.updateMetalRate(metalId, { purityId, ratePerGram: rate, source: 'Manual' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['metals'] }); setEditRate(null); toast.success('Rate updated') },
  })

  if (isLoading) return <div className="text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-4">
      {metals?.map(metal => (
        <div key={metal.id} className="card overflow-hidden">
          <div className="px-5 py-4 border-b bg-amber-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">{metal.name} ({metal.symbol})</h3>
              <p className="text-xs text-gray-500">Market Rate: ₹{metal.currentMarketRate.toFixed(2)}/g</p>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">
              <th className="table-th">Purity</th><th className="table-th">Percentage</th>
              <th className="table-th">Hallmark</th><th className="table-th text-right">Rate/g</th><th className="table-th"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {metal.purities?.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{p.name}</td>
                  <td className="table-td">{p.purityPercentage}%</td>
                  <td className="table-td font-mono text-xs">{p.hallmarkCode ?? '—'}</td>
                  <td className="table-td text-right font-bold text-amber-700">
                    {editRate?.purityId === p.id ? (
                      <input value={newRate} onChange={e => setNewRate(e.target.value)} autoFocus
                        className="w-28 px-2 py-1 border rounded text-right" type="number" step="0.01" />
                    ) : `₹${(metal.currentMarketRate * (p.purityPercentage / 100)).toFixed(2)}`}
                  </td>
                  <td className="table-td">
                    {editRate?.purityId === p.id ? (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => updateMutation.mutate({ metalId: metal.id, purityId: p.id, rate: Number(newRate) })} loading={updateMutation.isPending}><Save size={13} /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditRate(null)}>✕</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => { setEditRate({ metalId: metal.id, purityId: p.id, current: metal.currentMarketRate * p.purityPercentage / 100 }); setNewRate((metal.currentMarketRate * p.purityPercentage / 100).toFixed(2)) }}><Pencil size={13} /></Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

function CategoriesTab() {
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories })
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const qc = useQueryClient()

  const createMutation = useMutation({
    mutationFn: () => catalogApi.createCategory({ name, description: desc }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setShowAdd(false); setName(''); setDesc(''); toast.success('Category created') },
  })

  const renderCategory = (c: Category, depth = 0) => (
    <div key={c.id}>
      <div className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 border-b">
        <div style={{ paddingLeft: depth * 20 }}>
          <p className="font-medium text-sm">{depth > 0 && '↳ '}{c.name}</p>
          {c.description && <p className="text-xs text-gray-400">{c.description}</p>}
        </div>
      </div>
      {c.subCategories?.map(s => renderCategory(s, depth + 1))}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Category</Button>
      </div>
      <div className="card overflow-hidden">
        {categories?.map(c => renderCategory(c))}
      </div>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Category" size="sm"
        footer={<Button onClick={() => createMutation.mutate()} loading={createMutation.isPending}>Create</Button>}>
        <div className="space-y-3">
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} />
          <TextArea label="Description" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
      </Modal>
    </div>
  )
}

function SuppliersTab() {
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: catalogApi.suppliers })
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<Partial<Supplier>>({})
  const qc = useQueryClient()

  const createMutation = useMutation({
    mutationFn: () => catalogApi.createSupplier(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setShowAdd(false); toast.success('Supplier created') },
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Supplier</Button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b">
            <th className="table-th">Name</th><th className="table-th">Contact</th>
            <th className="table-th">Phone</th><th className="table-th">City</th><th className="table-th">GST</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {suppliers?.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="table-td font-medium">{s.name}</td>
                <td className="table-td">{s.contactPerson ?? '—'}</td>
                <td className="table-td">{s.phone ?? '—'}</td>
                <td className="table-td">{s.city ?? '—'}</td>
                <td className="table-td font-mono text-xs">{s.gstNumber ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Supplier" size="md"
        footer={<Button onClick={() => createMutation.mutate()} loading={createMutation.isPending}>Create</Button>}>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Name *" value={form.name ?? ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="col-span-2" />
          <Input label="Contact Person" value={form.contactPerson ?? ''} onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))} />
          <Input label="Phone" value={form.phone ?? ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          <Input label="Email" value={form.email ?? ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          <Input label="City" value={form.city ?? ''} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
          <Input label="GST Number" value={form.gstNumber ?? ''} onChange={e => setForm(p => ({ ...p, gstNumber: e.target.value }))} className="col-span-2" />
        </div>
      </Modal>
    </div>
  )
}

function TemplatesTab() {
  const { data: templates } = useQuery({ queryKey: ['label-templates'], queryFn: catalogApi.labelTemplates })
  const tagNames: Record<number, string> = { 1: 'Barcode', 2: 'RFID', 3: 'QR Code' }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Label Templates</h3>
        <p className="text-xs text-gray-400">Used by the Bartender printing system</p>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 border-b">
          <th className="table-th">Name</th><th className="table-th">Tag Type</th>
          <th className="table-th">Bartender Template</th>
          <th className="table-th">Size (mm)</th><th className="table-th">Default</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {templates?.map(t => (
            <tr key={t.id} className="hover:bg-gray-50">
              <td className="table-td font-medium">{t.name}</td>
              <td className="table-td">{tagNames[t.tagType] ?? '—'}</td>
              <td className="table-td font-mono text-xs">{t.bartenderTemplateName}</td>
              <td className="table-td">{t.labelWidthMm}×{t.labelHeightMm}</td>
              <td className="table-td">{t.isDefault ? <span className="badge bg-green-100 text-green-700">Yes</span> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RFIDTab() {
  return (
    <div className="card p-8 text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Wifi size={32} className="text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">RFID Reader Configuration</h3>
      <p className="text-gray-500 text-sm max-w-md mx-auto">
        RFID reader profiles are managed at the system level. Each tenant can have specific readers
        with their own connection parameters. Please use the API or contact your system administrator
        to configure RFID readers.
      </p>
      <div className="mt-6 text-left bg-gray-50 rounded-xl p-4 text-sm">
        <p className="font-semibold mb-2">Supported Manufacturers:</p>
        <ul className="text-gray-600 space-y-1">
          <li>• Zebra (ZT Series)</li>
          <li>• Impinj (Speedway, Speedway Revolution)</li>
          <li>• Alien Technology (ALR-9900)</li>
          <li>• Nordic ID (Stix, Merlin)</li>
          <li>• Jadak (ThingMagic series)</li>
          <li>• Generic USB/TCP RFID Readers</li>
        </ul>
      </div>
    </div>
  )
}
