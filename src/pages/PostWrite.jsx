import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { postAPI } from "../api/post";
import { awsAPI } from "../api/aws";
import Layout from "../components/Layout";
import Input from "../components/Input";
import Textarea from "../components/Textarea";
import Button from "../components/Button";
import "./PostWrite.css";

const PostWrite = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: "",
    category: 1,
    context: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const handleChange = e => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleImageChange = e => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // 이미지 파일만 필터링
    const imageFiles = files.filter(file => file.type.startsWith("image/"));

    if (imageFiles.length !== files.length) {
      setError("이미지 파일만 업로드 가능합니다.");
      return;
    }

    // 미리보기 생성
    const previews = imageFiles.map(file => URL.createObjectURL(file));

    setImageFiles(prev => [...prev, ...imageFiles]);
    setImagePreviews(prev => [...prev, ...previews]);
    setError("");
  };

  const removeImage = index => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    // 파일 input 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.context.trim()) {
      setError("제목과 내용을 입력해주세요.");
      return;
    }

    setLoading(true);
    setUploadingImages(true);
    try {
      let imageUrls = [];

      // 이미지가 있으면 업로드
      if (imageFiles.length > 0) {
        try {
          imageUrls = await awsAPI.uploadImages(imageFiles);
        } catch (uploadError) {
          console.error("이미지 업로드 실패:", uploadError);
          setError("이미지 업로드에 실패했습니다.");
          setUploadingImages(false);
          setLoading(false);
          return;
        }
      }

      await postAPI.createPost(
        formData.title,
        parseInt(formData.category),
        formData.context,
        imageUrls
      );

      // 미리보기 URL 정리
      imagePreviews.forEach(url => URL.revokeObjectURL(url));

      navigate("/posts");
    } catch (error) {
      setError("게시글 작성에 실패했습니다.");
      console.error(error);
    } finally {
      setLoading(false);
      setUploadingImages(false);
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

            {/* 이미지 업로드 */}
            <div className="form-group">
              <label className="form-label">이미지</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                disabled={loading || uploadingImages}
                className="file-input"
              />
              {imagePreviews.length > 0 && (
                <div className="image-preview-container">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="image-preview-item">
                      <img src={preview} alt={`미리보기 ${index + 1}`} />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="remove-image-btn"
                        disabled={loading || uploadingImages}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <div className="error-message">{error}</div>}
            {uploadingImages && (
              <div className="uploading-message">이미지 업로드 중...</div>
            )}
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
