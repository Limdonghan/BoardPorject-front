import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Input from "../components/Input";
import Button from "../components/Button";
import "./Login.css";

const Login = () => {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login: handleLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await handleLogin(login, password);
    setLoading(false);

    if (result.success) {
      navigate("/posts");
    } else {
      setError(result.message || "로그인에 실패했습니다.");
    }
  };

  return (
    <Layout>
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">로그인</h1>
          <form onSubmit={handleSubmit} className="login-form">
            <Input
              label="이메일 또는 아이디"
              type="text"
              value={login}
              onChange={e => setLogin(e.target.value)}
              placeholder="이메일 또는 아이디를 입력하세요"
              required
              disabled={loading}
            />
            <Input
              label="비밀번호"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
              disabled={loading}
            />
            {error && <div className="error-message">{error}</div>}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
            >
              {loading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
          <div className="login-footer">
            <span>계정이 없으신가요? </span>
            <Link to="/signup" className="link">
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Login;
