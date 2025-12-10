import apiClient from "./axios";

export const authAPI = {
  // 로그인
  login: async (login, password) => {
    const response = await apiClient.post("/api/auth/login", {
      login,
      password,
    });
    return response.data;
  },

  // 로그아웃
  logout: async accessToken => {
    const response = await apiClient.post("/api/auth/logOut", {
      AccessToken: accessToken,
    });
    return response.data;
  },

  // 회원가입
  signup: async (email, password, nickName, grade) => {
    const response = await apiClient.post("/api/user/createAccount", {
      email,
      password,
      nickName,
      grade,
    });
    return response.data;
  },

  // 현재 사용자 정보
  getCurrentUser: async () => {
    const response = await apiClient.get("/api/user/me");
    return response.data;
  },

  // 토큰 갱신
  refreshToken: async refreshToken => {
    const response = await apiClient.post("/api/user/refresh", {
      refreshToken,
    });
    return response.data;
  },

  // 프로필 수정 (닉네임)
  updateProfile: async username => {
    const response = await apiClient.patch("/api/user/profile", {
      username,
    });
    return response.data;
  },

  // 비밀번호 수정
  updatePassword: async (oldPassword, newPassword) => {
    const response = await apiClient.patch("/api/user/password", {
      oldPassword,
      newPassword,
    });
    return response.data;
  },

  // 닉네임 중복 체크
  checkNickname: async nickname => {
    const response = await apiClient.get("/api/user/check-nickname", {
      params: { nickname },
    });
    return response.data; // true면 중복, false면 사용 가능
  },
};
