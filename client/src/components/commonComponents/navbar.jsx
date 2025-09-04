import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const navLinks = {
    admin: [
      { to: "/admin", label: "Dashboard" },
      { to: "/admin/users", label: "Users" },
    ],
    merchant: [
      { to: "/merchant", label: "Dashboard" },
      { to: "/merchant/orders", label: "Orders" },
    ]
  };

  return (
    <nav className="flex justify-between items-center bg-gray-800 p-4 text-white">
      <div className="font-bold text-lg">My App</div>

      <div className="relative">
        {user ? (
          <>
            {/* Dropdown Toggle */}
            <button
              onClick={() => setOpen(!open)}
              className="bg-gray-700 px-3 py-1 rounded"
            >
              {user.role.toUpperCase()}
            </button>

            {/* Dropdown Menu */}
            {open && (
              <ul className="absolute right-0 mt-2 w-48 bg-white text-black rounded shadow-lg z-50">
                {navLinks[user.role]?.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}

                <li>
                  <button
                    onClick={() => {
                      logout();
                      setOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </li>
              </ul>
            )}
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
