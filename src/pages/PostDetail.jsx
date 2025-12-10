import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { postAPI } from "../api/post";
import { commentAPI } from "../api/comment";
import { reportAPI } from "../api/report";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Button from "../components/Button";
import Input from "../components/Input";
import Textarea from "../components/Textarea";
import ReportModal from "../components/ReportModal";
import "./PostDetail.css";

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [userReaction, setUserReaction] = useState(null); // "LIKE" | "DISLIKE" | null
  const [prevPost, setPrevPost] = useState(null);
  const [nextPost, setNextPost] = useState(null);
  const [showPostReportModal, setShowPostReportModal] = useState(false);
  const [showCommentReportModal, setShowCommentReportModal] = useState(null); // commentId

  useEffect(() => {
    fetchPost();
    fetchComments();
    fetchAdjacentPosts();
  }, [id]);

  useEffect(() => {
    // user 정보가 로드된 후 isOwner 업데이트
    if (post && user) {
      // 게시글 작성자 필드 (다양한 필드명 시도)
      const postAuthor =
        post.user || post.authorName || post.writer || post.username;
      // 현재 사용자 필드 (다양한 필드명 시도)
      const currentUser =
        user?.username || user?.nickName || user?.email || user?.user;

      console.log("isOwner 체크:", {
        postAuthor,
        currentUser,
        postAuthorType: typeof postAuthor,
        currentUserType: typeof currentUser,
        post: {
          user: post.user,
          authorName: post.authorName,
          writer: post.writer,
          username: post.username,
          userId: post.userId,
          authorId: post.authorId,
          writerId: post.writerId,
          createdBy: post.createdBy,
          ownerId: post.ownerId,
        },
        user: {
          username: user?.username,
          nickName: user?.nickName,
          email: user?.email,
          user: user?.user,
          id: user?.id,
          userId: user?.userId,
          // 사용자 객체의 모든 키
          allKeys: user ? Object.keys(user) : [],
        },
        isMatch: postAuthor === currentUser,
        isMatchStrict: postAuthor === currentUser,
        isMatchLoose: String(postAuthor) === String(currentUser),
      });

      // 사용자 객체 전체 로깅
      console.log("사용자 정보 전체:", user);

      setIsOwner(postAuthor === currentUser);
    } else {
      setIsOwner(false);
    }
  }, [user, post]);

  const fetchPost = async () => {
    try {
      const postData = await postAPI.getPost(id);
      console.log("게시글 상세 정보 (전체):", postData);
      console.log("게시글 작성자 관련 모든 필드:", {
        user: postData.user,
        authorName: postData.authorName,
        writer: postData.writer,
        username: postData.username,
        userId: postData.userId,
        authorId: postData.authorId,
        writerId: postData.writerId,
        createdBy: postData.createdBy,
        ownerId: postData.ownerId,
        // 모든 키 확인
        allKeys: Object.keys(postData),
      });
      setPost(postData);
    } catch (error) {
      console.error("게시글 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const commentsData = await commentAPI.getComments(id);
      // 각 댓글에 좋아요/싫어요 수 초기화 (없으면 0)
      const commentsWithReactions = (commentsData || []).map(comment => ({
        ...comment,
        likeCount: comment.likeCount || 0,
        disLikeCount: comment.disLikeCount || 0,
        userReaction: null, // 사용자의 반응 상태
      }));
      setComments(commentsWithReactions);
    } catch (error) {
      console.error("댓글 조회 실패:", error);
    }
  };

  const fetchAdjacentPosts = async () => {
    try {
      // 게시글 목록을 가져와서 현재 글의 이전/다음 글 찾기
      const response = await postAPI.getPostList(0, 1000); // 충분히 많은 게시글 가져오기
      const allPosts = response.content || [];
      const currentIndex = allPosts.findIndex(p => p.id === parseInt(id));

      if (currentIndex !== -1) {
        // 이전 글 (더 최신 글, 인덱스가 작은 것)
        if (currentIndex > 0) {
          setPrevPost(allPosts[currentIndex - 1]);
        } else {
          setPrevPost(null);
        }

        // 다음 글 (더 오래된 글, 인덱스가 큰 것)
        if (currentIndex < allPosts.length - 1) {
          setNextPost(allPosts[currentIndex + 1]);
        } else {
          setNextPost(null);
        }
      }
    } catch (error) {
      console.error("이전/다음 글 조회 실패:", error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) {
      return;
    }

    try {
      await postAPI.deletePost(id);
      navigate("/posts");
    } catch (error) {
      alert("게시글 삭제에 실패했습니다.");
    }
  };

  const handleReaction = async reactionType => {
    if (!isAuthenticated) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    // 이미 같은 반응을 누른 경우 취소 처리 (선택적)
    if (userReaction === reactionType) {
      // 같은 반응을 다시 누르면 취소할 수도 있지만,
      // 백엔드에서 중복 방지하는 경우가 많으므로 그냥 무시
      return;
    }

    // 중복 클릭 방지
    if (reacting) {
      return;
    }

    setReacting(true);
    try {
      console.log("반응 요청:", { id, reactionType });
      const result = await postAPI.addReaction(id, reactionType);
      console.log("반응 성공:", result);

      // 낙관적 업데이트: 서버 응답 전에 UI 업데이트
      setUserReaction(reactionType);
      if (post) {
        const updatedPost = { ...post };
        if (reactionType === "LIKE") {
          updatedPost.likeCount = (updatedPost.likeCount || 0) + 1;
          // 이전에 싫어요를 눌렀다면 싫어요 수 감소
          if (userReaction === "DISLIKE") {
            updatedPost.disLikeCount = Math.max(
              0,
              (updatedPost.disLikeCount || 0) - 1
            );
          }
        } else if (reactionType === "DISLIKE") {
          updatedPost.disLikeCount = (updatedPost.disLikeCount || 0) + 1;
          // 이전에 좋아요를 눌렀다면 좋아요 수 감소
          if (userReaction === "LIKE") {
            updatedPost.likeCount = Math.max(
              0,
              (updatedPost.likeCount || 0) - 1
            );
          }
        }
        setPost(updatedPost);
      }

      // 서버에서 최신 데이터 가져오기
      await fetchPost();
    } catch (error) {
      console.error("반응 추가 실패:", error);
      console.error("에러 응답:", error.response);
      console.error("에러 상태:", error.response?.status);
      console.error("에러 데이터:", error.response?.data);

      // 낙관적 업데이트 롤백
      if (post) {
        const rolledBackPost = { ...post };
        if (reactionType === "LIKE") {
          rolledBackPost.likeCount = Math.max(
            0,
            (rolledBackPost.likeCount || 0) - 1
          );
          if (userReaction === "DISLIKE") {
            rolledBackPost.disLikeCount =
              (rolledBackPost.disLikeCount || 0) + 1;
          }
        } else if (reactionType === "DISLIKE") {
          rolledBackPost.disLikeCount = Math.max(
            0,
            (rolledBackPost.disLikeCount || 0) - 1
          );
          if (userReaction === "LIKE") {
            rolledBackPost.likeCount = (rolledBackPost.likeCount || 0) + 1;
          }
        }
        setPost(rolledBackPost);
        setUserReaction(userReaction); // 이전 상태로 복원
      }

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "반응 추가에 실패했습니다.";
      alert(errorMessage);
    } finally {
      setReacting(false);
    }
  };

  const handleCommentSubmit = async e => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    if (!commentContent.trim()) {
      return;
    }

    try {
      console.log("댓글 작성 요청:", { postId: id, content: commentContent });
      const result = await commentAPI.createComment(id, commentContent);
      console.log("댓글 작성 성공:", result);
      setCommentContent("");
      fetchComments();
    } catch (error) {
      console.error("댓글 작성 실패:", error);
      console.error("에러 응답:", error.response);
      console.error("에러 상태:", error.response?.status);
      console.error("에러 데이터:", error.response?.data);

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "댓글 작성에 실패했습니다.";
      alert(errorMessage);
    }
  };

  const handleCommentReaction = (commentId, reactionType) => {
    if (!isAuthenticated) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    setComments(prevComments =>
      prevComments.map(comment => {
        if (comment.commentId === commentId || comment.id === commentId) {
          const currentReaction = comment.userReaction;
          let newLikeCount = comment.likeCount || 0;
          let newDisLikeCount = comment.disLikeCount || 0;
          let newUserReaction = reactionType;

          // 이전 반응 취소
          if (currentReaction === "LIKE") {
            newLikeCount = Math.max(0, newLikeCount - 1);
          } else if (currentReaction === "DISLIKE") {
            newDisLikeCount = Math.max(0, newDisLikeCount - 1);
          }

          // 같은 반응을 다시 누르면 취소
          if (currentReaction === reactionType) {
            newUserReaction = null;
          } else {
            // 새로운 반응 추가
            if (reactionType === "LIKE") {
              newLikeCount += 1;
            } else if (reactionType === "DISLIKE") {
              newDisLikeCount += 1;
            }
          }

          return {
            ...comment,
            likeCount: newLikeCount,
            disLikeCount: newDisLikeCount,
            userReaction: newUserReaction,
          };
        }
        return comment;
      })
    );

    // TODO: 백엔드 API 연동 시 여기에 API 호출 추가
    // await commentAPI.addReaction(id, commentId, reactionType);
  };

  const formatDate = dateString => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handlePostReport = async reasonId => {
    try {
      await reportAPI.reportPost(id, reasonId);
      setShowPostReportModal(false);
    } catch (error) {
      console.error("게시글 신고 실패:", error);
      throw error;
    }
  };

  const handleCommentReport = async reasonId => {
    try {
      await reportAPI.reportComment(showCommentReportModal, reasonId);
      setShowCommentReportModal(null);
    } catch (error) {
      console.error("댓글 신고 실패:", error);
      throw error;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading">로딩 중...</div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="error-state">게시글을 찾을 수 없습니다.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="post-detail-container">
        {/* 목록으로 돌아가기 버튼 */}
        <div className="post-navigation-top">
          <Button
            variant="outline"
            onClick={() => navigate("/posts")}
            className="back-to-list-btn"
          >
            ← 목록으로
          </Button>
        </div>

        <div className="post-detail">
          <div className="post-header">
            <div className="post-meta">
              <span className="post-category">{post.category}</span>
              <span className="post-writer">
                작성자: {post.user || post.authorName || post.writer}
              </span>
            </div>
            <div className="post-header-right">
              <span className="post-date">
                {formatDate(post.date || post.createdDate || post.created_at)}
              </span>
              <div className="post-actions-group">
                {isOwner && (
                  <div className="post-actions">
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => navigate(`/posts/${id}/edit`)}
                    >
                      수정
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      onClick={handleDelete}
                    >
                      삭제
                    </Button>
                  </div>
                )}
                {isAuthenticated && !isOwner && (
                  <Button
                    variant="outline"
                    onClick={() => setShowPostReportModal(true)}
                    className="report-btn"
                  >
                    🚨 신고
                  </Button>
                )}
              </div>
            </div>
          </div>

          <h1 className="post-title">{post.title}</h1>

          <div className="post-stats">
            <span>👁 조회 {post.postView}</span>
            <span>❤️ 좋아요 {post.likeCount}</span>
            <span>💬 댓글 {comments.length}</span>
          </div>

          <div className="post-content">{post.context}</div>

          {isAuthenticated && (
            <div className="post-reactions">
              <Button
                variant={userReaction === "LIKE" ? "primary" : "outline"}
                onClick={() => handleReaction("LIKE")}
                disabled={reacting}
              >
                👍 좋아요 {reacting && userReaction === "LIKE" ? "..." : ""}
              </Button>
              <Button
                variant={userReaction === "DISLIKE" ? "primary" : "outline"}
                onClick={() => handleReaction("DISLIKE")}
                disabled={reacting}
              >
                👎 싫어요 {reacting && userReaction === "DISLIKE" ? "..." : ""}
              </Button>
            </div>
          )}

          <div className="comments-section">
            <h2 className="comments-title">댓글 ({comments.length})</h2>

            {isAuthenticated ? (
              <form onSubmit={handleCommentSubmit} className="comment-form">
                <Textarea
                  value={commentContent}
                  onChange={e => setCommentContent(e.target.value)}
                  placeholder="댓글을 입력하세요..."
                  rows={3}
                />
                <Button type="submit" variant="primary">
                  댓글 작성
                </Button>
              </form>
            ) : (
              <div className="comment-login-prompt">
                <Link to="/login">로그인</Link>하여 댓글을 작성하세요.
              </div>
            )}

            <div className="comments-list">
              {comments.length === 0 ? (
                <div className="empty-comments">댓글이 없습니다.</div>
              ) : (
                comments.map(comment => (
                  <div
                    key={comment.commentId || comment.id}
                    className="comment-item"
                  >
                    <div className="comment-header">
                      <div className="comment-author-section">
                        <span className="comment-writer">
                          {comment.authorName || comment.writer}
                        </span>
                        <span className="comment-date">
                          {formatDate(comment.createdAt || comment.createdDate)}
                        </span>
                      </div>
                      <div className="comment-reactions">
                        <Button
                          variant={
                            comment.userReaction === "LIKE"
                              ? "primary"
                              : "outline"
                          }
                          size="small"
                          onClick={() =>
                            handleCommentReaction(
                              comment.commentId || comment.id,
                              "LIKE"
                            )
                          }
                          className="comment-reaction-btn"
                        >
                          👍 {comment.likeCount || 0}
                        </Button>
                        <Button
                          variant={
                            comment.userReaction === "DISLIKE"
                              ? "primary"
                              : "outline"
                          }
                          size="small"
                          onClick={() =>
                            handleCommentReaction(
                              comment.commentId || comment.id,
                              "DISLIKE"
                            )
                          }
                          className="comment-reaction-btn"
                        >
                          👎 {comment.disLikeCount || 0}
                        </Button>
                        {isAuthenticated && (
                          <Button
                            variant="outline"
                            size="small"
                            onClick={() =>
                              setShowCommentReportModal(
                                comment.commentId || comment.id
                              )
                            }
                            className="comment-report-btn"
                          >
                            🚨
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="comment-content">{comment.content}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 이전 글 / 다음 글 네비게이션 */}
          <div className="post-navigation-bottom">
            {prevPost ? (
              <Link
                to={`/posts/${prevPost.id}`}
                className="nav-post-link prev-post"
              >
                <div className="nav-post-label">이전 글</div>
                <div className="nav-post-title">{prevPost.title}</div>
              </Link>
            ) : (
              <div className="nav-post-link prev-post disabled">
                <div className="nav-post-label">이전 글</div>
                <div className="nav-post-title">이전 글이 없습니다</div>
              </div>
            )}

            {nextPost ? (
              <Link
                to={`/posts/${nextPost.id}`}
                className="nav-post-link next-post"
              >
                <div className="nav-post-label">다음 글</div>
                <div className="nav-post-title">{nextPost.title}</div>
              </Link>
            ) : (
              <div className="nav-post-link next-post disabled">
                <div className="nav-post-label">다음 글</div>
                <div className="nav-post-title">다음 글이 없습니다</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 게시글 신고 모달 */}
      <ReportModal
        isOpen={showPostReportModal}
        onClose={() => setShowPostReportModal(false)}
        onReport={handlePostReport}
        type="게시글"
      />

      {/* 댓글 신고 모달 */}
      <ReportModal
        isOpen={!!showCommentReportModal}
        onClose={() => setShowCommentReportModal(null)}
        onReport={handleCommentReport}
        type="댓글"
      />
    </Layout>
  );
};

export default PostDetail;
