const DEFAULT_SETTINGS = {
  brokeragePerOrder: 20,
  exchangeRate: 0.0000325,
  sebiRate: 0.000001,
  stampDutyRate: 0.00015,
  dpCharges: 13.5,
}

const NEW_REGIME_SLABS = [
  { upto: 400000, rate: 0 },
  { upto: 800000, rate: 0.05 },
  { upto: 1200000, rate: 0.1 },
  { upto: 1600000, rate: 0.15 },
  { upto: 2000000, rate: 0.2 },
  { upto: 2400000, rate: 0.25 },
  { upto: Number.POSITIVE_INFINITY, rate: 0.3 },
]

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100

export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value || 0)

export const calculateIncomeTaxNewRegime = (income) => {
  if (income <= 0) return 0

  let tax = 0
  let previousLimit = 0

  for (const slab of NEW_REGIME_SLABS) {
    if (income <= previousLimit) break

    const taxableAmount = Math.min(income, slab.upto) - previousLimit
    if (taxableAmount > 0) tax += taxableAmount * slab.rate
    previousLimit = slab.upto
  }

  return round2(tax * 1.04)
}

export const calculateHoldingDays = (buyDate, sellDate) => {
  if (!buyDate || !sellDate) return null
  const buy = new Date(buyDate)
  const sell = new Date(sellDate)
  if (Number.isNaN(buy.getTime()) || Number.isNaN(sell.getTime()) || sell < buy) return null
  return Math.floor((sell - buy) / (1000 * 60 * 60 * 24))
}

const buildCharges = ({ buyValue, sellValue, type, quantity, settings, includeDpCharges }) => {
  const brokerageOrders = type === 'delivery' ? 2 : 2
  const brokerage = settings.brokeragePerOrder * brokerageOrders
  const stt = type === 'delivery' ? sellValue * 0.001 : sellValue * 0.00025
  const exchangeTx = (buyValue + sellValue) * settings.exchangeRate
  const sebi = (buyValue + sellValue) * settings.sebiRate
  const stampDuty = buyValue * settings.stampDutyRate
  const dpCharges = type === 'delivery' && includeDpCharges ? settings.dpCharges : 0
  const gst = (brokerage + exchangeTx + sebi) * 0.18

  const charges = {
    brokerage: round2(brokerage),
    stt: round2(stt),
    exchangeTx: round2(exchangeTx),
    sebi: round2(sebi),
    gst: round2(gst),
    stampDuty: round2(stampDuty),
    dpCharges: round2(dpCharges),
  }

  const totalCharges = round2(Object.values(charges).reduce((acc, item) => acc + item, 0))

  return { charges, totalCharges }
}

export const calculateScenario = (formValues, modeOverride = null) => {
  const mode = modeOverride || formValues.mode
  const settings = { ...DEFAULT_SETTINGS, ...formValues.settings }

  const buyValue = Number(formValues.buyPrice || 0) * Number(formValues.quantity || 0)
  const sellValue = Number(formValues.sellPrice || 0) * Number(formValues.quantity || 0)
  const grossProfit = round2(sellValue - buyValue)

  const { charges, totalCharges } = buildCharges({
    buyValue,
    sellValue,
    type: mode,
    quantity: Number(formValues.quantity || 0),
    settings,
    includeDpCharges: !!formValues.includeDpCharges,
  })

  let taxAmount = 0
  let taxType = 'None'
  let holdingDays = null
  let smartMessage = ''

  if (mode === 'delivery') {
    holdingDays = calculateHoldingDays(formValues.buyDate, formValues.sellDate)

    if (grossProfit <= 0) {
      taxType = 'No Capital Gains Tax'
      smartMessage = 'No capital gains tax because trade is in loss or breakeven.'
    } else if (holdingDays !== null && holdingDays < 365) {
      taxType = 'STCG @ 20%'
      taxAmount = round2(grossProfit * 0.2)
      smartMessage = 'STCG applied because holding period is less than 12 months.'
    } else {
      taxType = 'LTCG @ 12.5% above ₹1,25,000'
      const taxableLtcg = Math.max(0, grossProfit - 125000)
      taxAmount = round2(taxableLtcg * 0.125)
      smartMessage = taxableLtcg > 0
        ? 'LTCG exemption used up to ₹1,25,000.'
        : 'LTCG exemption used up to ₹1,25,000. No tax due for this trade.'
    }
  } else {
    const baseIncome = Number(formValues.annualIncome || 0)
    const intradayProfit = Math.max(0, grossProfit)
    const taxBefore = calculateIncomeTaxNewRegime(baseIncome)
    const taxAfter = calculateIncomeTaxNewRegime(baseIncome + intradayProfit)
    taxAmount = round2(taxAfter - taxBefore)
    taxType = 'Intraday tax impact (new regime + cess)'
    smartMessage = `Intraday income increased your total tax by ${formatCurrency(taxAmount)}.`
  }

  const netProfit = round2(grossProfit - totalCharges - taxAmount)
  const effectiveDeduction = grossProfit !== 0
    ? round2(((totalCharges + taxAmount) / Math.abs(grossProfit)) * 100)
    : 0

  return {
    mode,
    buyValue: round2(buyValue),
    sellValue: round2(sellValue),
    grossProfit,
    holdingDays,
    taxType,
    taxAmount,
    charges,
    totalCharges,
    netProfit,
    effectiveDeduction,
    smartMessage,
  }
}

export const defaultFormValues = {
  mode: 'delivery',
  buyPrice: 100,
  sellPrice: 120,
  quantity: 100,
  buyDate: '2025-04-01',
  sellDate: '2026-04-15',
  annualIncome: 1000000,
  tradeDate: '2026-04-19',
  includeDpCharges: true,
  settings: DEFAULT_SETTINGS,
}
