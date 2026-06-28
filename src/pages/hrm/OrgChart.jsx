import { Link } from 'react-router-dom';

const ORG = {
  id: 0, name: 'Arun Mehta', role: 'CEO', dept: 'Executive',
  children: [
    {
      id: 2, name: 'Priya Singh', role: 'HR Manager', dept: 'HR',
      children: [
        { id: 9, name: 'Neha Roy', role: 'HR Executive', dept: 'HR', children: [] },
      ],
    },
    {
      id: 5, name: 'Vikram Rao', role: 'Operations Manager', dept: 'Operations',
      children: [
        { id: 1, name: 'Rahul Sharma', role: 'Senior Developer', dept: 'Engineering', children: [{ id: 7, name: 'Rohan Gupta', role: 'QA Engineer', dept: 'Engineering', children: [] }] },
        { id: 10, name: 'Kavya Iyer', role: 'DevOps Engineer', dept: 'Engineering', children: [] },
      ],
    },
    {
      id: 8, name: 'Divya Nair', role: 'Sales Manager', dept: 'Sales',
      children: [
        { id: 3, name: 'Amit Kumar', role: 'Sales Executive', dept: 'Sales', children: [] },
        { id: 11, name: 'Sanjay Bose', role: 'Sales Executive', dept: 'Sales', children: [] },
      ],
    },
    {
      id: 4, name: 'Sneha Patel', role: 'Accountant', dept: 'Finance',
      children: [],
    },
  ],
};

const DEPT_COLORS = {
  Executive: 'bg-primary/10 text-primary border-primary',
  HR: 'bg-meta-5/10 text-meta-5 border-meta-5',
  Operations: 'bg-meta-8/10 text-meta-8 border-meta-8',
  Engineering: 'bg-meta-3/10 text-meta-3 border-meta-3',
  Sales: 'bg-meta-6/10 text-meta-6 border-meta-6',
  Finance: 'bg-meta-1/10 text-meta-1 border-meta-1',
  Marketing: 'bg-bodydark-2/10 text-bodydark border-stroke',
};

function OrgNode({ node, level = 0 }) {
  const color = DEPT_COLORS[node.dept] || DEPT_COLORS.Marketing;
  const initials = node.name.split(' ').map((w) => w[0]).slice(0, 2).join('');

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div className={`border-2 rounded-lg p-4 text-center min-w-[150px] max-w-[180px] shadow-default bg-white ${color.split(' ')[2]}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2 ${color}`}>
          {initials}
        </div>
        <div className="text-sm font-semibold text-black leading-tight">{node.name}</div>
        <div className="text-xs text-bodydark mt-0.5">{node.role}</div>
        <span className={`inline-flex mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${color}`}>
          {node.dept}
        </span>
      </div>

      {/* Children */}
      {node.children?.length > 0 && (
        <div className="relative mt-6">
          {/* Vertical connector */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full h-6 w-0.5 bg-stroke" />
          {/* Horizontal bar */}
          {node.children.length > 1 && (
            <div
              className="absolute top-0 h-0.5 bg-stroke"
              style={{
                left: `calc(100% / ${node.children.length * 2})`,
                right: `calc(100% / ${node.children.length * 2})`,
              }}
            />
          )}
          <div className="flex gap-8 pt-0">
            {node.children.map((child) => (
              <div key={child.id} className="relative flex flex-col items-center">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 h-6 w-0.5 bg-stroke" />
                <OrgNode node={child} level={level + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrgChart() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Organization Chart</h2>
          <p className="text-sm text-bodydark">Company hierarchy structure</p>
        </div>
        <Link to="/hrm/employees" className="rounded border border-stroke bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-1">
          ← Employees
        </Link>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default p-8 overflow-x-auto">
        <div className="min-w-[800px]">
          <OrgNode node={ORG} />
        </div>
      </div>

      {/* Legend */}
      <div className="rounded-sm border border-stroke bg-white shadow-default p-4">
        <p className="text-xs text-bodydark font-medium mb-3">DEPARTMENTS</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(DEPT_COLORS).map(([dept, cls]) => (
            <span key={dept} className={`inline-flex rounded-full px-3 py-1 text-xs font-medium border ${cls}`}>
              {dept}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
