import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { postAPI } from "../api/post";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Input from "../components/Input";
import Textarea from "../components/Textarea";
import Button from "../components/Button";
import "./PostEdit.css";

const PostEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    category: 1,
    context: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // 인증 로딩이 완료될 때까지 대기
    if (authLoading) {
      return;
    }

    // 로그인 확인
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      setError("로그인이 필요합니다.");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
      setLoading(false);
      return;
    }

    // 사용자 정보가 로드된 후 게시글 가져오기
    fetchPost();
  }, [id, user, authLoading, navigate]);

  const fetchPost = async () => {
    try {
      const post = await postAPI.getPost(id);
      console.log("수정할 게시글 정보:", post);

      // 게시글 작성자 확인
      const postAuthor =
        post.user || post.authorName || post.writer || post.username;
      const currentUser =
        user?.username || user?.nickName || user?.email || user?.user;

      console.log("권한 확인:", {
        postAuthor,
        currentUser,
        isMatch: postAuthor === currentUser,
      });

      // 작성자가 아니면 권한 없음 메시지 표시
      if (postAuthor && currentUser && postAuthor !== currentUser) {
        setError("본인이 작성한 게시글만 수정할 수 있습니다.");
        setTimeout(() => {
          navigate(`/posts/${id}`);
        }, 2000);
        setLoading(false);
        return;
      }

      setFormData({
        title: post.title || "",
        category: post.category || post.categoryId || post.category?.id || 1,
        context: post.context || post.content || "",
      });
    } catch (error) {
      console.error("게시글 불러오기 실패:", error);
      console.error("에러 상세:", error.response?.data);

      if (error.response?.status === 403) {
        setError("권한이 없습니다. 본인이 작성한 게시글만 수정할 수 있습니다.");
        setTimeout(() => {
          navigate(`/posts/${id}`);
        }, 2000);
      } else {
        setError("게시글을 불러오는데 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = e => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.context.trim()) {
      setError("제목과 내용을 입력해주세요.");
      return;
    }

    // 로그인 확인
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      setError("로그인이 필요합니다.");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      console.log("수정 요청 데이터:", {
        id,
        title: formData.title,
        category: formData.category,
        context: formData.context,
      });
      console.log("현재 사용자 정보:", user);
      console.log("토큰 존재 여부:", !!accessToken);

      const result = await postAPI.updatePost(
        id,
        formData.title,
        parseInt(formData.category),
        formData.context
      );
      console.log("수정 성공:", result);
      navigate(`/posts/${id}`);
    } catch (error) {
      console.error("게시글 수정 실패:", error);
      console.error("에러 응답:", error.response);
      console.error("에러 상태:", error.response?.status);
      console.error("에러 상세:", error.response?.data);

      let errorMessage = "게시글 수정에 실패했습니다.";

      if (error.response?.status === 403) {
        // 토큰 재발급이 이미 시도되었고 여전히 403이면 실제 권한 문제
        errorMessage =
          "권한이 없습니다. 본인이 작성한 게시글만 수정할 수 있습니다.";
      } else if (error.response?.status === 401) {
        errorMessage = "로그인이 필요합니다. 다시 로그인해주세요.";
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "게시글 수정에 실패했습니다.";
      }

      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading">로딩 중...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="post-edit-container">
        <div className="post-edit-card">
          <h1 className="post-edit-title">게시글 수정</h1>
          <form onSubmit={handleSubmit} className="post-edit-form">
            <Input
              label="제목"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="제목을 입력하세요"
              required
              disabled={submitting}
            />
            <div className="form-group">
              <label className="form-label">
                카테고리
                <span className="required">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="select-input"
                disabled={submitting}
              >
                <option value={1}>IT</option>
                <option value={2}>게임</option>
                <option value={3}>주식</option>
                <option value={4}>스포츠</option>
              </select>
            </div>
            <Textarea
              label="내용"
              name="context"
              value={formData.context}
              onChange={handleChange}
              placeholder="내용을 입력하세요"
              rows={15}
              required
              disabled={submitting}
            />
            {error && <div className="error-message">{error}</div>}
            <div className="form-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(`/posts/${id}`)}
                disabled={submitting}
              >
                취소
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "수정 중..." : "수정하기"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default PostEdit;
