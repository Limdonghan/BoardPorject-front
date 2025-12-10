import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "./Button";
import "./Layout.css";

const Layout = ({ children }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-container">
          <Link to="/" className="logo">
            게시판
          </Link>
          <nav className="nav">
            {isAuthenticated ? (
              <>
                <Link to="/posts" className="nav-link">
                  게시글 목록
                </Link>
                <Link to="/posts/write" className="nav-link">
                  글쓰기
                </Link>
                <Link to="/posts/my" className="nav-link">
                  내 게시글
                </Link>
                <Link to="/profile" className="nav-link">
                  내 정보
                </Link>
                {(user?.role === "ADMIN" || user?.role === "ROLE_ADMIN") && (
                  <Link to="/admin" className="nav-link admin-link">
                    관리자
                  </Link>
                )}
                <span className="nav-user">{user?.username}</span>
                <Button variant="outline" size="small" onClick={handleLogout}>
                  로그아웃
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">
                  로그인
                </Link>
                <Link to="/signup">
                  <Button variant="primary" size="small">
                    회원가입
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
};

export default Layout;
