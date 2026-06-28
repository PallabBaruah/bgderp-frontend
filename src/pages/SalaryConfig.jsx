import { useEffect, useState } from 'react';
import { employeeApi } from '../api/client';
import toast from 'react-hot-toast';

// ── Salary head definitions (private company) ─────────────────────────────
const HEADS = {
  earnings: [
    { key: 'BASIC', label: 'Basic Pay' },
    { key: 'GRADE_PAY', label: 'Grade Pay' },
    { key: 'SPECIAL_PAY', label: 'Special Pay' },
    { key: 'ARREAR_1', label: 'Arrear (1)' },
    { key: 'ARREAR_2', label: 'Arrear (2)' },
    { key: 'HRA_RENTED', label: 'HRA Rented', isSelect: true },
    { key: 'HRA_OWN', label: 'HRA Own', isSelect: true },
    { key: 'REFUND', label: 'Refund' },
    { key: 'TRANSPORT_ALLOW', label: 'Transport Allowance', isSelect: true },
  ],
  allowances: [
    { key: 'MEDICAL_ALLOW', label: 'Medical Allowance' },
    { key: 'LTA', label: 'LTA / Travel Allowance' },
    { key: 'EDUCATION_ALLOW', label: 'Education Allowance' },
    { key: 'TECHNICAL_ALLOW', label: 'Technical/NPA Allowance' },
    { key: 'TEA_ALLOW', label: 'Tea/Meal Allowance', isSelect: true },
    { key: 'CHARGE_ALLOW', label: 'Charge Allowance' },
    { key: 'SITE_ALLOW', label: 'Site Allowance' },
    { key: 'SHIFT_ALLOW', label: 'Shift/IU Allowance' },
    { key: 'WASH_ALLOW', label: 'Wash/Uniform Kit', isSelect: true },
    { key: 'HELPER_ALLOW', label: 'Helper/Menial Allowance', isSelect: true },
    { key: 'BUS_ALLOW', label: 'School Bus Allowance' },
    { key: 'ADDL_ALLOW_1', label: 'Additional Allowance 1' },
  ],
  otherEarnings: [
    { key: 'OT_SHIFT', label: 'OTS (Overtime Shift)' },
    { key: 'OT_DAY', label: 'OTD (Overtime Day)' },
    { key: 'TRAVEL_EXP', label: 'Travel Expense' },
    { key: 'MEDICAL_EXP', label: 'Medical Expense' },
    { key: 'MISC_EARN_1', label: 'Misc Earnings 1' },
    { key: 'MISC_EARN_2', label: 'Misc Earnings 2' },
    { key: 'BONUS', label: 'Bonus / Exgratia' },
  ],
  deductionSchemes: [
    { key: 'EPF', label: 'EPF', isSelect: true },
    { key: 'VPF', label: 'VPF (Voluntary PF)' },
    { key: 'ESI', label: 'ESI', isSelect: true },
    { key: 'RD_PO', label: 'RD - Post Office' },
    { key: 'RD_BANK', label: 'RD - Bank' },
  ],
  charges: [
    { key: 'ELECTRICITY', label: 'Electricity' },
    { key: 'CO_OP', label: 'Co-Op' },
    { key: 'CANTEEN', label: 'Tea / Canteen' },
    { key: 'HOUSE_RENT_REC', label: 'House Rent Recovery' },
    { key: 'GAS_CHARGE', label: 'Gas Charge' },
    { key: 'GAS_GRID', label: 'Gas Grid' },
    { key: 'TRANSPORT_REC', label: 'Transport Recovery' },
    { key: 'AGCSRC_MEM', label: 'AGCSRC Membership' },
    { key: 'AGCSRD_DED', label: 'AGCSRD Deduction' },
    { key: 'EXEC_CLUB_MEM', label: 'Exec Club Membership' },
    { key: 'EXEC_CLUB_DED', label: 'Exec Club Deduction' },
  ],
  taxesMisc: [
    { key: 'INC_TAX_CURR', label: 'Income Tax (Current)' },
    { key: 'INC_TAX_ARR', label: 'Income Tax (Arrear)' },
    { key: 'PROF_TAX', label: 'Professional Tax' },
    { key: 'INT_ON_LOAN', label: 'Interest on Loan' },
    { key: 'MISC_DED_1', label: 'Misc Deduction 1' },
    { key: 'MISC_DED_2', label: 'Misc Deduction 2' },
    { key: 'MISC_DED_3', label: 'Misc Deduction 3' },
    { key: 'SALES_TO_EMP', label: 'Sales to Employee' },
    { key: 'SUBSCRIPTION', label: 'Subscription' },
  ],
  advancesRecovery: [
    { key: 'ADV_VEHICLE', label: 'Vehicle', instKey: 'INST_VEHICLE' },
    { key: 'ADV_HBL_CO', label: 'HBL DG-CO', instKey: 'INST_HBL_CO' },
    { key: 'ADV_HBL_F', label: 'HBL DG-F', instKey: 'INST_HBL_F' },
    { key: 'ADV_REHAB', label: 'Rehab', instKey: 'INST_REHAB' },
    { key: 'ADV_FESTIVAL', label: 'Festival', instKey: 'INST_FESTIVAL' },
    { key: 'ADV_MARRIAGE', label: 'Marriage', instKey: 'INST_MARRIAGE' },
    { key: 'ADV_LPG', label: 'LPG', instKey: 'INST_LPG' },
    { key: 'ADV_PAY_LS', label: 'Pay Long/Short', instKey: 'INST_PAY_LS' },
    { key: 'ADV_SHRADDHA', label: 'Shraddhanjali Adv', instKey: 'INST_SHRADDHA' },
    { key: 'ADV_HR_INT', label: 'HR Interest', instKey: 'INST_HR_INT' },
    { key: 'ADV_MOTOR_INT', label: 'Motor Interest', instKey: 'INST_MOTOR_INT' },
    { key: 'ADV_SALARY', label: 'Salary Advance', instKey: 'INST_SALARY' },
  ],
  consLoans: [
    { key: 'CONS_LOAN', label: 'Consumer Loans' },
    { key: 'PERS_LOAN_1', label: 'Personal Loan 1' },
    { key: 'PERS_LOAN_2', label: 'Personal Loan 2' },
    { key: 'PERS_LOAN_3', label: 'Personal Loan 3' },
    { key: 'PERS_LOAN_4', label: 'Personal Loan 4' },
    { key: 'TRAVEL_LOAN', label: 'Travel Loan' },
    { key: 'MEDICAL_LOAN', label: 'Medical Loan' },
    { key: 'IMPREST', label: 'Education / Imprest' },
    { key: 'OTHERS_LOAN', label: 'Others' },
  ],
};

const SELECT_KEYS = new Set(
  Object.values(HEADS).flat().filter((h) => h.isSelect).map((h) => h.key)
);

const emptyHeads = () => {
  const obj = {};
  Object.values(HEADS).flat().forEach((h) => { obj[h.key] = ''; });
  HEADS.advancesRecovery.forEach((h) => { obj[h.instKey] = ''; });
  return obj;
};

const colStyle = { flex: 1, minWidth: 0 };
const thStyle = {
  background: '#e8edf3',
  fontWeight: 700,
  fontSize: 12,
  padding: '6px 8px',
  textAlign: 'center',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  border: '1px solid #ccd4de',
};
const tdLabel = {
  fontSize: 12,
  padding: '4px 8px',
  borderBottom: '1px solid #edf0f4',
  color: '#444',
  whiteSpace: 'nowrap',
};
const tdInput = {
  padding: '2px 4px',
  borderBottom: '1px solid #edf0f4',
};

function NumInput({ value, onChange, style = {} }) {
  return (
    <input
      type="number"
      min="0"
      step="any"
      value={value}
      onChange={onChange}
      style={{
        width: '100%',
        border: '1px solid #ccd4de',
        borderRadius: 3,
        padding: '3px 6px',
        fontSize: 12,
        ...style,
      }}
    />
  );
}

function SelectInput({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        width: '100%',
        border: '1px solid #ccd4de',
        borderRadius: 3,
        padding: '3px 6px',
        fontSize: 12,
        background: '#fff',
      }}
    >
      <option value="">—</option>
      <option value="included">Included</option>
      <option value="excluded">Excluded</option>
    </select>
  );
}

function HeadRow({ head, heads, onChange }) {
  return (
    <tr>
      <td style={tdLabel}>{head.label}</td>
      <td style={tdInput}>
        {head.isSelect
          ? <SelectInput value={heads[head.key] || ''} onChange={(e) => onChange(head.key, e.target.value)} />
          : <NumInput value={heads[head.key] || ''} onChange={(e) => onChange(head.key, e.target.value)} />
        }
      </td>
    </tr>
  );
}

function SectionTable({ title, headDefs, values, onChange, children }) {
  return (
    <div style={colStyle}>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccd4de' }}>
        <thead>
          <tr><th colSpan={2} style={thStyle}>{title}</th></tr>
        </thead>
        <tbody>
          {headDefs.map((h) => (
            <HeadRow key={h.key} head={h} heads={values} onChange={onChange} />
          ))}
          {children}
        </tbody>
      </table>
    </div>
  );
}

export default function SalaryConfig() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [heads, setHeads] = useState(emptyHeads());
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    employeeApi.list({ limit: 200, status: 'active' })
      .then((r) => setEmployees(r.data.items || []))
      .catch(() => {});
  }, []);

  const handleEmpChange = async (empId) => {
    setSelectedEmp(empId);
    if (!empId) { setHeads(emptyHeads()); return; }
    setLoading(true);
    try {
      const res = await employeeApi.getSalaryConfig(empId);
      const data = res.data;
      const merged = emptyHeads();
      Object.entries(data.salary_heads || {}).forEach(([k, v]) => {
        if (SELECT_KEYS.has(k)) {
          merged[k] = v === 1 ? 'included' : v === 0 ? 'excluded' : '';
        } else {
          merged[k] = v === 0 ? '' : String(v);
        }
      });
      setHeads(merged);
      setEffectiveFrom(data.effective_from || '');
    } catch {
      setHeads(emptyHeads());
    }
    setLoading(false);
  };

  const setHead = (key, val) => setHeads((h) => ({ ...h, [key]: val }));

  const handleSave = async () => {
    if (!selectedEmp) { toast.error('Select an employee first'); return; }
    setSaving(true);
    const salary_heads = {};
    Object.entries(heads).forEach(([k, v]) => {
      if (SELECT_KEYS.has(k)) {
        if (v === 'included') salary_heads[k] = 1;
        else if (v === 'excluded') salary_heads[k] = 0;
      } else {
        const num = parseFloat(v);
        if (!isNaN(num) && num > 0) salary_heads[k] = num;
      }
    });
    try {
      await employeeApi.saveSalaryConfig(selectedEmp, {
        salary_heads,
        effective_from: effectiveFrom || undefined,
      });
      toast.success('Salary configuration saved');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Save failed');
    }
    setSaving(false);
  };

  const sectionDivider = (label) => (
    <div style={{
      margin: '20px 0 8px',
      fontWeight: 700,
      fontSize: 13,
      color: '#334',
      borderBottom: '2px solid #ccd4de',
      paddingBottom: 4,
    }}>
      {label}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 18, fontWeight: 700 }}>Add / Edit Salary Details</span>
      </div>

      {/* Employee Selector + Effective Date */}
      <div style={{ background: '#f5f7fa', border: '1px solid #ccd4de', borderRadius: 6, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Salary Configuration For</label>
          <select
            className="form-input form-select"
            style={{ minWidth: 260 }}
            value={selectedEmp}
            onChange={(e) => handleEmpChange(e.target.value)}
          >
            <option value="">— Select Employee —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Effective From</label>
          <input
            type="date"
            className="form-input"
            style={{ width: 160 }}
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading salary config…</div>}

      {!loading && (
        <>
          {/* ── ADDITION ─────────────────────────────────────── */}
          {sectionDivider('Addition')}
          <div style={{ display: 'flex', gap: 12 }}>
            <SectionTable title="Earnings" headDefs={HEADS.earnings} values={heads} onChange={setHead} />
            <SectionTable title="Allowances" headDefs={HEADS.allowances} values={heads} onChange={setHead} />
            <SectionTable title="Other Earnings" headDefs={HEADS.otherEarnings} values={heads} onChange={setHead} />
          </div>

          {/* ── DEDUCTION ─────────────────────────────────────── */}
          {sectionDivider('Deduction')}
          <div style={{ display: 'flex', gap: 12 }}>
            <SectionTable title="Deduction Schemes" headDefs={HEADS.deductionSchemes} values={heads} onChange={setHead} />
            <SectionTable title="Charges" headDefs={HEADS.charges} values={heads} onChange={setHead} />
            <SectionTable title="Taxes & Misc Ded." headDefs={HEADS.taxesMisc} values={heads} onChange={setHead} />
          </div>

          {/* ── ADVANCES / LOANS ──────────────────────────────── */}
          {sectionDivider('Advances Recovery & Loans')}
          <div style={{ display: 'flex', gap: 12 }}>
            {/* Advances Recovery */}
            <div style={colStyle}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccd4de' }}>
                <thead>
                  <tr><th style={thStyle}>Advances Recovery</th><th style={{ ...thStyle, width: 90 }}>Inst. No</th></tr>
                </thead>
                <tbody>
                  {HEADS.advancesRecovery.map((h) => (
                    <tr key={h.key}>
                      <td style={tdLabel}>{h.label}</td>
                      <td style={tdInput}>
                        <NumInput value={heads[h.key] || ''} onChange={(e) => setHead(h.key, e.target.value)} />
                      </td>
                      <td style={tdInput}>
                        <NumInput
                          value={heads[h.instKey] || ''}
                          onChange={(e) => setHead(h.instKey, e.target.value)}
                          style={{ width: 70 }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Consumer Loans */}
            <div style={{ ...colStyle, flex: '0 0 280px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccd4de' }}>
                <thead>
                  <tr><th colSpan={2} style={thStyle}>Consumer Loans</th></tr>
                </thead>
                <tbody>
                  {HEADS.consLoans.map((h) => (
                    <HeadRow key={h.key} head={h} heads={heads} onChange={setHead} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── SAVE / CANCEL ────────────────────────────────── */}
          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !selectedEmp}>
              {saving ? 'Saving…' : '✓ Save'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setHeads(emptyHeads()); setSelectedEmp(''); }}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
