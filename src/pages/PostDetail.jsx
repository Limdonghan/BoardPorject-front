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
import ErrorNotice from "../components/ErrorNotice";
import { getUserErrorMessage } from "../utils/error";
import { logDebug, logError, logWarn } from "../utils/logger";
import "./PostDetail.css";

// 기본 이미지 URL (AWS S3)
const DEFAULT_IMAGE_URL =
  "https://board-image-s3-bucket.s3.ap-northeast-2.amazonaws.com/default_image.jpg";

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uiError, setUiError] = useState(null);
  const [commentContent, setCommentContent] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [userReaction, setUserReaction] = useState(null); // "LIKE" | "DISLIKE" | null
  const [prevPost, setPrevPost] = useState(null);
  const [nextPost, setNextPost] = useState(null);
  const [showPostReportModal, setShowPostReportModal] = useState(false);
  const [showCommentReportModal, setShowCommentReportModal] = useState(null); // commentId
  const [deletingCommentId, setDeletingCommentId] = useState(null); // 삭제 중인 댓글 ID
  const [editingCommentId, setEditingCommentId] = useState(null); // 수정 중인 댓글 ID
  const [editingCommentContent, setEditingCommentContent] = useState(""); // 수정 중인 댓글 내용
  const [updatingCommentId, setUpdatingCommentId] = useState(null); // 업데이트 중인 댓글 ID
  const [replyingToCommentId, setReplyingToCommentId] = useState(null); // 대댓글 작성 중인 댓글 ID
  const [replyContent, setReplyContent] = useState({}); // 각 댓글별 대댓글 내용 { commentId: "content" }
  const [submittingReplyId, setSubmittingReplyId] = useState(null); // 대댓글 제출 중인 댓글 ID

  const fetchPost = async () => {
    try {
      const postData = await postAPI.getPost(id);
      logDebug("PostDetail.fetchPost", "게시글 상세", postData);
      setPost(postData);
      return postData;
    } catch (error) {
      logError("PostDetail.fetchPost", error, { id });
      throw error;
    }
  };

  const fetchComments = async () => {
    try {
      const commentsData = await commentAPI.getComments(id);
      logDebug("PostDetail.fetchComments", "댓글 데이터", commentsData);

      // 댓글 데이터가 배열인지 확인
      const commentsArray = Array.isArray(commentsData)
        ? commentsData
        : commentsData?.content || commentsData?.data || [];

      // 백엔드에서 계층 구조로 반환 (children 배열 포함)
      // 댓글에 reactions 정보 추가 (백엔드에서 제공하지 않으면 기본값)
      const addReactions = comment => ({
        ...comment,
        likeCount: comment.likeCount || 0,
        disLikeCount: comment.disLikeCount || 0,
        userReaction: null,
        // children 배열이 있으면 재귀적으로 처리
        children: comment.children
          ? comment.children.map(child => addReactions(child))
          : [],
      });
      const commentsWithReactions = commentsArray.map(comment =>
        addReactions(comment)
      );
      setComments(commentsWithReactions);
      return commentsWithReactions;
    } catch (error) {
      logError("PostDetail.fetchComments", error, { id });
      // 댓글 조회 실패 시 빈 배열로 설정
      setComments([]);
      return [];
    }
  };

  const fetchAdjacentPosts = async () => {
    try {
      const response = await postAPI.getPostList(0, 1000);
      const allPosts = response.content || [];
      const currentIndex = allPosts.findIndex(p => p.id === parseInt(id));

      if (currentIndex !== -1) {
        if (currentIndex > 0) {
          setPrevPost(allPosts[currentIndex - 1]);
        } else {
          setPrevPost(null);
        }

        if (currentIndex < allPosts.length - 1) {
          setNextPost(allPosts[currentIndex + 1]);
        } else {
          setNextPost(null);
        }
      }
    } catch (error) {
      logError("PostDetail.fetchAdjacentPosts", error, { id });
    }
  };

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadData = async () => {
      try {
        setLoading(true);
        setUiError(null);

        // 게시글과 댓글을 별도로 처리하여 댓글 API 실패 시에도 게시글은 표시되도록 함
        let postData = null;
        let commentsData = [];

        // 게시글 조회
        try {
          postData = await postAPI.getPost(id);
          if (!abortController.signal.aborted && isMounted) {
            logDebug("PostDetail.loadData", "게시글 상세", postData);
            setPost(postData);
          }
        } catch (error) {
          logError("PostDetail.loadData.post", error, { id });
          if (!abortController.signal.aborted && isMounted) {
            // 게시글 조회 실패 시 에러 상태로 설정
            setPost(null);
            setUiError(getUserErrorMessage(error, "게시글을 불러오지 못했습니다."));
          }
        }

        // 댓글 조회 (실패해도 게시글은 표시)
        try {
          commentsData = await commentAPI.getComments(id);
          logDebug("PostDetail.loadData", "댓글 데이터", commentsData);

          if (!abortController.signal.aborted && isMounted) {
            // 댓글 데이터가 배열인지 확인
            const commentsArray = Array.isArray(commentsData)
              ? commentsData
              : commentsData?.content || commentsData?.data || [];

            // 댓글에 reactions 정보 추가 (백엔드에서 제공하지 않으면 기본값)
            const addReactions = comment => ({
              ...comment,
              likeCount: comment.likeCount || 0,
              disLikeCount: comment.disLikeCount || 0,
              userReaction: null,
              // children 배열이 있으면 재귀적으로 처리
              children: comment.children
                ? comment.children.map(child => addReactions(child))
                : [],
            });
            const commentsWithReactions = commentsArray.map(comment =>
              addReactions(comment)
            );
            setComments(commentsWithReactions);
          }
        } catch (error) {
          logError("PostDetail.loadData.comments", error, { id });
          // 댓글 조회 실패 시 빈 배열로 설정 (게시글은 계속 표시)
          if (!abortController.signal.aborted && isMounted) {
            setComments([]);
            // 댓글은 보조 정보라 배너만 표시하고 페이지는 유지
            setUiError(getUserErrorMessage(error, "댓글을 불러오지 못했습니다."));
          }
        }
      } catch (error) {
        logError("PostDetail.loadData.unexpected", error, { id });
        setUiError(getUserErrorMessage(error));
      } finally {
        if (!abortController.signal.aborted && isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    fetchAdjacentPosts();

    return () => {
      isMounted = false;
      abortController.abort();
    };
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

      logDebug("PostDetail.isOwner", {
        postAuthor,
        currentUser,
        isMatchStrict: postAuthor === currentUser,
        isMatchLoose: String(postAuthor) === String(currentUser),
      });

      setIsOwner(postAuthor === currentUser);
    } else {
      setIsOwner(false);
    }
  }, [user, post]);

  const handleDelete = async () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) {
      return;
    }

    try {
      await postAPI.deletePost(id);
      navigate("/posts");
    } catch (error) {
      logError("PostDetail.handleDelete", error, { id });
      setUiError(getUserErrorMessage(error, "게시글 삭제에 실패했습니다."));
    }
  };

  /**
   * 게시글 반응 핸들러 (좋아요/싫어요)
   * 좋아요를 누른 상태에서 싫어요를 누르면 좋아요를 취소하고 싫어요로 변경
   * @param {string} reactionType - "LIKE" 또는 "DISLIKE"
   */
  const handleReaction = async reactionType => {
    if (!isAuthenticated) {
      setUiError("로그인이 필요합니다.");
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
      // 이전 반응 상태 저장 (롤백용)
      const previousReaction = userReaction;

      logDebug("PostDetail.handleReaction", {
        id,
        reactionType,
        previousReaction,
        willCancelPrevious:
          previousReaction !== null && previousReaction !== reactionType,
      });

      // 낙관적 업데이트: 서버 응답 전에 UI 업데이트
      // 좋아요를 누른 상태에서 싫어요를 누르면 좋아요 취소하고 싫어요 추가
      setUserReaction(reactionType);
      if (post) {
        const updatedPost = { ...post };

        if (reactionType === "LIKE") {
          // 좋아요 추가
          updatedPost.likeCount = (updatedPost.likeCount || 0) + 1;
          // 이전에 싫어요를 눌렀다면 싫어요 수 감소 (취소)
          if (previousReaction === "DISLIKE") {
            updatedPost.disLikeCount = Math.max(
              0,
              (updatedPost.disLikeCount || 0) - 1
            );
          }
        } else if (reactionType === "DISLIKE") {
          // 싫어요 추가
          updatedPost.disLikeCount = (updatedPost.disLikeCount || 0) + 1;
          // 이전에 좋아요를 눌렀다면 좋아요 수 감소 (취소)
          if (previousReaction === "LIKE") {
            updatedPost.likeCount = Math.max(
              0,
              (updatedPost.likeCount || 0) - 1
            );
          }
        }
        setPost(updatedPost);
      }

      // 백엔드 API 호출
      const result = await postAPI.addReaction(id, reactionType);
      logDebug("PostDetail.handleReaction", "반응 성공", result);

      // 서버에서 최신 데이터 가져오기 (실제 반영된 값 확인)
      await fetchPost();
    } catch (error) {
      logError("PostDetail.handleReaction", error, { id, reactionType });

      // 낙관적 업데이트 롤백
      if (post) {
        const rolledBackPost = { ...post };
        const previousReaction = userReaction;

        if (reactionType === "LIKE") {
          // 좋아요 추가를 롤백
          rolledBackPost.likeCount = Math.max(
            0,
            (rolledBackPost.likeCount || 0) - 1
          );
          // 싫어요 취소를 롤백 (원래대로 복원)
          if (previousReaction === "DISLIKE") {
            rolledBackPost.disLikeCount =
              (rolledBackPost.disLikeCount || 0) + 1;
          }
        } else if (reactionType === "DISLIKE") {
          // 싫어요 추가를 롤백
          rolledBackPost.disLikeCount = Math.max(
            0,
            (rolledBackPost.disLikeCount || 0) - 1
          );
          // 좋아요 취소를 롤백 (원래대로 복원)
          if (previousReaction === "LIKE") {
            rolledBackPost.likeCount = (rolledBackPost.likeCount || 0) + 1;
          }
        }
        setPost(rolledBackPost);
        setUserReaction(previousReaction); // 이전 상태로 복원
      }

      setUiError(getUserErrorMessage(error, "반응 추가에 실패했습니다."));
    } finally {
      setReacting(false);
    }
  };

  const handleCommentSubmit = async e => {
    e.preventDefault();
    if (!isAuthenticated) {
      setUiError("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    if (!commentContent.trim()) {
      return;
    }

    try {
      logDebug("PostDetail.handleCommentSubmit", "댓글 작성 요청", {
        postId: id,
        contentLength: commentContent?.length,
      });
      const result = await commentAPI.createComment(id, commentContent);
      logDebug("PostDetail.handleCommentSubmit", "댓글 작성 성공", result);
      setCommentContent("");
      fetchComments();
    } catch (error) {
      logError("PostDetail.handleCommentSubmit", error, { id });
      setUiError(getUserErrorMessage(error, "댓글 작성에 실패했습니다."));
    }
  };

  const handleCommentReaction = (commentId, reactionType) => {
    if (!isAuthenticated) {
      setUiError("로그인이 필요합니다.");
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

  /**
   * 댓글 작성자와 현재 사용자 일치 여부 확인
   */
  const isCommentOwner = comment => {
    const commentAuthor =
      comment.authorName || comment.writer || comment.user || comment.username;
    const currentUser =
      user?.username || user?.nickName || user?.email || user?.user;
    if (!commentAuthor || !currentUser) return false;
    return String(commentAuthor) === String(currentUser);
  };

  /**
   * 댓글 삭제
   */
  const handleCommentDelete = async comment => {
    const commentId = comment.commentId || comment.id;
    if (!commentId) {
      setUiError("댓글 ID를 찾을 수 없습니다.");
      return;
    }
    if (!window.confirm("정말 이 댓글을 삭제하시겠습니까?")) return;

    try {
      setDeletingCommentId(commentId);
      await commentAPI.deleteComment(id, commentId);
      await fetchComments();
    } catch (error) {
      logError("PostDetail.handleCommentDelete", error, { id, commentId });
      setUiError(getUserErrorMessage(error, "댓글 삭제에 실패했습니다."));
    } finally {
      setDeletingCommentId(null);
    }
  };

  /**
   * 댓글 수정 모드 시작
   */
  const handleEditComment = comment => {
    const commentId = comment.commentId || comment.id;
    setEditingCommentId(commentId);
    setEditingCommentContent(comment.content || "");
  };

  /**
   * 댓글 수정 취소
   */
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentContent("");
  };

  /**
   * 댓글 수정 완료
   */
  const handleUpdateComment = async commentId => {
    if (!editingCommentContent.trim()) {
      setUiError("댓글 내용을 입력해주세요.");
      return;
    }

    try {
      setUpdatingCommentId(commentId);
      await commentAPI.updateComment(id, commentId, editingCommentContent);
      setEditingCommentId(null);
      setEditingCommentContent("");
      await fetchComments();
    } catch (error) {
      logError("PostDetail.handleUpdateComment", error, { id, commentId });
      setUiError(getUserErrorMessage(error, "댓글 수정에 실패했습니다."));
    } finally {
      setUpdatingCommentId(null);
    }
  };

  /**
   * 대댓글 작성 모드 시작/취소
   */
  const handleReplyToggle = commentId => {
    if (replyingToCommentId === commentId) {
      // 답글 작성 취소
      setReplyingToCommentId(null);
      setReplyContent(prev => {
        const newContent = { ...prev };
        delete newContent[commentId];
        return newContent;
      });
    } else {
      // 답글 작성 시작
      setReplyingToCommentId(commentId);
      setReplyContent(prev => ({
        ...prev,
        [commentId]: "",
      }));
    }
  };

  /**
   * 대댓글 작성 완료
   */
  const handleReplySubmit = async (e, parentCommentId) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setUiError("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    const content = replyContent[parentCommentId] || "";
    if (!content.trim()) {
      return;
    }

    try {
      setSubmittingReplyId(parentCommentId);
      logDebug("PostDetail.handleReplySubmit", "대댓글 작성 요청", {
        postId: id,
        parentId: parentCommentId,
        contentLength: content?.length,
      });
      await commentAPI.createComment(id, content, parentCommentId);
      logDebug("PostDetail.handleReplySubmit", "대댓글 작성 성공");
      setReplyingToCommentId(null);
      setReplyContent(prev => {
        const newContent = { ...prev };
        delete newContent[parentCommentId];
        return newContent;
      });
      await fetchComments();
    } catch (error) {
      logError("PostDetail.handleReplySubmit", error, { id, parentId: parentCommentId });
      setUiError(getUserErrorMessage(error, "대댓글 작성에 실패했습니다."));
    } finally {
      setSubmittingReplyId(null);
    }
  };

  /**
   * 전체 댓글 수 계산 (대댓글 포함)
   */
  const getTotalCommentCount = comments => {
    let count = 0;
    const countRecursive = commentList => {
      commentList.forEach(comment => {
        count++;
        if (comment.children && comment.children.length > 0) {
          countRecursive(comment.children);
        }
      });
    };
    countRecursive(comments);
    return count;
  };

  const formatDate = dateString => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  /**
   * 댓글 렌더링 함수 (depth 필드를 사용하여 대댓글도 렌더링)
   */
  const renderComment = (comment, depth = null) => {
    const commentId = comment.commentId || comment.id;
    const isEditing = editingCommentId === commentId;
    const isReplying = replyingToCommentId === commentId;

    // depth 필드를 우선 사용, 없으면 파라미터로 전달된 depth 사용
    const commentDepth =
      comment.depth !== undefined ? comment.depth : depth !== null ? depth : 0;
    const isReply = commentDepth > 0;

    return (
      <div
        key={commentId}
        className={`comment-item ${isReply ? "comment-reply" : ""}`}
        style={{ marginLeft: isReply ? `${commentDepth * 2}rem` : "0" }}
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
              variant={comment.userReaction === "LIKE" ? "primary" : "outline"}
              size="small"
              onClick={() => handleCommentReaction(commentId, "LIKE")}
              className="comment-reaction-btn"
            >
              👍 {comment.likeCount || 0}
            </Button>
            <Button
              variant={
                comment.userReaction === "DISLIKE" ? "primary" : "outline"
              }
              size="small"
              onClick={() => handleCommentReaction(commentId, "DISLIKE")}
              className="comment-reaction-btn"
            >
              👎 {comment.disLikeCount || 0}
            </Button>
            {isCommentOwner(comment) && (
              <>
                {isEditing ? (
                  <>
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => handleUpdateComment(commentId)}
                      disabled={updatingCommentId === commentId}
                      className="comment-update-btn"
                    >
                      {updatingCommentId === commentId ? "수정 중..." : "완료"}
                    </Button>
                    <Button
                      variant="outline"
                      size="small"
                      onClick={handleCancelEdit}
                      disabled={updatingCommentId === commentId}
                      className="comment-cancel-btn"
                    >
                      취소
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => handleEditComment(comment)}
                      disabled={deletingCommentId === commentId}
                      className="comment-edit-btn"
                    >
                      수정
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => handleCommentDelete(comment)}
                      disabled={deletingCommentId === commentId}
                      className="comment-delete-btn"
                    >
                      삭제
                    </Button>
                  </>
                )}
              </>
            )}
            {isAuthenticated && (
              <>
                {/* depth가 4 미만일 때만 답글 버튼 표시 (최대 4단계까지) */}
                {commentDepth < 4 && (
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => handleReplyToggle(commentId)}
                    className="comment-reply-btn"
                  >
                    {isReplying ? "답글 취소" : "답글"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => setShowCommentReportModal(commentId)}
                  className="comment-report-btn"
                >
                  🚨
                </Button>
              </>
            )}
          </div>
        </div>
        {isEditing ? (
          <div className="comment-edit-form">
            <Textarea
              value={editingCommentContent}
              onChange={e => setEditingCommentContent(e.target.value)}
              placeholder="댓글을 입력하세요..."
              rows={3}
              className="comment-edit-textarea"
            />
          </div>
        ) : (
          <div className="comment-content">{comment.content}</div>
        )}

        {/* 대댓글 작성 폼 (depth가 4 미만일 때만 표시) */}
        {isReplying && commentDepth < 4 && (
          <form
            onSubmit={e => handleReplySubmit(e, commentId)}
            className="reply-form"
          >
            <Textarea
              value={replyContent[commentId] || ""}
              onChange={e =>
                setReplyContent(prev => ({
                  ...prev,
                  [commentId]: e.target.value,
                }))
              }
              placeholder="대댓글을 입력하세요..."
              rows={2}
              className="reply-textarea"
            />
            <div className="reply-form-actions">
              <Button
                type="submit"
                variant="primary"
                size="small"
                disabled={submittingReplyId === commentId}
              >
                {submittingReplyId === commentId ? "작성 중..." : "작성"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="small"
                onClick={() => handleReplyToggle(commentId)}
                disabled={submittingReplyId === commentId}
              >
                취소
              </Button>
            </div>
          </form>
        )}

        {/* 대댓글 목록 (children 배열이 있으면 재귀적으로 렌더링) */}
        {comment.children && comment.children.length > 0 && (
          <div className="comment-children">
            {comment.children.map(child =>
              renderComment(
                child,
                child.depth !== undefined ? child.depth : commentDepth + 1
              )
            )}
          </div>
        )}
      </div>
    );
  };

  const handlePostReport = async reasonId => {
    try {
      await reportAPI.reportPost(id, reasonId);
      setShowPostReportModal(false);
    } catch (error) {
      logError("PostDetail.handlePostReport", error, { id, reasonId });
      setUiError(getUserErrorMessage(error, "게시글 신고에 실패했습니다."));
      throw error;
    }
  };

  const handleCommentReport = async reasonId => {
    try {
      await reportAPI.reportComment(showCommentReportModal, reasonId);
      setShowCommentReportModal(null);
    } catch (error) {
      logError("PostDetail.handleCommentReport", error, {
        commentId: showCommentReportModal,
        reasonId,
      });
      setUiError(getUserErrorMessage(error, "댓글 신고에 실패했습니다."));
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
            onClick={() => navigate("/posts", { replace: false })}
            className="back-to-list-btn"
          >
            ← 목록으로
          </Button>
        </div>

        <ErrorNotice message={uiError} onClose={() => setUiError(null)} />

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

          {/* 게시글 이미지 */}
          {post.imageUrl && post.imageUrl.length > 0 && (
            <div className="post-images">
              {post.imageUrl.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`게시글 이미지 ${index + 1}`}
                  className="post-image"
                  onError={e => {
                    e.target.style.display = "none";
                  }}
                />
              ))}
            </div>
          )}

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
            <h2 className="comments-title">
              댓글 ({getTotalCommentCount(comments)})
            </h2>

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
                (() => {
                  // depth 필드를 사용하여 댓글을 그룹화
                  // children 배열이 있으면 그대로 사용, 없으면 depth와 parentCommentId로 그룹화
                  const buildCommentTree = commentList => {
                    // children 배열이 이미 있는 경우 (계층 구조로 반환)
                    if (
                      commentList.length > 0 &&
                      commentList[0].children !== undefined
                    ) {
                      return commentList;
                    }

                    // 평면 배열인 경우 depth와 parentCommentId로 그룹화
                    const rootComments = commentList.filter(
                      c => (c.depth || 0) === 0
                    );
                    const childComments = commentList.filter(
                      c => (c.depth || 0) > 0
                    );

                    // 각 댓글에 children 추가
                    const addChildren = comment => {
                      const parentId = comment.commentId || comment.id;
                      const children = childComments.filter(
                        child =>
                          (child.parentCommentId || child.parentId) === parentId
                      );
                      return {
                        ...comment,
                        children: children.map(child => addChildren(child)),
                      };
                    };

                    return rootComments.map(comment => addChildren(comment));
                  };

                  const commentTree = buildCommentTree(comments);
                  return commentTree.map(comment => renderComment(comment));
                })()
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
