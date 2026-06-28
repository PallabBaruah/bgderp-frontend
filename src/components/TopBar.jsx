export default function TopBar({ title, children }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="topbar-right">{children}</div>
    </header>
  );
}
