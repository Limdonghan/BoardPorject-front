import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { postAPI } from "../api/post";
import Layout from "../components/Layout";
import Input from "../components/Input";
import Textarea from "../components/Textarea";
import Button from "../components/Button";
import "./PostWrite.css";

const PostWrite = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    category: 1,
    context: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    try {
      await postAPI.createPost(
        formData.title,
        parseInt(formData.category),
        formData.context
      );
      navigate("/posts");
    } catch (error) {
      setError("게시글 작성에 실패했습니다.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="post-write-container">
        <div className="post-write-card">
          <h1 className="post-write-title">게시글 작성</h1>
          <form onSubmit={handleSubmit} className="post-write-form">
            <Input
              label="제목"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="제목을 입력하세요"
              required
              disabled={loading}
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
                disabled={loading}
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
              disabled={loading}
            />
            {error && <div className="error-message">{error}</div>}
            <div className="form-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/posts")}
                disabled={loading}
              >
                취소
              </Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? "작성 중..." : "작성하기"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default PostWrite;
