import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { postAPI } from "../api/post";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Button from "../components/Button";
import Input from "../components/Input";
import "./PostList.css";

// 기본 이미지 URL (AWS S3)
const DEFAULT_IMAGE_URL = "https://board-image-s3-bucket.s3.ap-northeast-2.amazonaws.com/default_image.jpg";

// 카테고리 목록 (메뉴판)
const CATEGORIES = [
  { id: "all", name: "전체", value: null },
  { id: 1, name: "IT", value: 1 },
  { id: 2, name: "게임", value: 2 },
  { id: 3, name: "스포츠", value: 3 },
  { id: 4, name: "주식", value: 4 },
];

const PostList = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const abortController = new AbortController();
    
    const loadPosts = async () => {
      try {
        setLoading(true);
        let response;
        if (selectedCategory) {
          response = await postAPI.getCategoryPostList(
            selectedCategory,
            page,
            10
          );
        } else {
          response = await postAPI.getPostList(page, 10);
        }
        
        if (!abortController.signal.aborted) {
          setPosts(response.content || []);
          setTotalPages(response.totalPages || 0);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("게시글 목록 조회 실패:", error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };
    
    loadPosts();
    
    return () => {
      abortController.abort();
    };
  }, [page, selectedCategory]);


  const handleSearch = async e => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      // 검색어가 없으면 페이지를 0으로 리셋하고 useEffect가 자동으로 데이터를 로드
      setPage(0);
      setSelectedCategory(null);
      return;
    }

    try {
      setLoading(true);
      const results = await postAPI.searchPosts(searchQuery);
      setPosts(results || []);
      setTotalPages(0);
      setSelectedCategory(null); // 검색 시 카테고리 필터 초기화
    } catch (error) {
      console.error("검색 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = categoryId => {
    setSelectedCategory(categoryId);
    setPage(0); // 카테고리 변경 시 첫 페이지로
    setSearchQuery(""); // 검색어 초기화
  };

  const formatDate = dateString => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return (
    <Layout>
      <div className="post-list-container">
        <div className="post-list-header">
          <h1 className="post-list-title">게시글 목록</h1>
          <Button
            variant="primary"
            onClick={() => {
              if (isAuthenticated) {
                navigate("/posts/write");
              } else {
                navigate("/login");
              }
            }}
          >
            글쓰기
          </Button>
        </div>

        {/* 카테고리 탭 메뉴 */}
        <div className="category-menu">
          {CATEGORIES.map(category => (
            <button
              key={category.id}
              className={`category-tab ${
                selectedCategory === category.value ? "active" : ""
              }`}
              onClick={() => handleCategoryClick(category.value)}
            >
              {category.name}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="search-form">
          <Input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="게시글 검색..."
            style={{ flex: 1 }}
          />
          <Button type="submit" variant="primary">
            검색
          </Button>
        </form>

        {loading ? (
          <div className="loading">로딩 중...</div>
        ) : posts.length === 0 ? (
          <div className="empty-state">게시글이 없습니다.</div>
        ) : (
          <>
            <div className="post-list">
              {posts.map(post => (
                <Link
                  key={post.id}
                  to={`/posts/${post.id}`}
                  className="post-item"
                >
                  <div className="post-item-content">
                    <div className="post-item-main">
                      <div className="post-item-header">
                        <span className="post-category">{post.category}</span>
                        <span className="post-date">
                          {formatDate(post.createdDate)}
                        </span>
                      </div>
                      <h2 className="post-title">{post.title}</h2>
                      <div className="post-item-footer">
                        <div className="post-author-info">
                          <span className="post-writer">작성자: {post.writer}</span>
                        </div>
                        <div className="post-stats">
                          <span className="stat-item">
                            <span className="stat-icon">👁</span>
                            <span className="stat-value">{post.postView}</span>
                          </span>
                          <span className="stat-item">
                            <span className="stat-icon">👍</span>
                            <span className="stat-value">{post.likeCount}</span>
                          </span>
                          <span className="stat-item">
                            <span className="stat-icon">💬</span>
                            <span className="stat-value">{post.commentCount}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="post-thumbnail">
                      <img 
                        src={post.thumbnailUrl || DEFAULT_IMAGE_URL} 
                        alt={post.title}
                        className="thumbnail-image"
                        onError={(e) => {
                          e.target.src = DEFAULT_IMAGE_URL;
                        }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 0 && (
              <div className="pagination">
                <Button
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  이전
                </Button>
                <span className="page-info">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  다음
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default PostList;
