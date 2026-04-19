import { useMemo, useState } from 'react'
import jsPDF from 'jspdf'
import {
  calculateScenario,
  defaultFormValues,
  formatCurrency,
} from './utils/calculations'
import { labels } from './utils/translations'

const numberFields = ['buyPrice', 'sellPrice', 'quantity', 'annualIncome']

function App() {
  const [lang, setLang] = useState('en')
  const [openBreakdown, setOpenBreakdown] = useState(true)
  const [compareMode, setCompareMode] = useState(false)
  const [form, setForm] = useState(defaultFormValues)

  const t = labels[lang]
  const result = useMemo(() => calculateScenario(form), [form])
  const deliveryCompare = useMemo(() => calculateScenario(form, 'delivery'), [form])
  const intradayCompare = useMemo(() => calculateScenario(form, 'intraday'), [form])

  const onChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: numberFields.includes(key) ? Number(value) : value,
    }))
  }

  const onSettingChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: Number(value),
      },
    }))
  }

  const resetForm = () => {
    setForm({
      ...defaultFormValues,
      buyDate: '',
      sellDate: '',
      tradeDate: '',
      buyPrice: 0,
      sellPrice: 0,
      quantity: 0,
      annualIncome: 0,
    })
  }

  const loadExamples = () => setForm(defaultFormValues)

  const generatePdf = () => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Stock Sell Net Profit Calculator (India)', 14, 16)
    doc.setFontSize(11)
    const lines = [
      `Mode: ${result.mode}`,
      `Total Investment: ${formatCurrency(result.buyValue)}`,
      `Total Sell Value: ${formatCurrency(result.sellValue)}`,
      `Gross Profit/Loss: ${formatCurrency(result.grossProfit)}`,
      `Tax Type: ${result.taxType}`,
      `Tax Amount: ${formatCurrency(result.taxAmount)}`,
      `Total Charges: ${formatCurrency(result.totalCharges)}`,
      `Final Net Profit/Loss: ${formatCurrency(result.netProfit)}`,
      `Effective Deduction: ${result.effectiveDeduction}%`,
      '',
      'Note: This is an estimate and actual tax may vary.',
    ]
    lines.forEach((line, index) => doc.text(line, 14, 30 + index * 8))
    doc.save('stock-sell-net-profit-report.pdf')
  }

  const renderResultCard = (res, heading) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft animate-fadeSlide">
      <h3 className="font-semibold text-slate-800">{heading}</h3>
      <p className="mt-2 text-sm text-slate-600">Gross: {formatCurrency(res.grossProfit)}</p>
      <p className={`text-lg font-bold ${res.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
        Net: {formatCurrency(res.netProfit)}
      </p>
      <p className="text-xs text-slate-500">Tax: {formatCurrency(res.taxAmount)} | Charges: {formatCurrency(res.totalCharges)}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{t.title}</h1>
            <p className="text-sm text-slate-600">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white p-1 shadow-soft">
            <button onClick={() => setLang('en')} className={`rounded-md px-3 py-1 text-sm ${lang === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>EN</button>
            <button onClick={() => setLang('hi')} className={`rounded-md px-3 py-1 text-sm ${lang === 'hi' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>हिंदी</button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-soft">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-sm font-medium">{t.type}</span>
                <select value={form.mode} onChange={(e) => onChange('mode', e.target.value)} className="w-full rounded-lg border border-slate-300 p-2">
                  <option value="delivery">{t.delivery}</option>
                  <option value="intraday">{t.intraday}</option>
                </select>
              </label>

              <Input label={t.buyPrice} type="number" value={form.buyPrice} onChange={(v) => onChange('buyPrice', v)} />
              <Input label={t.sellPrice} type="number" value={form.sellPrice} onChange={(v) => onChange('sellPrice', v)} />
              <Input label={t.quantity} type="number" value={form.quantity} onChange={(v) => onChange('quantity', v)} />

              {form.mode === 'delivery' ? (
                <>
                  <Input label={t.buyDate} type="date" value={form.buyDate} onChange={(v) => onChange('buyDate', v)} />
                  <Input label={t.sellDate} type="date" value={form.sellDate} onChange={(v) => onChange('sellDate', v)} />
                </>
              ) : (
                <>
                  <Input label={t.annualIncome} type="number" value={form.annualIncome} onChange={(v) => onChange('annualIncome', v)} />
                  <Input label={t.tradeDate} type="date" value={form.tradeDate} onChange={(v) => onChange('tradeDate', v)} />
                </>
              )}

              <Input label={t.brokerage} type="number" value={form.settings.brokeragePerOrder} onChange={(v) => onSettingChange('brokeragePerOrder', v)} />

              <label className="mt-2 flex items-center gap-2 text-sm font-medium sm:col-span-2">
                <input type="checkbox" checked={form.includeDpCharges} onChange={(e) => setForm((prev) => ({ ...prev, includeDpCharges: e.target.checked }))} />
                {t.includeDp}
              </label>

              <details className="sm:col-span-2">
                <summary className="cursor-pointer text-sm font-semibold text-indigo-700">{t.advanced}</summary>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  <Input label={t.exchange} type="number" step="0.000001" value={form.settings.exchangeRate} onChange={(v) => onSettingChange('exchangeRate', v)} />
                  <Input label={t.sebi} type="number" step="0.000001" value={form.settings.sebiRate} onChange={(v) => onSettingChange('sebiRate', v)} />
                  <Input label={t.stamp} type="number" step="0.000001" value={form.settings.stampDutyRate} onChange={(v) => onSettingChange('stampDutyRate', v)} />
                </div>
              </details>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={loadExamples} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">{t.example}</button>
              <button onClick={resetForm} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">{t.reset}</button>
              <button onClick={() => setCompareMode((v) => !v)} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">{t.compare}</button>
              <button onClick={generatePdf} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{t.download}</button>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl bg-white p-5 shadow-soft">
            <h2 className="text-xl font-semibold text-slate-900">{t.report}</h2>
            <SummaryRow label="Total Investment" value={formatCurrency(result.buyValue)} />
            <SummaryRow label="Total Sell Value" value={formatCurrency(result.sellValue)} />
            <SummaryRow label="Gross Profit / Loss" value={formatCurrency(result.grossProfit)} />
            <SummaryRow label="Holding Period" value={result.mode === 'delivery' ? `${result.holdingDays ?? '-'} days` : 'Intraday'} />
            <SummaryRow label="Tax Type Applied" value={result.taxType} />
            <SummaryRow label="Tax Amount" value={formatCurrency(result.taxAmount)} />
            <SummaryRow label="Total Charges" value={formatCurrency(result.totalCharges)} />
            <SummaryRow
              label="Final Net Profit / Loss"
              value={formatCurrency(result.netProfit)}
              className={result.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}
            />
            <SummaryRow label="Effective Deduction" value={`${result.effectiveDeduction}%`} />

            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{result.smartMessage}</div>
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{t.disclaimer}</div>

            <div>
              <button onClick={() => setOpenBreakdown((v) => !v)} className="text-sm font-semibold text-indigo-700">
                {t.taxBreakdown} {openBreakdown ? '▲' : '▼'}
              </button>
              {openBreakdown && (
                <div className="mt-2 rounded-lg border border-slate-200 p-3 text-sm animate-fadeSlide">
                  {Object.entries(result.charges).map(([k, v]) => (
                    <SummaryRow key={k} label={k} value={formatCurrency(v)} compact />
                  ))}
                </div>
              )}
            </div>

            {compareMode && (
              <div className="grid gap-3 md:grid-cols-2">
                {renderResultCard(deliveryCompare, 'Delivery View')}
                {renderResultCard(intradayCompare, 'Intraday View')}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <h3 className="mb-2 font-semibold">{t.notes}</h3>
              <ul className="list-disc space-y-1 pl-5">
                <li>STCG: Profit on delivery shares held less than 12 months is taxed at 20%.</li>
                <li>LTCG: On holdings of 12 months+, gains above ₹1,25,000 are taxed at 12.5%.</li>
                <li>Intraday: Considered business income and taxed via slabs under new regime + 4% cess.</li>
                <li>Charges include brokerage, STT, exchange fee, SEBI fee, GST, stamp duty and optional DP charges.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', step }) {
  return (
    <label>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none transition focus:border-indigo-500"
      />
    </label>
  )
}

function SummaryRow({ label, value, className = '', compact = false }) {
  return (
    <div className={`flex items-center justify-between ${compact ? 'py-1' : 'py-0.5'}`}>
      <span className="text-sm text-slate-600 capitalize">{label}</span>
      <span className={`text-sm font-semibold text-slate-900 ${className}`}>{value}</span>
    </div>
  )
}

export default App
