import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { postAPI } from "../api/post";
import { awsAPI } from "../api/aws";
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
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: "",
    category: 1,
    context: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingImages, setExistingImages] = useState([]); // 기존 이미지 URL들
  const [imageFiles, setImageFiles] = useState([]); // 새로 추가할 이미지 파일들
  const [imagePreviews, setImagePreviews] = useState([]); // 새 이미지 미리보기
  const [uploadingImages, setUploadingImages] = useState(false);
  const [originalCategoryId, setOriginalCategoryId] = useState(null); // 원래 카테고리 ID 저장

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    
    // 인증 로딩이 완료될 때까지 대기
    if (authLoading) {
      return;
    }

    // 로그인 확인
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      if (isMounted) {
        setError("로그인이 필요합니다.");
        setTimeout(() => {
          navigate("/login");
        }, 1500);
        setLoading(false);
      }
      return;
    }

    // 사용자 정보가 로드된 후 게시글 가져오기
    const loadPost = async () => {
      try {
        setLoading(true);
        const post = await postAPI.getPost(id);
        
        if (abortController.signal.aborted || !isMounted) return;
        
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
          if (isMounted) {
            setError("본인이 작성한 게시글만 수정할 수 있습니다.");
            setTimeout(() => {
              navigate(`/posts/${id}`);
            }, 2000);
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          // 카테고리 이름을 ID로 변환
          const categoryNameToId = {
            "IT": 1,
            "게임": 2,
            "주식": 3,
            "스포츠": 4
          };
          
          // 카테고리 ID 찾기 (문자열 카테고리 이름 또는 숫자 ID)
          let categoryId = 1; // 기본값
          if (post.categoryId) {
            categoryId = post.categoryId;
          } else if (post.category?.id) {
            categoryId = post.category.id;
          } else if (typeof post.category === 'string') {
            categoryId = categoryNameToId[post.category] || 1;
          } else if (typeof post.category === 'number') {
            categoryId = post.category;
          }
          
          setOriginalCategoryId(categoryId);
          
          setFormData({
            title: post.title || "",
            category: categoryId,
            context: post.context || post.content || "",
          });
          
          // 기존 이미지 설정
          if (post.imageUrl && Array.isArray(post.imageUrl)) {
            setExistingImages(post.imageUrl);
          }
          setLoading(false);
        }
      } catch (error) {
        if (abortController.signal.aborted || !isMounted) return;
        
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
        setLoading(false);
      }
    };
    
    loadPost();
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [id, user, authLoading, navigate]);

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

  const removeExistingImage = index => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = index => {
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
    setUploadingImages(true);
    setError("");
    try {
      let imageUrls = [...existingImages]; // 기존 이미지 URL 유지
      
      // 새 이미지가 있으면 업로드
      if (imageFiles.length > 0) {
        try {
          const newImageUrls = await awsAPI.uploadImages(imageFiles);
          imageUrls = [...imageUrls, ...newImageUrls];
        } catch (uploadError) {
          console.error("이미지 업로드 실패:", uploadError);
          setError("이미지 업로드에 실패했습니다.");
          setUploadingImages(false);
          setSubmitting(false);
          return;
        }
      }

      console.log("수정 요청 데이터:", {
        id,
        title: formData.title,
        category: formData.category,
        context: formData.context,
        imageUrls,
      });
      console.log("현재 사용자 정보:", user);
      console.log("토큰 존재 여부:", !!accessToken);

      const result = await postAPI.updatePost(
        id,
        formData.title,
        parseInt(formData.category),
        formData.context,
        imageUrls
      );
      console.log("수정 성공:", result);
      
      // 미리보기 URL 정리
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
      
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
      setUploadingImages(false);
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
            
            {/* 이미지 업로드 */}
            <div className="form-group">
              <label className="form-label">
                이미지
              </label>
              
              {/* 기존 이미지 표시 */}
              {existingImages.length > 0 && (
                <div className="existing-images-container">
                  <div className="existing-images-label">기존 이미지</div>
                  <div className="image-preview-container">
                    {existingImages.map((url, index) => (
                      <div key={index} className="image-preview-item">
                        <img src={url} alt={`기존 이미지 ${index + 1}`} />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(index)}
                          className="remove-image-btn"
                          disabled={submitting || uploadingImages}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 새 이미지 추가 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                disabled={submitting || uploadingImages}
                className="file-input"
              />
              
              {/* 새 이미지 미리보기 */}
              {imagePreviews.length > 0 && (
                <div className="new-images-container">
                  <div className="new-images-label">추가할 이미지</div>
                  <div className="image-preview-container">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="image-preview-item">
                        <img src={preview} alt={`새 이미지 ${index + 1}`} />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="remove-image-btn"
                          disabled={submitting || uploadingImages}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
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
