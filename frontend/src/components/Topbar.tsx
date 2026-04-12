import { Link, useNavigate } from "react-router-dom";

type TopbarProps = {
  /** If provided, shows a back arrow link to this path */
  backTo?: string;
  /** Greeting name to show on the right (Home only) */
  userName?: string;
  /** Whether to show the logout button */
  showLogout?: boolean;
};

const Topbar = ({ backTo, userName, showLogout = true }: TopbarProps) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {backTo && (
          <Link to={backTo} className="topbar-ghost-btn">
            ← Voltar
          </Link>
        )}
        <div className="topbar-logo">
          <span>◆</span> Dashboard
        </div>
      </div>
      <div className="topbar-actions">
        {userName && (
          <span className="topbar-greeting">Olá, {userName}</span>
        )}
        {showLogout && (
          <button
            type="button"
            className="topbar-ghost-btn"
            onClick={handleLogout}
          >
            Sair
          </button>
        )}
      </div>
    </header>
  );
};

export default Topbar;
