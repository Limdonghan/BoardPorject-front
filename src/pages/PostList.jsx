import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { postAPI } from "../api/post";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Button from "../components/Button";
import Input from "../components/Input";
import "./PostList.css";

// 기본 이미지 URL (AWS S3)
const DEFAULT_IMAGE_URL =
  "https://board-image-s3-bucket.s3.ap-northeast-2.amazonaws.com/default_image.jpg";

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

  /**
   * 게시글 검색 핸들러
   * 검색어를 입력받아 게시글을 검색하고 결과를 표시
   * @param {Event} e - 폼 제출 이벤트
   */
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

      // 검색 결과 디버깅을 위한 로그
      console.log("검색 결과 원본:", results);

      // 검색 결과가 배열인지 객체인지 확인
      let searchResults = [];
      if (Array.isArray(results)) {
        // 직접 배열로 반환되는 경우
        searchResults = results;
      } else if (results && typeof results === "object") {
        // 객체 안에 배열이 있는 경우 (다양한 필드명 대응)
        searchResults =
          results.content ||
          results.posts ||
          results.data ||
          results.results ||
          [];
      }

      console.log("검색 결과 배열:", searchResults);

      // 검색 결과 데이터 정규화 (필드명 통일)
      const normalizedResults = searchResults.map((post, index) => {
        // 이미지 URL 추출 로직 개선
        let thumbnailUrl = null;

        // 1. thumbnailUrl 필드 확인
        if (post.thumbnailUrl) {
          thumbnailUrl = post.thumbnailUrl;
        }
        // 2. imageURL (백엔드 PostSearchResultDTO의 필드명 - 대문자 URL)
        else if (
          post.imageURL &&
          Array.isArray(post.imageURL) &&
          post.imageURL.length > 0
        ) {
          thumbnailUrl = post.imageURL[0];
        }
        // 3. imageURL이 문자열인 경우 직접 사용
        else if (post.imageURL && typeof post.imageURL === "string") {
          thumbnailUrl = post.imageURL;
        }
        // 4. imageUrl이 배열인 경우 첫 번째 이미지 사용
        else if (
          post.imageUrl &&
          Array.isArray(post.imageUrl) &&
          post.imageUrl.length > 0
        ) {
          thumbnailUrl = post.imageUrl[0];
        }
        // 5. imageUrl이 문자열인 경우 직접 사용
        else if (post.imageUrl && typeof post.imageUrl === "string") {
          thumbnailUrl = post.imageUrl;
        }
        // 6. images 배열 확인
        else if (
          post.images &&
          Array.isArray(post.images) &&
          post.images.length > 0
        ) {
          thumbnailUrl = post.images[0];
        }
        // 7. image 필드 확인
        else if (post.image) {
          thumbnailUrl = post.image;
        }

        // ID 필드 통일 (게시글 상세 페이지 이동을 위해 필수)
        // 백엔드 PostSearchResultDTO는 postId 필드 사용
        const postId = post.id || post.postId || post.post_id || null;

        const normalized = {
          ...post,
          // ID 필드 통일 (상세 페이지 이동을 위해 필수)
          id: postId,
          // 작성자 필드명 통일 (백엔드 PostSearchResultDTO는 author 필드 사용)
          writer:
            post.writer ||
            post.author ||
            post.authorName ||
            post.user ||
            post.username ||
            "알 수 없음",
          // 조회수 필드명 통일 (백엔드 PostSearchResultDTO는 viewCount 필드 사용)
          postView: post.postView || post.viewCount || post.views || 0,
          // 좋아요 필드명 통일 (백엔드 PostSearchResultDTO는 totalLikes 필드 사용)
          likeCount: post.likeCount || post.totalLikes || post.likes || 0,
          // 댓글 수 필드명 통일 (백엔드 PostSearchResultDTO는 totalComments 필드 사용)
          commentCount:
            post.commentCount || post.totalComments || post.comments || 0,
          // 썸네일 URL 필드명 통일 (백엔드 PostSearchResultDTO는 imageURL 필드 사용)
          thumbnailUrl: thumbnailUrl,
          // 날짜 필드명 통일 (백엔드 PostSearchResultDTO는 createdAt 필드 사용)
          createdDate:
            post.createdDate ||
            post.createdAt ||
            post.createDate ||
            post.date ||
            post.created_at,
          // 카테고리 필드명 통일
          category: post.category || post.categoryName || "알 수 없음",
        };

        // 디버깅을 위한 로그
        if (index === 0) {
          console.log("첫 번째 게시글 정규화 결과:", normalized);
          console.log("이미지 URL:", normalized.thumbnailUrl);
        }

        return normalized;
      });

      setPosts(normalizedResults);
      setTotalPages(0); // 검색 결과는 페이지네이션 없음
      setSelectedCategory(null); // 검색 시 카테고리 필터 초기화
    } catch (error) {
      console.error("검색 실패:", error);
      setPosts([]); // 에러 발생 시 빈 배열로 설정
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
          <Button type="submit" variant="primary" className="search-button">
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
              {posts.map(post => {
                // 게시글 ID 확인 (상세 페이지 이동을 위해 필수)
                const postId = post.id || post.postId || post.post_id;

                // ID가 없으면 클릭 불가능한 div로 표시
                if (!postId) {
                  console.warn("게시글 ID가 없습니다:", post);
                  return (
                    <div
                      key={`no-id-${post.title}`}
                      className="post-item"
                      style={{ opacity: 0.6 }}
                    >
                      <div className="post-item-content">
                        <div className="post-item-main">
                          <div className="post-item-header">
                            <span className="post-category">
                              {post.category || "알 수 없음"}
                            </span>
                            <span className="post-date">
                              {formatDate(post.createdDate || post.createdAt)}
                            </span>
                          </div>
                          <h2 className="post-title">
                            {post.title || "제목 없음"}
                          </h2>
                          <div className="post-item-footer">
                            <div className="post-author-info">
                              <span className="post-writer">
                                작성자:{" "}
                                {post.writer || post.author || "알 수 없음"}
                              </span>
                            </div>
                            <div className="post-stats">
                              <span className="stat-item">
                                <span className="stat-icon">👁</span>
                                <span className="stat-value">
                                  {post.postView ||
                                    post.viewCount ||
                                    post.views ||
                                    0}
                                </span>
                              </span>
                              <span className="stat-item">
                                <span className="stat-icon">👍</span>
                                <span className="stat-value">
                                  {post.likeCount ||
                                    post.likes ||
                                    post.totalLikes ||
                                    0}
                                </span>
                              </span>
                              <span className="stat-item">
                                <span className="stat-icon">💬</span>
                                <span className="stat-value">
                                  {post.commentCount ||
                                    post.comments ||
                                    post.totalComments ||
                                    0}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="post-thumbnail">
                          <img
                            src={
                              post.thumbnailUrl ||
                              (post.imageURL &&
                              Array.isArray(post.imageURL) &&
                              post.imageURL.length > 0
                                ? post.imageURL[0]
                                : typeof post.imageURL === "string"
                                ? post.imageURL
                                : null) ||
                              (post.imageUrl &&
                              Array.isArray(post.imageUrl) &&
                              post.imageUrl.length > 0
                                ? post.imageUrl[0]
                                : typeof post.imageUrl === "string"
                                ? post.imageUrl
                                : null) ||
                              DEFAULT_IMAGE_URL
                            }
                            alt={post.title || "게시글 이미지"}
                            className="thumbnail-image"
                            onError={e => {
                              e.target.src = DEFAULT_IMAGE_URL;
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={postId}
                    to={`/posts/${postId}`}
                    className="post-item"
                  >
                    <div className="post-item-content">
                      <div className="post-item-main">
                        <div className="post-item-header">
                          <span className="post-category">
                            {post.category || "알 수 없음"}
                          </span>
                          <span className="post-date">
                            {formatDate(post.createdDate || post.createdAt)}
                          </span>
                        </div>
                        <h2 className="post-title">
                          {post.title || "제목 없음"}
                        </h2>
                        <div className="post-item-footer">
                          <div className="post-author-info">
                            <span className="post-writer">
                              작성자:{" "}
                              {post.writer || post.author || "알 수 없음"}
                            </span>
                          </div>
                          <div className="post-stats">
                            <span className="stat-item">
                              <span className="stat-icon">👁</span>
                              <span className="stat-value">
                                {post.postView ||
                                  post.viewCount ||
                                  post.views ||
                                  0}
                              </span>
                            </span>
                            <span className="stat-item">
                              <span className="stat-icon">👍</span>
                              <span className="stat-value">
                                {post.likeCount ||
                                  post.likes ||
                                  post.totalLikes ||
                                  0}
                              </span>
                            </span>
                            <span className="stat-item">
                              <span className="stat-icon">💬</span>
                              <span className="stat-value">
                                {post.commentCount ||
                                  post.comments ||
                                  post.totalComments ||
                                  0}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="post-thumbnail">
                        <img
                          src={
                            post.thumbnailUrl ||
                            (post.imageURL &&
                            Array.isArray(post.imageURL) &&
                            post.imageURL.length > 0
                              ? post.imageURL[0]
                              : typeof post.imageURL === "string"
                              ? post.imageURL
                              : null) ||
                            (post.imageUrl &&
                            Array.isArray(post.imageUrl) &&
                            post.imageUrl.length > 0
                              ? post.imageUrl[0]
                              : typeof post.imageUrl === "string"
                              ? post.imageUrl
                              : null) ||
                            (post.images &&
                            Array.isArray(post.images) &&
                            post.images.length > 0
                              ? post.images[0]
                              : null) ||
                            post.image ||
                            DEFAULT_IMAGE_URL
                          }
                          alt={post.title || "게시글 이미지"}
                          className="thumbnail-image"
                          onError={e => {
                            console.warn("이미지 로드 실패:", e.target.src);
                            e.target.src = DEFAULT_IMAGE_URL;
                          }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {totalPages > 0 && (
              <div className="pagination">
                <Button
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  &lt;
                </Button>
                <div className="page-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i).map(
                    pageNum => {
                      // 현재 페이지 주변 2페이지씩만 표시
                      if (
                        pageNum === 0 ||
                        pageNum === totalPages - 1 ||
                        (pageNum >= page - 2 && pageNum <= page + 2)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            className={`page-number ${
                              pageNum === page ? "active" : ""
                            }`}
                            onClick={() => setPage(pageNum)}
                          >
                            {pageNum + 1}
                          </button>
                        );
                      } else if (pageNum === page - 3 || pageNum === page + 3) {
                        return (
                          <span key={pageNum} className="page-ellipsis">
                            ...
                          </span>
                        );
                      }
                      return null;
                    }
                  )}
                </div>
                <Button
                  variant="outline"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  &gt;
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
