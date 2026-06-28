import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { salesApi, customerApi, opsApi, leadsApi } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { useGSTRates } from '../../hooks/useGSTRates';

// ── helpers ───────────────────────────────────────────────────────────────────

function calcRow(row, txType = 'intra') {
  const qty = parseFloat(row.qty) || 0;
  const price = parseFloat(row.price) || 0;
  const discPct = parseFloat(row.discount_pct) || 0;
  const taxPct = parseFloat(row.tax_pct) || 0;
  const discount_amt = +(qty * price * discPct / 100).toFixed(2);
  const taxable = qty * price - discount_amt;
  const tax_amt = +(taxable * taxPct / 100).toFixed(2);
  const amount = +(taxable + tax_amt).toFixed(2);
  let cgst_pct = 0, cgst_amt = 0, sgst_pct = 0, sgst_amt = 0, igst_pct = 0, igst_amt = 0;
  if (txType === 'inter') {
    igst_pct = taxPct; igst_amt = tax_amt;
  } else {
    cgst_pct = +(taxPct / 2).toFixed(2); cgst_amt = +(tax_amt / 2).toFixed(2);
    sgst_pct = cgst_pct; sgst_amt = +(tax_amt - cgst_amt).toFixed(2);
  }
  return { ...row, discount_amt, tax_amt, cgst_pct, cgst_amt, sgst_pct, sgst_amt, igst_pct, igst_amt, amount };
}

function calcTotals(items, transport = 0, roundOff = 0) {
  const subtotal = items.reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0), 0);
  const discount_total = items.reduce((s, r) => s + (parseFloat(r.discount_amt) || 0), 0);
  const tax_total = items.reduce((s, r) => s + (parseFloat(r.tax_amt) || 0), 0);
  const cgst_total = items.reduce((s, r) => s + (parseFloat(r.cgst_amt) || 0), 0);
  const sgst_total = items.reduce((s, r) => s + (parseFloat(r.sgst_amt) || 0), 0);
  const igst_total = items.reduce((s, r) => s + (parseFloat(r.igst_amt) || 0), 0);
  const total = subtotal - discount_total + tax_total + parseFloat(transport || 0) + parseFloat(roundOff || 0);
  return {
    subtotal: +subtotal.toFixed(2),
    discount_total: +discount_total.toFixed(2),
    tax_total: +tax_total.toFixed(2),
    cgst_total: +cgst_total.toFixed(2),
    sgst_total: +sgst_total.toFixed(2),
    igst_total: +igst_total.toFixed(2),
    total: +total.toFixed(2),
  };
}

function determineTxType(tenantState, customerState) {
  if (!tenantState || !customerState) return 'intra';
  return tenantState.trim().toLowerCase() === customerState.trim().toLowerCase() ? 'intra' : 'inter';
}

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);
}

const TODAY = new Date().toISOString().slice(0, 10);
const BLANK_ROW = { name: '', description: '', product_id: null, hsn: '', unit: 'pcs', qty: 1, price: '', discount_pct: 0, discount_amt: 0, tax_pct: 0, tax_amt: 0, amount: 0 };

const INDIAN_STATES = [
  'Andaman & Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam',
  'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const DOC_CONFIG = {
  quotation: {
    title: 'Quotation', prefix: 'QT', noField: 'quote_no',
    dateLabel: 'Quotation Date', expiryLabel: 'Valid Until',
    showTransport: false, showPayment: false,
    create: (data) => salesApi.createQuotation(data),
    update: (id, data) => salesApi.updateQuotation(id, data),
    listPath: '/sales/quotations',
  },
  pi: {
    title: 'Proforma Invoice', prefix: 'PI', noField: 'pi_no',
    dateLabel: 'PI Date', expiryLabel: 'Valid Until',
    showTransport: false, showPayment: false, showSaleType: true,
    create: (data) => salesApi.createPI(data),
    update: (id, data) => salesApi.updatePI(id, data),
    listPath: '/sales/pi',
  },
  invoice: {
    title: 'Sales Invoice', prefix: 'INV', noField: 'invoice_no',
    dateLabel: 'Invoice Date', expiryLabel: 'Due Date',
    showTransport: true, showPayment: true, showSaleType: true,
    create: (data) => salesApi.createInvoice(data),
    update: (id, data) => salesApi.updateInvoice(id, data),
    listPath: '/sales/invoices',
  },
  challan: {
    title: 'Delivery Challan', prefix: 'DC', noField: 'challan_no',
    dateLabel: 'Challan Date', expiryLabel: 'Due Date',
    showTransport: false, showPayment: false,
    create: (data) => salesApi.createChallan(data),
    update: (id, data) => salesApi.updateChallan(id, data),
    listPath: '/sales/challans',
  },
};

// ── Number to Words ───────────────────────────────────────────────────────────

function numToWords(n) {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function cvt(x) {
    if (x < 20) return ones[x];
    if (x < 100) return tens[Math.floor(x/10)] + (x%10 ? ' '+ones[x%10] : '');
    if (x < 1000) return ones[Math.floor(x/100)]+' Hundred'+(x%100 ? ' '+cvt(x%100) : '');
    if (x < 100000) return cvt(Math.floor(x/1000))+' Thousand'+(x%1000 ? ' '+cvt(x%1000) : '');
    if (x < 10000000) return cvt(Math.floor(x/100000))+' Lakh'+(x%100000 ? ' '+cvt(x%100000) : '');
    return cvt(Math.floor(x/10000000))+' Crore'+(x%10000000 ? ' '+cvt(x%10000000) : '');
  }
  const amt = Math.round(n * 100) / 100;
  const intPart = Math.floor(amt);
  const paise = Math.round((amt - intPart) * 100);
  let w = (intPart === 0 ? 'Zero' : cvt(intPart)) + ' Rupees';
  if (paise > 0) w += ' and ' + cvt(paise) + ' Paise';
  return w + ' only';
}

// ── Print View ────────────────────────────────────────────────────────────────

function PrintView({ docType, cfg, existing, form, rows, totals, partyName, partyPhone, party, tenant, txType, supplyState, saleType }) {
  const docNo = existing?.[cfg.noField] || '—';
  const docDate = form.date || form.invoice_date || '';
  const dueDate = form.valid_until || form.due_date || '';
  const transport = parseFloat(form.transport_charges) || 0;
  const received = parseFloat(form.amount_received) || 0;
  const balance = totals.total - received;
  const validRows = rows.filter(r => r.name);
  const totalQty = validRows.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0);

  const borderStyle = '1px solid #999';
  const cellStyle = (extra = {}) => ({ border: borderStyle, padding: '5px 8px', ...extra });

  return (
    <div className="print-only" style={{ display: 'none', fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#000', padding: '8px 16px', maxWidth: 800, margin: '0 auto', boxSizing: 'border-box' }}>
      <h2 style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
        {docType === 'quotation' ? 'Quotation' : docType === 'pi' ? 'Proforma Invoice' : 'Tax Invoice'}
      </h2>

      {/* All sections in one bordered container — no gap between tables */}
      <div style={{ border: '1px solid #000' }}>

        {/* Company header + Bill To */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #000' }}>
          <tbody>
            <tr>
              <td style={{ padding: '8px 10px', borderRight: '1px solid #000', width: '38%', verticalAlign: 'top' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  {tenant?.logo_url
                    ? <img src={tenant.logo_url} alt="logo" style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }} />
                    : <div style={{ width: 48, height: 48, background: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8, fontWeight: 'bold', flexShrink: 0 }}>LOGO</div>
                  }
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: 14 }}>{tenant?.name || 'My Company'}</div>
                    {tenant?.address && <div style={{ fontSize: 10, color: '#444', marginTop: 2, whiteSpace: 'pre-line' }}>{tenant.address}</div>}
                    {tenant?.phone && <div style={{ fontSize: 10, color: '#444' }}>Ph: {tenant.phone}</div>}
                    {tenant?.email && <div style={{ fontSize: 10, color: '#444' }}>{tenant.email}</div>}
                    {tenant?.gstin && <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>GSTIN: <strong>{tenant.gstin}</strong></div>}
                  </div>
                </div>
              </td>
              <td style={{ padding: '8px 10px', verticalAlign: 'top', width: '37%', borderRight: '1px solid #999' }}>
                <div style={{ fontWeight: 'bold', color: '#555', fontSize: 10, marginBottom: 3 }}>Bill To:</div>
                <div style={{ fontWeight: 'bold', fontSize: 12 }}>{partyName || '—'}</div>
                {/* customer: contact person / lead: company name */}
                {party?.contact && party.contact !== partyName && (
                  <div style={{ fontSize: 10, color: '#444' }}>Attn: {party.contact}</div>
                )}
                {party?.company && party._type === 'lead' && (
                  <div style={{ fontSize: 10, color: '#444' }}>{party.company}</div>
                )}
                {partyPhone && <div style={{ fontSize: 10, color: '#444', marginTop: 1 }}>Ph: {partyPhone}</div>}
                {party?.email && <div style={{ fontSize: 10, color: '#444' }}>{party.email}</div>}
                {/* lead: text address field */}
                {party?.address && party._type === 'lead' && (
                  <div style={{ fontSize: 10, color: '#444', marginTop: 2, whiteSpace: 'pre-line' }}>{party.address}</div>
                )}
                {/* customer: full billing address */}
                {party?.billing_street && (
                  <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>{party.billing_street}</div>
                )}
                {(party?.city || party?.billing_state || party?.billing_pincode) && (
                  <div style={{ fontSize: 10, color: '#444' }}>
                    {[party.city, party.billing_state, party.billing_pincode].filter(Boolean).join(', ')}
                  </div>
                )}
                {party?.gstin && <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>GSTIN: <strong>{party.gstin}</strong></div>}
                {/* Ship To — show when shipping differs from billing */}
                {party?._type !== 'lead' && party?.shipping_same === false && (
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed #ccc' }}>
                    <div style={{ fontWeight: 'bold', color: '#555', fontSize: 10, marginBottom: 2 }}>Ship To:</div>
                    <div style={{ fontSize: 10, color: '#444', fontWeight: 'bold' }}>{partyName}</div>
                    {party.shipping_street && <div style={{ fontSize: 10, color: '#444' }}>{party.shipping_street}</div>}
                    <div style={{ fontSize: 10, color: '#444' }}>
                      {[party.shipping_city, party.shipping_state, party.shipping_pincode].filter(Boolean).join(', ')}
                    </div>
                  </div>
                )}
              </td>
              <td style={{ padding: '8px 10px', verticalAlign: 'top' }}>
                <div style={{ fontWeight: 'bold', color: '#555', marginBottom: 4 }}>
                  {docType === 'quotation' ? 'Quotation Details:' : docType === 'pi' ? 'PI Details:' : 'Invoice Details:'}
                </div>
                <div>No: &nbsp;<strong>{docNo}</strong></div>
                <div>Date: &nbsp;{docDate ? new Date(docDate).toLocaleDateString('en-IN') : '—'}</div>
                {dueDate && <div>{docType === 'invoice' ? 'Due' : 'Valid'}: &nbsp;{new Date(dueDate).toLocaleDateString('en-IN')}</div>}
                {(docType === 'invoice' || docType === 'pi') && saleType && (
                  <div style={{ marginTop: 2 }}>Payment: &nbsp;<strong style={{ color: saleType === 'cash' ? '#1a7a4a' : '#b45309' }}>{saleType === 'cash' ? 'Cash' : 'Credit'}</strong></div>
                )}
                {supplyState && (
                  <div style={{ marginTop: 2, fontSize: 10, color: '#444' }}>Place of Supply: &nbsp;{supplyState}</div>
                )}
                {txType && supplyState && (
                  <div style={{ fontSize: 10, color: '#666' }}>Tax Type: &nbsp;{txType === 'inter' ? 'IGST' : 'CGST + SGST'}</div>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Items table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #000' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              {[
                { label: '#', align: 'center', w: '4%' },
                { label: 'Item name', align: 'left', w: '18%' },
                { label: 'Description', align: 'left', w: '18%' },
                { label: 'HSN/ SAC', align: 'center', w: '8%' },
                { label: 'Quantity', align: 'right', w: '7%' },
                { label: 'Price/ Unit(₹)', align: 'right', w: '13%' },
                { label: 'Discount(₹)', align: 'right', w: '14%' },
                { label: 'Amount(₹)', align: 'right', w: '13%' },
              ].map(h => (
                <th key={h.label} style={{ border: '1px solid #ccc', padding: '5px 6px', textAlign: h.align, fontSize: 11, width: h.w }}>{h.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {validRows.map((r, i) => (
              <tr key={i}>
                <td style={cellStyle({ textAlign: 'center' })}>{i+1}</td>
                <td style={cellStyle()}>{r.name}</td>
                <td style={cellStyle()}>{r.description || ''}</td>
                <td style={cellStyle({ textAlign: 'center' })}>{r.hsn || ''}</td>
                <td style={cellStyle({ textAlign: 'right' })}>{r.qty}</td>
                <td style={cellStyle({ textAlign: 'right' })}>₹ {parseFloat(r.price||0).toFixed(2)}</td>
                <td style={cellStyle({ textAlign: 'right' })}>
                  {parseFloat(r.discount_amt||0) > 0 ? `₹ ${parseFloat(r.discount_amt).toFixed(2)} (${r.discount_pct}%)` : '₹ 0.00 (0%)'}
                </td>
                <td style={cellStyle({ textAlign: 'right' })}>₹ {parseFloat(r.amount||0).toFixed(2)}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 'bold', background: '#fafafa' }}>
              <td style={cellStyle()} />
              <td style={cellStyle()}>Total</td>
              <td style={cellStyle()} />
              <td style={cellStyle()} />
              <td style={cellStyle({ textAlign: 'right' })}>{totalQty}</td>
              <td style={cellStyle()} />
              <td style={cellStyle({ textAlign: 'right' })}>₹ {totals.discount_total.toFixed(2)}</td>
              <td style={cellStyle({ textAlign: 'right' })}>₹ {totals.total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Summary rows */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #000' }}>
          <tbody>
            {[
              ['Sub Total', `₹ ${totals.subtotal.toFixed(2)}`, false],
              ...(totals.discount_total > 0 ? [['Discount', `- ₹ ${totals.discount_total.toFixed(2)}`, false]] : []),
              ...(totals.tax_total > 0 && txType === 'intra'
                ? [
                    [`CGST`, `₹ ${(totals.cgst_total || 0).toFixed(2)}`, false],
                    [`SGST`, `₹ ${(totals.sgst_total || 0).toFixed(2)}`, false],
                  ]
                : totals.tax_total > 0
                ? [['IGST', `₹ ${(totals.igst_total || 0).toFixed(2)}`, false]]
                : []),
              ...(transport > 0 ? [['Transport / Freight', `₹ ${transport.toFixed(2)}`, false]] : []),
              ['Total', `₹ ${totals.total.toFixed(2)}`, true],
            ].map(([label, val, bold]) => (
              <tr key={label} style={bold ? { fontWeight: 'bold' } : {}}>
                <td style={cellStyle({ width: '50%' })}>{label}</td>
                <td style={cellStyle({ width: '5%' })}>:</td>
                <td style={cellStyle({ textAlign: 'right' })}>{val}</td>
              </tr>
            ))}
            <tr><td colSpan={3} style={cellStyle({ fontWeight: 'bold' })}>Invoice Amount in Words:</td></tr>
            <tr><td colSpan={3} style={cellStyle({ color: '#c00' })}>{numToWords(totals.total)}</td></tr>
            {docType === 'invoice' && <>
              <tr>
                <td style={cellStyle()}>Received</td>
                <td style={cellStyle()}>:</td>
                <td style={cellStyle({ textAlign: 'right' })}>₹ {received.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={cellStyle()}>Balance</td>
                <td style={cellStyle()}>:</td>
                <td style={cellStyle({ textAlign: 'right' })}>₹ {balance.toFixed(2)}</td>
              </tr>
              {totals.discount_total > 0 && (
                <tr>
                  <td style={cellStyle()}>You Saved</td>
                  <td style={cellStyle()}>:</td>
                  <td style={cellStyle({ textAlign: 'right' })}>₹ {totals.discount_total.toFixed(2)}</td>
                </tr>
              )}
            </>}
          </tbody>
        </table>

        {/* Bank Details + Signatory */}
        {(tenant?.bank_name || tenant?.bank_account_number) && (
          <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #000' }}>
            <tbody>
              <tr>
                <td style={cellStyle({ fontWeight: 'bold', fontSize: 10 })} colSpan={2}>Bank Details:</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 8px', fontSize: 10, width: '50%', verticalAlign: 'top' }}>
                  {tenant.bank_name && <div><strong>Bank:</strong> {tenant.bank_name}{tenant.bank_branch ? `, ${tenant.bank_branch}` : ''}</div>}
                  {tenant.bank_account_holder && <div><strong>Account Name:</strong> {tenant.bank_account_holder}</div>}
                </td>
                <td style={{ padding: '4px 8px', fontSize: 10, width: '50%', verticalAlign: 'top' }}>
                  {tenant.bank_account_number && <div><strong>Account No:</strong> {tenant.bank_account_number}</div>}
                  {tenant.bank_ifsc && <div><strong>IFSC:</strong> {tenant.bank_ifsc}</div>}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Terms + Signatory */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr><td colSpan={2} style={cellStyle({ fontWeight: 'bold' })}>Terms &amp; Conditions:</td></tr>
            <tr>
              <td style={cellStyle({ color: '#c00', width: '60%', verticalAlign: 'top', minHeight: 60 })}>
                {form.terms || 'Goods once sold will not be taken back.'}
              </td>
              <td style={cellStyle({ verticalAlign: 'top' })}>
                <div style={{ fontWeight: 'bold', marginBottom: 48 }}>For {tenant?.name || 'My Company'}:</div>
                <div style={{ textAlign: 'center', color: '#555', borderTop: '1px solid #999', paddingTop: 4 }}>Authorized Signatory</div>
              </td>
            </tr>
          </tbody>
        </table>

      </div>
    </div>
  );
}

// ── Item Row ──────────────────────────────────────────────────────────────────

function ItemRow({ row, idx, products, gstRates, onChange, onRemove, onProductCreated }) {
  const [search, setSearch] = useState(row.name || '');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newProd, setNewProd] = useState({ name: '', unit: 'pcs', price: '', tax_pct: 18, hsn: '', sku: '', is_service: false });
  const [prodSaving, setProdSaving] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 288 });
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  function openDrop() {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 2, left: r.left, width: Math.max(r.width, 288) });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open || search.length < 1) { setSearchResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await opsApi.listProducts({ search, limit: 12 });
        setSearchResults(Array.isArray(r.data) ? r.data : (r.data?.items || r.data?.results || []));
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [search, open]);

  // merge API results with locally created products not yet in DB search
  const filtered = [
    ...searchResults,
    ...products.filter(p => !searchResults.find(r => r.id === p.id) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase()))
    ),
  ].slice(0, 12);

  function selectProduct(p) {
    const updated = {
      ...row, product_id: p.id, name: p.name,
      description: p.description || '',
      hsn: p.hsn_code || '', unit: p.unit || 'pcs',
      price: parseFloat(p.selling_price) || 0,
      tax_pct: parseFloat(p.tax_rate) || 0,
    };
    onChange(idx, calcRow(updated));
    setSearch(p.name);
    setOpen(false);
    setCreating(false);
  }

  function updateField(field, value) {
    const updated = { ...row, [field]: value };
    onChange(idx, calcRow(updated));
    if (field === 'name') setSearch(value);
  }

  function openCreate(isService = false) {
    setCreating(true);
    setNewProd(n => ({ ...n, name: search, is_service: isService, unit: isService ? 'hrs' : 'pcs' }));
  }

  async function handleCreateProduct() {
    if (!newProd.name.trim() || !newProd.price) { toast.error('Name and price required'); return; }
    setProdSaving(true);
    try {
      const sku = newProd.sku.trim() || `ITEM-${Date.now()}`;
      const r = await opsApi.createProduct({
        sku,
        name: newProd.name.trim(),
        unit: newProd.unit || (newProd.is_service ? 'hrs' : 'pcs'),
        selling_price: parseFloat(newProd.price),
        cost_price: 0,
        tax_rate: parseFloat(newProd.tax_pct) || 0,
        hsn_code: newProd.hsn || undefined,
        is_service: newProd.is_service,
      });
      const created = r.data;
      onProductCreated(created);
      selectProduct(created);
      toast.success(`"${created.name}" added to ${newProd.is_service ? 'services' : 'products'}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create item');
    } finally { setProdSaving(false); }
  }

  return (
    <tr className="border-b border-stroke hover:bg-gray-1/50">
      <td className="px-3 py-2 text-center text-xs text-bodydark w-8">{idx + 1}</td>

      {/* Item name + search + create */}
      <td className="px-3 py-2 min-w-[200px] relative">
        {row.description && !open && (
          <p className="text-xs text-bodydark italic mb-0.5 truncate max-w-xs" title={row.description}>{row.description}</p>
        )}
        <input
          ref={inputRef}
          type="text" value={search}
          onChange={e => {
            setSearch(e.target.value);
            updateField('name', e.target.value);
            openDrop();
            setCreating(false);
          }}
          onFocus={openDrop}
          placeholder="Search item or type new…"
          className="w-full text-sm outline-none bg-transparent"
        />
        {open && search.length > 0 && (
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => { setOpen(false); setCreating(false); }} />
            <div className="z-[9999] bg-white border border-stroke rounded shadow-lg max-h-72 overflow-y-auto"
              style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width }}>
              {!creating ? (
                <>
                  {searching ? (
                    <div className="px-3 py-2 text-xs text-bodydark">Searching…</div>
                  ) : filtered.length === 0 ? (
                    <div className="px-3 py-3">
                      <p className="text-xs text-bodydark">No items found for "{search}"</p>
                      <div className="mt-2 flex flex-col gap-1">
                        <button type="button" onClick={() => openCreate(false)}
                          className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                          + Create product "{search}"
                        </button>
                        <button type="button" onClick={() => openCreate(true)}
                          className="flex items-center gap-1 text-xs text-meta-5 font-medium hover:underline">
                          + Create service "{search}"
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {filtered.map(p => (
                        <button key={p.id} type="button" onClick={() => selectProduct(p)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-1 border-b border-stroke last:border-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-black">{p.name}</span>
                            <span className="text-xs text-bodydark ml-2">{p.sku}</span>
                          </div>
                          {p.description && (
                            <div className="text-xs text-bodydark mt-0.5 italic truncate">{p.description}</div>
                          )}
                          <div className="text-xs text-bodydark mt-0.5 flex gap-3">
                            <span>{fmt(p.selling_price)}</span>
                            <span>GST {p.tax_rate}%</span>
                            {!p.is_service && (
                              <span className={parseFloat(p.current_stock) <= parseFloat(p.min_stock_level || 0) ? 'text-danger font-medium' : 'text-meta-3'}>
                                Stock: {p.current_stock} {p.unit}
                              </span>
                            )}
                            {p.is_service && <span className="text-primary">Service</span>}
                          </div>
                        </button>
                      ))}
                      <button type="button" onClick={() => openCreate(false)}
                        className="w-full text-left px-3 py-2 text-xs text-primary hover:bg-gray-1 border-t border-stroke">
                        + Create product "{search}"
                      </button>
                      <button type="button" onClick={() => openCreate(true)}
                        className="w-full text-left px-3 py-2 text-xs text-meta-5 hover:bg-gray-1 border-t border-stroke">
                        + Create service "{search}"
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="p-3">
                  {/* Product / Service toggle */}
                  <div className="flex items-center gap-1 mb-2.5">
                    <div className="inline-flex rounded border border-stroke overflow-hidden text-xs font-medium">
                      <button type="button"
                        onClick={() => setNewProd(n => ({ ...n, is_service: false, unit: 'pcs' }))}
                        className={`px-3 py-1 transition-colors ${!newProd.is_service ? 'bg-primary text-white' : 'bg-white text-bodydark hover:bg-gray-1'}`}>
                        Product
                      </button>
                      <button type="button"
                        onClick={() => setNewProd(n => ({ ...n, is_service: true, unit: 'hrs' }))}
                        className={`px-3 py-1 transition-colors ${newProd.is_service ? 'bg-meta-5 text-white' : 'bg-white text-bodydark hover:bg-gray-1'}`}>
                        Service
                      </button>
                    </div>
                    <span className="text-xs text-bodydark">{newProd.is_service ? 'No stock tracking' : 'Tracked in inventory'}</span>
                  </div>
                  <div className="space-y-2">
                    <input
                      value={newProd.name} onChange={e => setNewProd(n => ({ ...n, name: e.target.value }))}
                      placeholder={`${newProd.is_service ? 'Service' : 'Product'} name *`}
                      className="w-full rounded border border-stroke px-2 py-1.5 text-xs outline-none focus:border-primary"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="number" min="0" value={newProd.price}
                        onChange={e => setNewProd(n => ({ ...n, price: e.target.value }))}
                        placeholder={newProd.is_service ? 'Rate / charge *' : 'Selling price *'}
                        className="rounded border border-stroke px-2 py-1.5 text-xs outline-none focus:border-primary"
                      />
                      <select value={newProd.tax_pct} onChange={e => setNewProd(n => ({ ...n, tax_pct: e.target.value }))}
                        className="rounded border border-stroke px-2 py-1.5 text-xs outline-none focus:border-primary bg-white">
                        {gstRates.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select value={newProd.unit} onChange={e => setNewProd(n => ({ ...n, unit: e.target.value }))}
                        className="rounded border border-stroke px-2 py-1.5 text-xs outline-none focus:border-primary bg-white">
                        {newProd.is_service
                          ? ['hrs', 'days', 'visit', 'month', 'job', 'nos'].map(u => <option key={u} value={u}>{u}</option>)
                          : ['pcs', 'nos', 'kg', 'g', 'ltr', 'mtr', 'sqft', 'box', 'set'].map(u => <option key={u} value={u}>{u}</option>)
                        }
                      </select>
                      <input value={newProd.hsn} onChange={e => setNewProd(n => ({ ...n, hsn: e.target.value }))}
                        placeholder={newProd.is_service ? 'SAC code' : 'HSN code'}
                        className="rounded border border-stroke px-2 py-1.5 text-xs outline-none focus:border-primary"
                      />
                    </div>
                    {!newProd.is_service && (
                      <input value={newProd.sku} onChange={e => setNewProd(n => ({ ...n, sku: e.target.value }))}
                        placeholder="SKU (leave blank to auto-generate)"
                        className="w-full rounded border border-stroke px-2 py-1.5 text-xs outline-none focus:border-primary"
                      />
                    )}
                  </div>
                  <div className="flex gap-2 mt-2.5 justify-end">
                    <button type="button" onClick={() => setCreating(false)}
                      className="text-xs text-bodydark hover:text-black px-2 py-1">Back</button>
                    <button type="button"
                      disabled={prodSaving || !newProd.name.trim() || !newProd.price}
                      onClick={handleCreateProduct}
                      className={`rounded px-3 py-1 text-xs font-medium text-white disabled:opacity-50 ${newProd.is_service ? 'bg-meta-5' : 'bg-primary'}`}>
                      {prodSaving ? 'Creating…' : `Add ${newProd.is_service ? 'Service' : 'Product'}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </td>

      <td className="px-2 py-2 w-20">
        <input type="text" value={row.hsn} onChange={e => updateField('hsn', e.target.value)}
          className="w-full text-xs outline-none text-center bg-transparent" placeholder="HSN" />
      </td>

      <td className="px-2 py-2 w-16">
        <input type="number" min="0" step="0.001" value={row.qty} onChange={e => updateField('qty', e.target.value)}
          className="w-full text-sm outline-none text-right bg-transparent" />
      </td>

      <td className="px-2 py-2 w-16">
        <input type="text" value={row.unit} onChange={e => updateField('unit', e.target.value)}
          className="w-full text-xs outline-none text-center bg-transparent" />
      </td>

      <td className="px-2 py-2 w-28">
        <input type="number" min="0" step="0.01" value={row.price} onChange={e => updateField('price', e.target.value)}
          className="w-full text-sm outline-none text-right bg-transparent" placeholder="0.00" />
      </td>

      <td className="px-2 py-2 w-16">
        <input type="number" min="0" max="100" step="0.1" value={row.discount_pct} onChange={e => updateField('discount_pct', e.target.value)}
          className="w-full text-sm outline-none text-right bg-transparent" />
      </td>

      <td className="px-2 py-2 w-20">
        <select value={row.tax_pct} onChange={e => updateField('tax_pct', e.target.value)}
          className="w-full text-xs outline-none bg-transparent">
          {gstRates.map(r => <option key={r.value} value={r.value}>{r.shortLabel}</option>)}
        </select>
      </td>

      <td className="px-3 py-2 w-28 text-right text-sm font-medium text-black">
        {fmt(row.amount)}
      </td>

      <td className="px-2 py-2 w-8 text-center">
        <button type="button" onClick={() => onRemove(idx)}
          className="text-bodydark hover:text-danger text-lg leading-none">×</button>
      </td>
    </tr>
  );
}

// ── Main Form ─────────────────────────────────────────────────────────────────

export default function DocumentForm({ docType = 'quotation', existing = null, prefill = null }) {
  const cfg = DOC_CONFIG[docType];
  const navigate = useNavigate();
  const { tenantProfile } = useAuthStore();
  const { rates: gstRates } = useGSTRates();

  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [products, setProducts] = useState([]);
  const [custSearch, setCustSearch] = useState(existing?.customer_name || prefill?.customer_name || '');
  const [custOpen, setCustOpen] = useState(false);
  const [party, setParty] = useState(null); // selected customer or lead object
  const [txType, setTxType] = useState(existing?.transaction_type || prefill?.transaction_type || 'intra');
  const [supplyState, setSupplyState] = useState(existing?.supply_state || prefill?.supply_state || '');
  const [saleType, setSaleType] = useState(existing?.payment_type === 'credit' ? 'credit' : existing?.payment_type ? 'cash' : 'credit');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customer_id: existing?.customer_id || prefill?.customer_id || '',
    lead_id: existing?.lead_id || prefill?.lead_id || null,
    quotation_id: existing?.quotation_id || prefill?.quotation_id || null,
    pi_id: existing?.pi_id || prefill?.pi_id || null,
    date: existing?.date || existing?.invoice_date || TODAY,
    valid_until: existing?.valid_until || existing?.due_date || '',
    transport_charges: existing?.transport_charges || 0,
    round_off: existing?.round_off || 0,
    amount_received: existing?.amount_received || 0,
    payment_type: existing?.payment_type || 'cash',
    notes: existing?.notes || '',
    terms: existing?.terms || 'Goods once sold will not be taken back.',
    status: existing?.status || 'draft',
  });

  const [rows, setRows] = useState(
    existing?.items?.length
      ? existing.items.map(i => ({ ...BLANK_ROW, ...i }))
      : prefill?.items?.length
      ? prefill.items.map(i => ({ ...BLANK_ROW, ...i }))
      : [{ ...BLANK_ROW }]
  );

  useEffect(() => {
    customerApi.list({ limit: 200 }).then(r => {
      setCustomers(r.data?.results || r.data || []);
    }).catch(() => {});
    leadsApi.list({ limit: 500 }).then(r => {
      setLeads(r.data?.results || r.data?.items || r.data || []);
    }).catch(() => {});
  }, []);

  // Auto-set party for existing docs so print view has address details
  useEffect(() => {
    if (!existing || party) return;
    if (existing.customer_id && customers.length > 0) {
      const found = customers.find(c => c.id === existing.customer_id);
      if (found) setParty({ ...found, _type: 'customer' });
    } else if (existing.lead_id && leads.length > 0) {
      const found = leads.find(l => l.id === existing.lead_id);
      if (found) setParty({ ...found, _type: 'lead' });
    }
  }, [customers, leads]);

  const totals = calcTotals(rows.map(r => calcRow(r, txType)), form.transport_charges, form.round_off);
  const balance = totals.total - parseFloat(form.amount_received || 0);

  const q = custSearch.toLowerCase();
  const filteredCustomers = [
    ...customers
      .filter(c => c.name.toLowerCase().includes(q) || (c.phone || '').includes(custSearch))
      .map(c => ({ ...c, _type: 'customer', _label: c.name, _sub: c.phone || c.city || '' })),
    ...leads
      .filter(l => (l.name || '').toLowerCase().includes(q) || (l.company || '').toLowerCase().includes(q) || (l.phone || '').includes(custSearch))
      .map(l => ({ ...l, _type: 'lead', _label: l.name || l.company || '—', _sub: l.company || l.phone || '' })),
  ].slice(0, 10);

  function addRow() {
    setRows(r => [...r, { ...BLANK_ROW }]);
  }

  function updateRow(idx, updated) {
    setRows(r => r.map((row, i) => i === idx ? calcRow(updated, txType) : row));
  }

  function removeRow(idx) {
    setRows(r => r.length > 1 ? r.filter((_, i) => i !== idx) : r);
  }

  function handleSaleTypeToggle(type) {
    setSaleType(type);
    if (docType === 'invoice') {
      if (type === 'cash') {
        setForm(f => ({ ...f, payment_type: 'cash', amount_received: totals.total }));
      } else {
        setForm(f => ({ ...f, payment_type: 'credit', amount_received: 0 }));
      }
    }
  }

  async function handleSave(status = form.status) {
    if (!form.customer_id && !form.lead_id) { toast.error('Select a customer or lead'); return; }
    if (!rows.some(r => r.name)) { toast.error('Add at least one item'); return; }
    setSaving(true);
    try {
      const validRows = rows.filter(r => r.name);
      const payload = {
        customer_id: form.customer_id || null,
        lead_id: form.lead_id || null,
        ...(docType === 'quotation' && { quotation_id: undefined }),
        ...(docType === 'pi' && { quotation_id: form.quotation_id || undefined }),
        ...(docType === 'invoice' && {
          quotation_id: form.quotation_id || undefined,
          pi_id: form.pi_id || undefined,
        }),
        items: validRows,
        supply_state: supplyState || undefined,
        transaction_type: txType,
        round_off: parseFloat(form.round_off) || 0,
        notes: form.notes || undefined,
        terms: form.terms || undefined,
        status,
      };
      if (docType === 'quotation' || docType === 'pi') {
        payload.date = form.date;
        payload.valid_until = form.valid_until || undefined;
      }
      if (docType === 'invoice') {
        payload.invoice_date = form.date;
        payload.due_date = form.valid_until || undefined;
        payload.transport_charges = parseFloat(form.transport_charges) || 0;
        payload.amount_received = parseFloat(form.amount_received) || 0;
        payload.payment_type = form.payment_type;
      }
      if (docType === 'challan') {
        payload.challan_date = form.date;
        payload.due_date = form.valid_until || undefined;
        delete payload.round_off;
        delete payload.terms;
        delete payload.status;
      }

      if (existing?.id) {
        await cfg.update(existing.id, payload);
        toast.success(`${cfg.title} updated`);
      } else {
        await cfg.create(payload);
        toast.success(`${cfg.title} created`);
      }
      navigate(cfg.listPath);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  const partyPhone = party?.phone || party?.mobile || '';

  return (
    <div className="min-h-screen bg-gray-2">
      {/* Print styles */}
      <style>{`
        @media print {
          @page { margin: 10mm; size: A4; }
          body * { visibility: hidden !important; }
          .print-only, .print-only * { visibility: visible !important; }
          .print-only {
            display: block !important;
            position: fixed !important;
            top: 0; left: 0;
            width: 100%;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          table, th, td { border-color: #999 !important; }
        }
      `}</style>

      {/* Print-only invoice */}
      <PrintView
        docType={docType} cfg={cfg} existing={existing}
        form={form} rows={rows} totals={totals}
        partyName={custSearch} partyPhone={partyPhone}
        party={party}
        tenant={tenantProfile}
        txType={txType} supplyState={supplyState} saleType={saleType}
      />

      {/* Top bar */}
      <div className="no-print bg-white border-b border-stroke px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(cfg.listPath)} className="text-bodydark hover:text-black">
            ← Back
          </button>
          <h1 className="text-base font-semibold text-black">
            {existing ? `Edit ${cfg.title}` : `New ${cfg.title}`}
            {existing && <span className="ml-2 text-sm text-primary font-normal">#{existing[cfg.noField]}</span>}
          </h1>
        </div>
        <div className="flex gap-2">
          {existing && (
            <button onClick={handlePrint}
              className="rounded border border-stroke px-4 py-1.5 text-sm text-bodydark hover:text-black">
              🖨 Print
            </button>
          )}
          {docType !== 'challan' && (
            <button onClick={() => handleSave('draft')} disabled={saving}
              className="rounded border border-stroke px-4 py-1.5 text-sm text-bodydark hover:text-black disabled:opacity-50">
              Save Draft
            </button>
          )}
          <button onClick={() => handleSave(docType === 'challan' ? 'open' : 'sent')} disabled={saving}
            className="rounded bg-primary px-5 py-1.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50">
            {saving ? 'Saving…' : docType === 'challan' ? 'Create Challan' : 'Save & Send'}
          </button>
        </div>
      </div>

      <div className="no-print max-w-5xl mx-auto p-6 print-container">
        <div className="bg-white rounded-sm border border-stroke shadow-default">

          {/* ── Header section ── */}
          <div className="p-6 border-b border-stroke grid grid-cols-2 gap-6">
            {/* Customer + Sale Type */}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-black">
                  Customer / Party <span className="text-danger">*</span>
                </label>
              <div className="relative">
                <input
                  type="text" value={custSearch}
                  onChange={e => { setCustSearch(e.target.value); setForm(f => ({ ...f, customer_id: '', lead_id: null })); setParty(null); setCustOpen(true); }}
                  onFocus={() => setCustOpen(true)}
                  placeholder="Search customer or lead name / phone…"
                  className={`w-full rounded border px-3 py-2 text-sm outline-none focus:border-primary ${
                    (form.customer_id || form.lead_id) ? 'border-meta-3 bg-meta-3/5' : 'border-stroke'
                  }`}
                />
                {(form.customer_id || form.lead_id) && (
                  <span className="absolute right-3 top-2.5 text-meta-3 text-xs font-bold">✓</span>
                )}
                {custOpen && custSearch.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setCustOpen(false)} />
                    <div className="absolute z-40 w-full mt-1 bg-white border border-stroke rounded shadow-lg max-h-48 overflow-y-auto">
                      {filteredCustomers.length === 0
                        ? <p className="px-3 py-2 text-xs text-bodydark">No customers or leads found</p>
                        : filteredCustomers.map(item => (
                          <button key={item.id} type="button"
                            onClick={() => {
                              if (item._type === 'lead') {
                                setForm(f => ({ ...f, lead_id: item.id, customer_id: '' }));
                              } else {
                                setForm(f => ({ ...f, customer_id: item.id, lead_id: null }));
                              }
                              const cState = item.billing_state || '';
                              const newTxType = determineTxType(tenantProfile?.state, cState);
                              setSupplyState(cState);
                              setTxType(newTxType);
                              setCustSearch(item._label);
                              setParty(item);
                              setCustOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-1 border-b border-stroke last:border-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{item._label}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${item._type === 'lead' ? 'bg-warning/10 text-warning' : 'bg-meta-3/10 text-meta-3'}`}>
                                {item._type === 'lead' ? 'Lead' : 'Customer'}
                              </span>
                            </div>
                            {item._sub && <span className="text-xs text-bodydark">{item._sub}</span>}
                          </button>
                        ))
                      }
                    </div>
                  </>
                )}
              </div>
              </div>

              {/* Credit / Cash toggle */}
              {cfg.showSaleType && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-bodydark">Sale</span>
                  <div className="inline-flex rounded-lg border border-stroke overflow-hidden text-xs font-medium">
                    <button type="button" onClick={() => handleSaleTypeToggle('credit')}
                      className={`px-4 py-1.5 transition-colors ${saleType === 'credit' ? 'bg-warning text-white' : 'bg-white text-bodydark hover:bg-gray-1'}`}>
                      Credit
                    </button>
                    <button type="button" onClick={() => handleSaleTypeToggle('cash')}
                      className={`px-4 py-1.5 transition-colors ${saleType === 'cash' ? 'bg-meta-3 text-white' : 'bg-white text-bodydark hover:bg-gray-1'}`}>
                      Cash
                    </button>
                  </div>
                  <span className={`text-xs font-medium ${saleType === 'cash' ? 'text-meta-3' : 'text-warning'}`}>
                    {saleType === 'cash' ? 'Full payment at sale' : 'Payment due later'}
                  </span>
                </div>
              )}
            </div>

            {/* Doc details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-black">{cfg.dateLabel}</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-black">{cfg.expiryLabel}</label>
                <input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
                  className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-semibold text-black">State of Supply</label>
                <select
                  value={supplyState}
                  onChange={e => {
                    setSupplyState(e.target.value);
                    setTxType(determineTxType(tenantProfile?.state, e.target.value));
                  }}
                  className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary bg-white">
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── Line Items Table ── */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-1 border-b border-stroke">
                <tr>
                  <th className="px-3 py-2 text-xs text-left text-bodydark w-8">#</th>
                  <th className="px-3 py-2 text-xs text-left text-bodydark">Item / Description</th>
                  <th className="px-2 py-2 text-xs text-center text-bodydark w-20">HSN</th>
                  <th className="px-2 py-2 text-xs text-right text-bodydark w-16">Qty</th>
                  <th className="px-2 py-2 text-xs text-center text-bodydark w-16">Unit</th>
                  <th className="px-2 py-2 text-xs text-right text-bodydark w-28">Price/Unit</th>
                  <th className="px-2 py-2 text-xs text-right text-bodydark w-16">Disc%</th>
                  <th className="px-2 py-2 text-xs text-center text-bodydark w-20">GST%</th>
                  <th className="px-3 py-2 text-xs text-right text-bodydark w-28">Amount</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <ItemRow key={idx} row={row} idx={idx} products={products} gstRates={gstRates}
                    onChange={updateRow} onRemove={removeRow}
                    onProductCreated={newProd => setProducts(p => [newProd, ...p])} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 border-b border-stroke no-print">
            <button type="button" onClick={addRow}
              className="text-sm text-primary hover:underline font-medium">
              + Add Row
            </button>
          </div>

          {/* ── Totals + Footer ── */}
          <div className="p-6 grid grid-cols-2 gap-6">
            {/* Notes + Terms */}
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-black">Notes (Customer-visible)</label>
                <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Thank you for your business…"
                  className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary resize-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-black">Terms & Conditions</label>
                <textarea rows={3} value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))}
                  className="w-full rounded border border-stroke px-3 py-2 text-sm outline-none focus:border-primary resize-none" />
              </div>
            </div>

            {/* Totals block */}
            <div className="space-y-2 text-sm">
              {/* GST type badge */}
              {(form.customer_id || form.lead_id) && (
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${txType === 'inter' ? 'bg-warning/10 text-warning' : 'bg-meta-3/10 text-meta-3'}`}>
                    {txType === 'inter' ? '⇄ Inter-state (IGST)' : '⇒ Intra-state (CGST+SGST)'}
                  </span>
                  {supplyState && <span className="text-xs text-bodydark">{supplyState}</span>}
                </div>
              )}
              {/* Credit limit warning */}
              {docType === 'invoice' && saleType === 'credit' && party?._type === 'customer' && party?.credit_limit != null && (
                <div className={`flex items-center justify-between rounded px-3 py-1.5 text-xs ${totals.total > party.credit_limit ? 'bg-danger/10 border border-danger/30' : 'bg-gray-1 border border-stroke'}`}>
                  <span className={totals.total > party.credit_limit ? 'text-danger font-semibold' : 'text-bodydark'}>
                    {totals.total > party.credit_limit ? '⚠ Credit limit exceeded' : 'Credit limit'}
                  </span>
                  <span className={`font-semibold ${totals.total > party.credit_limit ? 'text-danger' : 'text-black'}`}>
                    {fmt(party.credit_limit)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-stroke">
                <span className="text-bodydark">Subtotal</span>
                <span className="font-medium">{fmt(totals.subtotal)}</span>
              </div>
              {totals.discount_total > 0 && (
                <div className="flex justify-between py-1 border-b border-stroke text-meta-3">
                  <span>Discount</span>
                  <span>- {fmt(totals.discount_total)}</span>
                </div>
              )}
              {totals.tax_total > 0 && txType === 'intra' && (
                <>
                  <div className="flex justify-between py-1 border-b border-stroke">
                    <span className="text-bodydark">CGST</span>
                    <span className="font-medium">{fmt(totals.cgst_total)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stroke">
                    <span className="text-bodydark">SGST</span>
                    <span className="font-medium">{fmt(totals.sgst_total)}</span>
                  </div>
                </>
              )}
              {totals.tax_total > 0 && txType === 'inter' && (
                <div className="flex justify-between py-1 border-b border-stroke">
                  <span className="text-bodydark">IGST</span>
                  <span className="font-medium">{fmt(totals.igst_total)}</span>
                </div>
              )}
              {totals.tax_total > 0 && (
                <div className="flex justify-between py-1 border-b border-stroke text-xs text-bodydark">
                  <span>Tax Total</span>
                  <span>{fmt(totals.tax_total)}</span>
                </div>
              )}

              {cfg.showTransport && (
                <div className="flex items-center justify-between py-1 border-b border-stroke no-print">
                  <span className="text-bodydark">Transport / Freight</span>
                  <input type="number" min="0" value={form.transport_charges}
                    onChange={e => setForm(f => ({ ...f, transport_charges: e.target.value }))}
                    className="w-24 text-right border border-stroke rounded px-2 py-0.5 text-sm outline-none focus:border-primary" />
                </div>
              )}

              <div className="flex items-center justify-between py-1 border-b border-stroke no-print">
                <span className="text-bodydark">Round Off</span>
                <input type="number" step="0.01" value={form.round_off}
                  onChange={e => setForm(f => ({ ...f, round_off: e.target.value }))}
                  className="w-24 text-right border border-stroke rounded px-2 py-0.5 text-sm outline-none focus:border-primary" />
              </div>

              <div className="flex justify-between py-2 bg-primary/5 rounded px-3 mt-2">
                <span className="text-base font-bold text-black">Total</span>
                <span className="text-base font-bold text-primary">{fmt(totals.total)}</span>
              </div>

              {cfg.showPayment && saleType === 'cash' && (
                <>
                  <div className="flex items-center justify-between py-1 border-b border-stroke no-print">
                    <span className="text-bodydark">Payment Received</span>
                    <input type="number" min="0" value={form.amount_received}
                      onChange={e => setForm(f => ({ ...f, amount_received: e.target.value }))}
                      className="w-28 text-right border border-stroke rounded px-2 py-0.5 text-sm outline-none focus:border-primary" />
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-stroke no-print">
                    <span className="text-bodydark">Payment Method</span>
                    <select value={form.payment_type === 'credit' ? 'cash' : form.payment_type}
                      onChange={e => setForm(f => ({ ...f, payment_type: e.target.value }))}
                      className="rounded border border-stroke px-2 py-0.5 text-sm outline-none focus:border-primary bg-white">
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="upi">UPI</option>
                    </select>
                  </div>
                  <div className={`flex justify-between py-2 rounded px-3 ${balance > 0 ? 'bg-danger/5' : 'bg-meta-3/5'}`}>
                    <span className={`font-semibold ${balance > 0 ? 'text-danger' : 'text-meta-3'}`}>Balance Due</span>
                    <span className={`font-bold text-lg ${balance > 0 ? 'text-danger' : 'text-meta-3'}`}>{fmt(balance)}</span>
                  </div>
                </>
              )}
              {cfg.showPayment && saleType === 'credit' && (
                <div className="flex justify-between py-2 bg-warning/5 rounded px-3 border border-warning/20">
                  <span className="text-sm font-semibold text-warning">Credit Sale</span>
                  <span className="text-sm font-bold text-warning">{fmt(totals.total)} due</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
