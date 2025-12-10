import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../api/auth";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 페이지 로드 시 토큰 확인 및 사용자 정보 가져오기
    const initAuth = async () => {
      const accessToken = localStorage.getItem("accessToken");
      if (accessToken) {
        try {
          const userInfo = await authAPI.getCurrentUser();
          console.log("사용자 정보 응답 (전체):", userInfo);
          console.log(
            "사용자 정보 모든 키:",
            userInfo ? Object.keys(userInfo) : []
          );
          setUser(userInfo);
        } catch (error) {
          // 토큰이 유효하지 않은 경우
          console.error("Auth initialization error:", error);
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (login, password) => {
    try {
      const tokenData = await authAPI.login(login, password);

      // 서버 응답 구조에 따라 다양한 필드명 시도
      const accessToken =
        tokenData.AccessToken ||
        tokenData.accessToken ||
        tokenData.access_token;
      const refreshToken =
        tokenData.RefreshToken ||
        tokenData.refreshToken ||
        tokenData.refresh_token;

      if (!accessToken || !refreshToken) {
        console.error("토큰 응답 구조:", tokenData);
        return {
          success: false,
          message: "서버에서 토큰을 받지 못했습니다.",
        };
      }

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      const userInfo = await authAPI.getCurrentUser();
      console.log("로그인 후 사용자 정보 (전체):", userInfo);
      console.log(
        "사용자 정보 모든 키:",
        userInfo ? Object.keys(userInfo) : []
      );
      setUser(userInfo);
      return { success: true };
    } catch (error) {
      console.error("로그인 에러:", error);
      return {
        success: false,
        message: error.response?.data?.message || "로그인에 실패했습니다.",
      };
    }
  };

  const logout = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (accessToken) {
        await authAPI.logout(accessToken);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setUser(null);
    }
  };

  const signup = async (email, password, nickName, grade) => {
    try {
      await authAPI.signup(email, password, nickName, grade);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "회원가입에 실패했습니다.",
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    signup,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
