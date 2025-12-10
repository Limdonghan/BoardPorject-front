import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../api/auth";
import Layout from "../components/Layout";
import Input from "../components/Input";
import Button from "../components/Button";
import "./Signup.css";

const Signup = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    nickName: "",
    grade: 1,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [nicknameCheck, setNicknameCheck] = useState(null); // null: 미체크, true: 중복, false: 사용가능
  const [checkingNickname, setCheckingNickname] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = e => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
    // 닉네임이 변경되면 중복 체크 결과 초기화
    if (e.target.name === "nickName") {
      setNicknameCheck(null);
    }
  };

  const handleCheckNickname = async () => {
    if (!formData.nickName.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }

    setCheckingNickname(true);
    setError("");
    try {
      const isDuplicate = await authAPI.checkNickname(formData.nickName.trim());
      setNicknameCheck(isDuplicate);
      if (isDuplicate) {
        setError("이미 사용 중인 닉네임입니다.");
      }
    } catch (error) {
      console.error("닉네임 중복 체크 실패:", error);
      setError("닉네임 중복 체크에 실패했습니다.");
      setNicknameCheck(null);
    } finally {
      setCheckingNickname(false);
    }
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.nickName) {
      setError("모든 필드를 입력해주세요.");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return false;
    }

    if (formData.password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return false;
    }

    if (nicknameCheck === null) {
      setError("닉네임 중복 체크를 해주세요.");
      return false;
    }

    if (nicknameCheck === true) {
      setError("이미 사용 중인 닉네임입니다.");
      return false;
    }

    return true;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const result = await signup(
      formData.email,
      formData.password,
      formData.nickName,
      formData.grade
    );
    setLoading(false);

    if (result.success) {
      alert("회원가입이 완료되었습니다. 로그인해주세요.");
      navigate("/login");
    } else {
      setError(result.message || "회원가입에 실패했습니다.");
    }
  };

  return (
    <Layout>
      <div className="signup-container">
        <div className="signup-card">
          <h1 className="signup-title">회원가입</h1>
          <form onSubmit={handleSubmit} className="signup-form">
            <Input
              label="이메일"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="이메일을 입력하세요"
              required
              disabled={loading}
            />
            <Input
              label="비밀번호"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="비밀번호를 입력하세요 (최소 6자)"
              required
              disabled={loading}
            />
            <Input
              label="비밀번호 확인"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="비밀번호를 다시 입력하세요"
              required
              disabled={loading}
            />
            <div className="nickname-input-wrapper">
              <Input
                label="닉네임"
                type="text"
                name="nickName"
                value={formData.nickName}
                onChange={handleChange}
                placeholder="닉네임을 입력하세요"
                required
                disabled={loading || checkingNickname}
                error={
                  nicknameCheck === true ? "이미 사용 중인 닉네임입니다." : ""
                }
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCheckNickname}
                disabled={
                  loading || checkingNickname || !formData.nickName.trim()
                }
                className="nickname-check-btn"
              >
                {checkingNickname ? "확인 중..." : "중복 체크"}
              </Button>
            </div>
            {nicknameCheck === false && (
              <div className="nickname-available">
                사용 가능한 닉네임입니다.
              </div>
            )}
            {error && <div className="error-message">{error}</div>}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
            >
              {loading ? "가입 중..." : "회원가입"}
            </Button>
          </form>
          <div className="signup-footer">
            <span>이미 계정이 있으신가요? </span>
            <Link to="/login" className="link">
              로그인
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Signup;
