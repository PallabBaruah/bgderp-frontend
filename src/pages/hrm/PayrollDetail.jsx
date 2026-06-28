import { useParams, Link } from 'react-router-dom';
export default function PayrollDetail() {
  const { id } = useParams();
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-bodydark">
        <Link to="/hrm/payroll" className="hover:text-primary">Payroll</Link>
        <span>/</span>
        <span className="text-black font-medium">Run #{id}</span>
      </div>
      <div className="rounded-sm border border-stroke bg-white shadow-default p-6">
        <p className="text-bodydark">Payroll run detail view — see Payroll Runs and Preview tabs on the main Payroll page.</p>
      </div>
    </div>
  );
}
