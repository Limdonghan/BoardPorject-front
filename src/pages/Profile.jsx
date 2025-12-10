import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../api/auth";
import Layout from "../components/Layout";
import Button from "../components/Button";
import Input from "../components/Input";
import "./Profile.css";

const formatDate = dateString => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Profile = () => {
  const { user, isAuthenticated } = useAuth();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [nicknameCheck, setNicknameCheck] = useState(null); // null: 미체크, true: 중복, false: 사용가능
  const [checkingNickname, setCheckingNickname] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserInfo();
    }
  }, [isAuthenticated]);

  const fetchUserInfo = async () => {
    try {
      setLoading(true);
      const data = await authAPI.getCurrentUser();
      setUserInfo(data);
      setEditNickname(
        data?.nickName ||
          data?.username ||
          user?.nickName ||
          user?.username ||
          ""
      );
    } catch (error) {
      console.error("사용자 정보 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setError("");
    setSuccess("");
    // 수정 모드 열 때 닉네임 필드 비우기
    setEditNickname("");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setNicknameCheck(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError("");
    setSuccess("");
    setEditNickname(
      userInfo?.nickName ||
        userInfo?.username ||
        user?.nickName ||
        user?.username ||
        ""
    );
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setNicknameCheck(null);
  };

  const handleCheckNickname = async () => {
    if (!editNickname.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }

    // 현재 닉네임과 동일하면 중복 체크 불필요
    const currentNickname =
      userInfo?.nickName ||
      userInfo?.username ||
      user?.nickName ||
      user?.username ||
      "";
    if (editNickname.trim() === currentNickname) {
      setNicknameCheck(false);
      setError("");
      return;
    }

    setCheckingNickname(true);
    setError("");
    try {
      const isDuplicate = await authAPI.checkNickname(editNickname.trim());
      setNicknameCheck(isDuplicate);
      if (isDuplicate) {
        setError("이미 사용 중인 닉네임입니다.");
      } else {
        setError("");
      }
    } catch (error) {
      console.error("닉네임 중복 체크 실패:", error);
      setError("닉네임 중복 체크에 실패했습니다.");
      setNicknameCheck(null);
    } finally {
      setCheckingNickname(false);
    }
  };

  const handleUpdateProfile = async e => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      // 닉네임이 변경된 경우 중복 체크 확인
      const currentNickname = userInfo?.nickName || "";

      if (editNickname.trim() !== currentNickname) {
        if (nicknameCheck === null) {
          setError("닉네임 중복 체크를 해주세요.");
          setSubmitting(false);
          return;
        }
        if (nicknameCheck === true) {
          setError("이미 사용 중인 닉네임입니다.");
          setSubmitting(false);
          return;
        }
      }

      // 닉네임 수정
      if (editNickname.trim()) {
        await authAPI.updateProfile(editNickname.trim());
      }

      // 비밀번호 수정 (입력된 경우만)
      if (oldPassword || newPassword || confirmPassword) {
        if (!oldPassword || !newPassword || !confirmPassword) {
          setError("비밀번호 변경을 위해서는 모든 필드를 입력해주세요.");
          setSubmitting(false);
          return;
        }

        if (newPassword !== confirmPassword) {
          setError("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
          setSubmitting(false);
          return;
        }

        if (newPassword.length < 6) {
          setError("새 비밀번호는 최소 6자 이상이어야 합니다.");
          setSubmitting(false);
          return;
        }

        await authAPI.updatePassword(oldPassword, newPassword);
      }

      setSuccess("정보가 성공적으로 수정되었습니다.");
      await fetchUserInfo();
      // 수정 완료 후 닉네임 필드 비우기
      setEditNickname("");
      setNicknameCheck(null);
      setTimeout(() => {
        setIsEditing(false);
        setSuccess("");
      }, 2000);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "정보 수정에 실패했습니다.";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="profile-container">
          <div className="profile-error">로그인이 필요합니다.</div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="profile-container">
          <div className="profile-loading">로딩 중...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="profile-container">
        <div className="profile-card">
          <h1 className="profile-title">내 정보</h1>

          <div className="profile-info">
            <div className="profile-item">
              <span className="profile-label">이메일</span>
              <span className="profile-value">
                {userInfo?.email || user?.email || "-"}
              </span>
            </div>

            <div className="profile-item">
              <span className="profile-label">닉네임</span>
              <span className="profile-value">
                {userInfo?.nickName ||
                  user?.nickName ||
                  userInfo?.username ||
                  user?.username ||
                  "-"}
              </span>
            </div>

            <div className="profile-item">
              <span className="profile-label">등급</span>
              <span className="profile-value">
                {userInfo?.grade || user?.grade || "-"}
              </span>
            </div>

            <div className="profile-item">
              <span className="profile-label">보유 포인트</span>
              <span className="profile-value profile-point">
                {userInfo?.points}
              </span>
            </div>

            <div className="profile-item">
              <span className="profile-label">가입일</span>
              <span className="profile-value">
                {formatDate(userInfo?.createdAt)}
              </span>
            </div>
            {userInfo?.id && (
              <div className="profile-item">
                <span className="profile-label">사용자 ID</span>
                <span className="profile-value">{userInfo.id}</span>
              </div>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="profile-edit-form">
              <div className="profile-edit-section">
                <h3 className="profile-edit-title">정보 수정</h3>

                <div className="nickname-input-wrapper">
                  <Input
                    label="닉네임"
                    type="text"
                    value={editNickname}
                    onChange={e => {
                      setEditNickname(e.target.value);
                      setNicknameCheck(null);
                      setError("");
                    }}
                    placeholder="닉네임을 입력하세요"
                    required
                    disabled={submitting || checkingNickname}
                    error={
                      nicknameCheck === true
                        ? "이미 사용 중인 닉네임입니다."
                        : ""
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCheckNickname}
                    disabled={
                      submitting || checkingNickname || !editNickname.trim()
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

                <div className="password-section">
                  <h4 className="password-section-title">
                    비밀번호 변경 (선택사항)
                  </h4>
                  <Input
                    label="현재 비밀번호"
                    type="password"
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="현재 비밀번호를 입력하세요"
                  />
                  <Input
                    label="새 비밀번호"
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="새 비밀번호를 입력하세요"
                  />
                  <Input
                    label="새 비밀번호 확인"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="새 비밀번호를 다시 입력하세요"
                  />
                </div>

                {error && <div className="profile-error-message">{error}</div>}
                {success && (
                  <div className="profile-success-message">{success}</div>
                )}

                <div className="profile-edit-actions">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={submitting}
                  >
                    취소
                  </Button>
                  <Button type="submit" variant="primary" disabled={submitting}>
                    {submitting ? "저장 중..." : "저장"}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <div className="profile-actions">
              <Button variant="outline" onClick={handleEditClick}>
                정보 수정
              </Button>
              <Button variant="primary" onClick={fetchUserInfo}>
                정보 새로고침
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
