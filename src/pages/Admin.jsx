import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../api/admin";
import { postAPI } from "../api/post";
import { commentAPI } from "../api/comment";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Button from "../components/Button";
import ErrorNotice from "../components/ErrorNotice";
import { getUserErrorMessage } from "../utils/error";
import { logDebug, logError, logWarn } from "../utils/logger";
import "./Admin.css";

// 기본 이미지 URL (AWS S3)
const DEFAULT_IMAGE_URL =
  "https://board-image-s3-bucket.s3.ap-northeast-2.amazonaws.com/default_image.jpg";

const Admin = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [allReports, setAllReports] = useState([]); // 전체 신고 목록 (통계용)
  const [filteredAllReports, setFilteredAllReports] = useState([]); // 필터링된 전체 목록 (페이지네이션용)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, 대기, 처리중, 완료
  const [typeFilter, setTypeFilter] = useState("ALL"); // ALL, 게시글, 댓글
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false); // 삭제 중 상태
  const [postDeletedStatus, setPostDeletedStatus] = useState(null); // 게시글 삭제 여부 (null: 확인 중, true: 삭제됨, false: 존재함)
  const [commentDeletedStatus, setCommentDeletedStatus] = useState(null); // 댓글 삭제 여부
  const [syncing, setSyncing] = useState(false); // Typesense 동기화 중 상태
  const pageSize = 10;

  // 상태 문자열을 statusId로 매핑 (백엔드 기준)
  const getStatusId = status => {
    const statusMap = {
      "접수 대기": 1,
      "처리 중": 2,
      "처리 완료": 3,
      대기: 1, // UI 필터용 (하위 호환)
      처리중: 2, // UI 필터용 (하위 호환)
      완료: 3, // UI 필터용 (하위 호환)
    };
    return statusMap[status] || null;
  };

  // UI 상태 이름을 백엔드 상태 코드로 변환
  const getStatusCode = status => {
    const codeMap = {
      대기: "PENDING",
      처리중: "PROCESSING",
      완료: "RESOLVED",
      반려: "REJECTED",
      "접수 대기": "PENDING",
      "처리 중": "PROCESSING",
      "처리 완료": "RESOLVED",
    };
    return codeMap[status] || status;
  };

  useEffect(() => {
    // 관리자 권한 체크
    if (
      !isAuthenticated ||
      !user ||
      (user.role !== "ADMIN" && user.role !== "ROLE_ADMIN")
    ) {
      navigate("/posts");
      return;
    }

    fetchReports();
  }, [currentPage, statusFilter, typeFilter, isAuthenticated, user, navigate]);

  // 통계용 전체 데이터 조회 함수
  const fetchAllReportsForStats = async () => {
    try {
      // 전체 데이터를 여러 페이지에 걸쳐 가져오기
      let allData = [];
      let page = 0;
      let totalPages = 1;

      try {
        // 첫 페이지로 전체 페이지 수 확인
        const firstResponse = await adminAPI.getReportList(0, 100);
        totalPages = firstResponse.totalPages || 1;
        allData = [...(firstResponse.content || [])];

        // 나머지 페이지들 가져오기
        for (page = 1; page < totalPages && page < 100; page++) {
          // 최대 100페이지 (안전장치)
          try {
            const response = await adminAPI.getReportList(page, 100);
            const content = response.content || [];
            allData = [...allData, ...content];
          } catch (pageError) {
            logWarn(
              "Admin.fetchAllReportsForStats",
              `페이지 ${page} 조회 실패 (무시)`
            );
            logError("Admin.fetchAllReportsForStats", pageError);
            // 개별 페이지 실패는 무시하고 계속 진행
            break;
          }
        }
      } catch (firstPageError) {
        logWarn("Admin.fetchAllReportsForStats", "첫 페이지 조회 실패");
        logError("Admin.fetchAllReportsForStats", firstPageError);
        // 첫 페이지 실패 시 빈 배열 반환
        allData = [];
      }

      logDebug(
        "Admin.fetchAllReportsForStats",
        "통계용 데이터 로드 완료",
        allData.length
      );

      setAllReports(allData);
    } catch (error) {
      logError("Admin.fetchAllReportsForStats", error);
      // 실패해도 계속 진행
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // 통계용 전체 데이터는 별도로 조회 (실패해도 메인 목록은 표시)
      let statsPromise = Promise.resolve();
      try {
        statsPromise = fetchAllReportsForStats();
      } catch (statsError) {
        logError("Admin.fetchReports.stats", statsError);
        // 통계 데이터 실패는 무시하고 계속 진행
      }

      // 필터에 따라 적절한 API 호출
      let response;
      // UI 필터 값("대기", "처리중", "완료")을 백엔드 statusId로 변환
      const statusId =
        statusFilter !== "ALL" ? getStatusId(statusFilter) : null;

      // 게시글/댓글 필터만 있고 상태 필터가 없는 경우
      // - 기존에는 size=10000으로 한 번에 가져와 500을 유발할 수 있어(백엔드/DB 페이징 제한),
      //   안전하게 여러 페이지로 나눠 가져온 뒤 클라이언트 사이드 필터링합니다.
      const needsClientSideFiltering =
        (typeFilter === "게시글" || typeFilter === "댓글") && statusId === null;

      if (needsClientSideFiltering) {
        try {
          // 전체 데이터를 페이지 단위로 가져와서 필터링
          const fetchAllReportsPaged = async () => {
            const pageChunkSize = 100; // 백엔드 부담을 줄이기 위한 안전한 크기
            const first = await adminAPI.getReportList(0, pageChunkSize);
            const total = first.totalPages || 1;
            let all = [...(first.content || [])];

            // 최대 100페이지 안전장치 (= 최대 10,000건)
            for (let p = 1; p < total && p < 100; p++) {
              const r = await adminAPI.getReportList(p, pageChunkSize);
              all = [...all, ...(r.content || [])];
            }
            return all;
          };

          const allData = await fetchAllReportsPaged();

          // 필터링 적용
          let filtered = allData;
          if (typeFilter === "게시글") {
            filtered = allData.filter(
              report => report.title !== null && report.title !== undefined
            );
          } else if (typeFilter === "댓글") {
            filtered = allData.filter(
              report => report.comment !== null && report.comment !== undefined
            );
          }

          setFilteredAllReports(filtered);

          // 페이지네이션 처리
          const total = filtered.length;
          const startIndex = currentPage * pageSize;
          const endIndex = startIndex + pageSize;
          const paginatedReports = filtered.slice(startIndex, endIndex);

          setReports(paginatedReports);
          setTotalPages(Math.ceil(total / pageSize));
          setTotalElements(total);
        } catch (filterError) {
          logError("Admin.fetchReports.filtering", filterError, {
            typeFilter,
            statusId,
          });
          // 필터링 실패 시 빈 배열로 설정
          setReports([]);
          setTotalPages(0);
          setTotalElements(0);
          setError(
            getUserErrorMessage(
              filterError,
              "신고 목록을 불러오는데 실패했습니다."
            )
          );
        }
      } else {
        try {
          // 백엔드 API를 사용하는 경우
          if (typeFilter === "게시글") {
            // 게시글 + 상태 필터
            response = await adminAPI.getPostReportList(
              currentPage,
              pageSize,
              statusId
            );
          } else if (typeFilter === "댓글") {
            // 댓글 + 상태 필터
            response = await adminAPI.getCommentReportList(
              currentPage,
              pageSize,
              statusId
            );
          } else {
            // 전체 (유형 필터 없음)
            if (statusId !== null) {
              // 상태 필터만 있는 경우 - 백엔드 API 사용
              response = await adminAPI.getReportListByStatus(
                currentPage,
                pageSize,
                statusId
              );
            } else {
              // 필터 없음
              response = await adminAPI.getReportList(currentPage, pageSize);
            }
          }

          setReports(response.content || []);
          setTotalPages(response.totalPages || 0);
          setTotalElements(response.totalElements || 0);
        } catch (apiError) {
          logError("Admin.fetchReports.api", apiError, {
            typeFilter,
            statusId,
          });
          // API 호출 실패 시 빈 배열로 설정
          setReports([]);
          setTotalPages(0);
          setTotalElements(0);
          setError(
            getUserErrorMessage(
              apiError,
              "신고 목록을 불러오는데 실패했습니다."
            )
          );
        }
      }

      // 통계용 데이터 조회 완료 대기 (실패해도 무시)
      try {
        await statsPromise;
      } catch (statsError) {
        logError("Admin.fetchReports.stats.await", statsError);
      }
    } catch (error) {
      logError("Admin.fetchReports.unexpected", error);
      setError(
        getUserErrorMessage(error, "신고 목록을 불러오는데 실패했습니다.")
      );
      // 최소한 빈 상태로 설정
      setReports([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 신고 상세 정보 조회 및 게시글/댓글 삭제 여부 확인
   * @param {number} reportId - 신고 ID
   */
  const handleReportClick = async reportId => {
    try {
      const detail = await adminAPI.getReportDetail(reportId);
      logDebug("Admin.handleReportClick", "신고 상세 정보", detail);
      setSelectedReport(detail);

      /**
       * 백엔드(`ReportDetailDTO`) 기준 삭제 여부 판별
       * - `detail.postInfo.isDeleted`가 항상 내려옴
       * - 게시글 신고면: `postInfo.isDeleted` = 게시글 삭제 여부
       * - 댓글 신고면: `postInfo.isDeleted` = 댓글 삭제 여부 (현재 백엔드 구현)
       * - 프론트에서 postId/commentId를 알 수 없으므로 추가 조회로 판별하지 않음
       */
      const isCommentReport = !!detail.comment; // 댓글 신고면 comment 문자열이 존재(빈문자열이면 게시글 신고로 간주)
      const deletedFlag =
        detail?.postInfo?.isDeleted !== undefined
          ? detail.postInfo.isDeleted
          : detail?.postInfo?.deleted !== undefined
          ? detail.postInfo.deleted
          : null;

      if (isCommentReport) {
        setPostDeletedStatus(null);
        setCommentDeletedStatus(deletedFlag);
      } else {
        setPostDeletedStatus(deletedFlag);
        setCommentDeletedStatus(null);
      }
    } catch (error) {
      logError("Admin.handleReportClick", error, { reportId });
      setError(
        getUserErrorMessage(error, "신고 상세 정보를 불러오는데 실패했습니다.")
      );
    }
  };

  const handleStatusChange = async (reportId, newStatus) => {
    if (!window.confirm(`신고 상태를 "${newStatus}"로 변경하시겠습니까?`)) {
      return;
    }

    try {
      setUpdatingStatus(true);
      // UI 상태 이름을 백엔드 상태 코드로 변환
      const statusCode = getStatusCode(newStatus);
      await adminAPI.updateReportStatus(reportId, statusCode);
      alert("신고 상태가 변경되었습니다.");
      setSelectedReport(null);
      fetchReports();
    } catch (error) {
      logError("Admin.handleStatusChange", error, { reportId, newStatus });
      setError(getUserErrorMessage(error, "신고 상태 변경에 실패했습니다."));
    } finally {
      setUpdatingStatus(false);
    }
  };

  /**
   * 게시글 삭제 핸들러
   * 신고된 게시글을 삭제하고 신고 상태를 완료로 변경
   */
  const handleDeletePost = async () => {
    // 백엔드 관리자 삭제 컨트롤러는 reportId를 받는다.
    const reportId = selectedReport?.reportId;
    if (!reportId) {
      logWarn(
        "Admin.handleDeletePost",
        "신고 ID(reportId)를 찾을 수 없습니다."
      );
      setError("신고 ID를 찾을 수 없습니다.");
      return;
    }

    const confirmMessage = `정말 이 게시글을 삭제하시겠습니까?\n\n삭제된 게시글은 복구할 수 없습니다.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setDeleting(true);

      // 관리자 삭제 전용 API 사용 (reportId 기반)
      await adminAPI.adminDelete(reportId);

      // 신고 상태를 완료로 변경
      const statusCode = getStatusCode("완료");
      await adminAPI.updateReportStatus(selectedReport.reportId, statusCode);

      alert("게시글이 삭제되었고 신고 상태가 완료로 변경되었습니다.");
      setPostDeletedStatus(true); // 삭제됨 상태로 업데이트
      setSelectedReport(null);
      setPostDeletedStatus(null); // 상태 초기화
      fetchReports(); // 목록 새로고침
    } catch (error) {
      logError("Admin.handleDeletePost", error, { reportId });
      setError(getUserErrorMessage(error, "게시글 삭제에 실패했습니다."));
    } finally {
      setDeleting(false);
    }
  };

  /**
   * 댓글 삭제 핸들러
   * 신고된 댓글을 삭제하고 신고 상태를 완료로 변경
   */
  const handleDeleteComment = async () => {
    // 백엔드 관리자 삭제 컨트롤러는 reportId를 받는다.
    const reportId = selectedReport?.reportId;
    if (!reportId) {
      logWarn(
        "Admin.handleDeleteComment",
        "신고 ID(reportId)를 찾을 수 없습니다."
      );
      setError("신고 ID를 찾을 수 없습니다.");
      return;
    }

    const confirmMessage = `정말 이 댓글을 삭제하시겠습니까?\n\n삭제된 댓글은 복구할 수 없습니다.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setDeleting(true);

      // 관리자 삭제 전용 API 사용 (reportId 기반)
      await adminAPI.adminDelete(reportId);

      // 신고 상태를 완료로 변경
      const statusCode = getStatusCode("완료");
      await adminAPI.updateReportStatus(selectedReport.reportId, statusCode);

      alert("댓글이 삭제되었고 신고 상태가 완료로 변경되었습니다.");
      setCommentDeletedStatus(true); // 삭제됨 상태로 업데이트
      setSelectedReport(null);
      setCommentDeletedStatus(null); // 상태 초기화
      fetchReports(); // 목록 새로고침
    } catch (error) {
      logError("Admin.handleDeleteComment", error, { reportId });
      setError(getUserErrorMessage(error, "댓글 삭제에 실패했습니다."));
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = dateString => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  /**
   * Typesense 데이터 동기화 핸들러
   */
  const handleSyncTypesense = async () => {
    if (
      !window.confirm(
        "Typesense 데이터를 동기화하시겠습니까?\n\n이 작업은 시간이 걸릴 수 있습니다."
      )
    ) {
      return;
    }

    try {
      setSyncing(true);
      setError(null);
      const result = await adminAPI.syncTypesense();
      alert(result || "동기화가 완료되었습니다.");
      logDebug("Admin.handleSyncTypesense", "동기화 완료", result);
    } catch (error) {
      logError("Admin.handleSyncTypesense", error);
      setError(getUserErrorMessage(error, "Typesense 동기화에 실패했습니다."));
    } finally {
      setSyncing(false);
    }
  };

  const getStatusColor = status => {
    switch (status) {
      case "접수 대기":
      case "대기": // 하위 호환
        return "#f59e0b";
      case "처리 중":
      case "처리중": // 하위 호환
        return "#3b82f6";
      case "처리 완료":
      case "완료": // 하위 호환
        return "#10b981";
      case "반려":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusBadge = status => {
    const color = getStatusColor(status);
    return (
      <span
        className="status-badge"
        style={{
          backgroundColor: `${color}20`,
          color: color,
          border: `1px solid ${color}`,
        }}
      >
        {status}
      </span>
    );
  };

  if (
    !isAuthenticated ||
    !user ||
    (user.role !== "ADMIN" && user.role !== "ROLE_ADMIN")
  ) {
    return null;
  }

  return (
    <Layout>
      <div className="admin-container">
        <div className="admin-header">
          <div className="admin-header-content">
            <div>
              <h1 className="admin-title">관리자 페이지</h1>
              <p className="admin-subtitle">신고된 게시글 및 댓글 관리</p>
            </div>
            <Button
              variant="primary"
              onClick={handleSyncTypesense}
              disabled={syncing}
              style={{
                minWidth: "150px",
              }}
            >
              {syncing ? "동기화 중..." : "Typesense 동기화"}
            </Button>
          </div>
        </div>

        <ErrorNotice message={error} onClose={() => setError(null)} />

        {loading ? (
          <div className="admin-loading">로딩 중...</div>
        ) : (
          <>
            {/* 필터 및 통계 */}
            <div className="admin-stats">
              <div className="stat-card">
                <div className="stat-label">전체 신고</div>
                <div className="stat-value">
                  {loading && allReports.length === 0
                    ? "..."
                    : allReports.length}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">대기 중</div>
                <div className="stat-value">
                  {loading && allReports.length === 0
                    ? "..."
                    : allReports.filter(r => r.reportStatus === "접수 대기")
                        .length}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">처리 중</div>
                <div className="stat-value">
                  {loading && allReports.length === 0
                    ? "..."
                    : allReports.filter(r => r.reportStatus === "처리 중")
                        .length}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">완료</div>
                <div className="stat-value">
                  {loading && allReports.length === 0
                    ? "..."
                    : allReports.filter(r => r.reportStatus === "처리 완료")
                        .length}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">반려</div>
                <div className="stat-value">
                  {loading && allReports.length === 0
                    ? "..."
                    : allReports.filter(r => r.reportStatus === "반려").length}
                </div>
              </div>
            </div>

            {/* 필터 버튼 */}
            <div className="admin-filters">
              <div className="filter-group">
                <span className="filter-label">유형:</span>
                <button
                  className={`filter-btn ${
                    typeFilter === "ALL" ? "active" : ""
                  }`}
                  onClick={() => {
                    setTypeFilter("ALL");
                    setCurrentPage(0);
                  }}
                >
                  전체
                </button>
                <button
                  className={`filter-btn ${
                    typeFilter === "게시글" ? "active" : ""
                  }`}
                  onClick={() => {
                    setTypeFilter("게시글");
                    setCurrentPage(0);
                  }}
                >
                  게시글
                </button>
                <button
                  className={`filter-btn ${
                    typeFilter === "댓글" ? "active" : ""
                  }`}
                  onClick={() => {
                    setTypeFilter("댓글");
                    setCurrentPage(0);
                  }}
                >
                  댓글
                </button>
              </div>
              <div className="filter-group">
                <span className="filter-label">상태:</span>
                <button
                  className={`filter-btn ${
                    statusFilter === "ALL" ? "active" : ""
                  }`}
                  onClick={() => {
                    setStatusFilter("ALL");
                    setCurrentPage(0);
                  }}
                >
                  전체
                </button>
                <button
                  className={`filter-btn ${
                    statusFilter === "대기" ? "active" : ""
                  }`}
                  onClick={() => {
                    setStatusFilter("대기");
                    setCurrentPage(0);
                  }}
                >
                  대기
                </button>
                <button
                  className={`filter-btn ${
                    statusFilter === "처리중" ? "active" : ""
                  }`}
                  onClick={() => {
                    setStatusFilter("처리중");
                    setCurrentPage(0);
                  }}
                >
                  처리중
                </button>
                <button
                  className={`filter-btn ${
                    statusFilter === "완료" ? "active" : ""
                  }`}
                  onClick={() => {
                    setStatusFilter("완료");
                    setCurrentPage(0);
                  }}
                >
                  완료
                </button>
              </div>
            </div>

            {/* 신고 목록 */}
            <div className="admin-reports-list">
              <h2 className="section-title">신고 목록</h2>
              {reports.length === 0 ? (
                <div className="empty-reports">신고된 내용이 없습니다.</div>
              ) : (
                <div className="reports-table">
                  <div className="table-header">
                    <div className="table-cell">ID</div>
                    <div className="table-cell">유형</div>
                    <div className="table-cell">제목/댓글</div>
                    <div className="table-cell">신고자</div>
                    <div className="table-cell">피신고자</div>
                    <div className="table-cell">상태</div>
                    <div className="table-cell">신고일시</div>
                    <div className="table-cell">작업</div>
                  </div>
                  {reports.map(report => (
                    <div key={report.id} className="table-row">
                      <div className="table-cell">{report.id}</div>
                      <div className="table-cell">
                        {report.title ? "게시글" : "댓글"}
                      </div>
                      <div className="table-cell">
                        <div className="content-preview">
                          {report.title || report.comment || "-"}
                        </div>
                        {report.category && (
                          <span className="category-tag">
                            {report.category}
                          </span>
                        )}
                      </div>
                      <div className="table-cell">{report.reporter}</div>
                      <div className="table-cell">{report.reported}</div>
                      <div className="table-cell">
                        {getStatusBadge(report.reportStatus)}
                      </div>
                      <div className="table-cell">
                        {formatDate(report.createdDate)}
                      </div>
                      <div className="table-cell">
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => handleReportClick(report.id)}
                        >
                          상세보기
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="pagination">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentPage(prev => Math.max(0, prev - 1))
                    }
                    disabled={currentPage === 0}
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
                          (pageNum >= currentPage - 2 &&
                            pageNum <= currentPage + 2)
                        ) {
                          return (
                            <button
                              key={pageNum}
                              className={`page-number ${
                                pageNum === currentPage ? "active" : ""
                              }`}
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum + 1}
                            </button>
                          );
                        } else if (
                          pageNum === currentPage - 3 ||
                          pageNum === currentPage + 3
                        ) {
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
                    onClick={() =>
                      setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))
                    }
                    disabled={currentPage >= totalPages - 1}
                  >
                    &gt;
                  </Button>
                </div>
              )}
            </div>

            {/* 신고 상세 모달 */}
            {selectedReport && (
              <div
                className="report-detail-modal-overlay"
                onClick={() => {
                  setSelectedReport(null);
                  setPostDeletedStatus(null); // 삭제 여부 상태 초기화
                  setCommentDeletedStatus(null); // 삭제 여부 상태 초기화
                }}
              >
                <div
                  className="report-detail-modal"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="modal-header">
                    <h2>신고 상세 정보</h2>
                    <button
                      className="modal-close"
                      onClick={() => {
                        setSelectedReport(null);
                        setPostDeletedStatus(null); // 삭제 여부 상태 초기화
                        setCommentDeletedStatus(null); // 삭제 여부 상태 초기화
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <div className="modal-content">
                    {/* 신고 요약 정보 */}
                    <div className="detail-section">
                      <h3 className="section-label">신고 요약</h3>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="detail-label">신고 ID:</span>
                          <span className="detail-value">
                            {selectedReport.reportId}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">신고 상태:</span>
                          <span className="detail-value">
                            {getStatusBadge(selectedReport.summary?.status)}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">총 신고 수:</span>
                          <span className="detail-value">
                            {selectedReport.summary?.totalReporterCount || 0}건
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">신고자:</span>
                          <span className="detail-value">
                            {selectedReport.summary?.reporters?.join(", ") ||
                              "-"}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">신고 사유:</span>
                          <span className="detail-value">
                            {selectedReport.summary?.reasons?.join(", ") || "-"}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">피신고자:</span>
                          <span className="detail-value">
                            {selectedReport.reported}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 게시글 정보 */}
                    {selectedReport.postInfo && (
                      <div className="detail-section">
                        <h3 className="section-label">
                          게시글 정보
                          {/* 게시글 삭제 여부 표시 (확인중 배지 제거: 값이 확정된 경우에만 표시) */}
                          {postDeletedStatus === true && (
                            <span
                              className="deleted-badge"
                              style={{
                                marginLeft: "var(--spacing-md)",
                                padding: "4px 12px",
                                backgroundColor: "#ef4444",
                                color: "white",
                                borderRadius: "12px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                              }}
                            >
                              삭제됨
                            </span>
                          )}
                          {postDeletedStatus === false && (
                            <span
                              className="active-badge"
                              style={{
                                marginLeft: "var(--spacing-md)",
                                padding: "4px 12px",
                                backgroundColor: "#10b981",
                                color: "white",
                                borderRadius: "12px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                              }}
                            >
                              존재함
                            </span>
                          )}
                        </h3>
                        <div className="post-detail-card">
                          <div className="post-detail-item">
                            <span className="detail-label">작성자:</span>
                            <span className="detail-value">
                              {selectedReport.postInfo.user}
                            </span>
                          </div>
                          <div className="post-detail-item">
                            <span className="detail-label">카테고리:</span>
                            <span className="detail-value">
                              {selectedReport.postInfo.category}
                            </span>
                          </div>
                          <div className="post-detail-item">
                            <span className="detail-label">제목:</span>
                            <span className="detail-value">
                              {selectedReport.postInfo.title}
                            </span>
                          </div>
                          <div className="post-detail-item full-width">
                            <span className="detail-label">내용:</span>
                            <div className="post-content">
                              {selectedReport.postInfo.context}
                            </div>
                          </div>
                          {selectedReport.postInfo.imageUrl &&
                            selectedReport.postInfo.imageUrl.length > 0 && (
                              <div className="post-detail-item full-width">
                                <span className="detail-label">이미지:</span>
                                <div className="report-images">
                                  {selectedReport.postInfo.imageUrl.map(
                                    (url, index) => (
                                      <img
                                        key={index}
                                        src={url}
                                        alt={`신고 게시글 이미지 ${index + 1}`}
                                        className="report-image"
                                        onError={e => {
                                          e.target.style.display = "none";
                                        }}
                                      />
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          <div className="post-detail-item">
                            <span className="detail-label">조회수:</span>
                            <span className="detail-value">
                              {selectedReport.postInfo.postView}
                            </span>
                          </div>
                          <div className="post-detail-item">
                            <span className="detail-label">좋아요:</span>
                            <span className="detail-value">
                              {selectedReport.postInfo.likeCount}
                            </span>
                          </div>
                          <div className="post-detail-item">
                            <span className="detail-label">싫어요:</span>
                            <span className="detail-value">
                              {selectedReport.postInfo.disLikeCount}
                            </span>
                          </div>
                          <div className="post-detail-item">
                            <span className="detail-label">작성일시:</span>
                            <span className="detail-value">
                              {formatDate(selectedReport.postInfo.date)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 댓글 정보 */}
                    {selectedReport.comment && (
                      <div className="detail-section">
                        <h3 className="section-label">
                          댓글 정보
                          {/* 댓글 삭제 여부 표시 (확인중 배지 제거: 값이 확정된 경우에만 표시) */}
                          {commentDeletedStatus === true && (
                            <span
                              className="deleted-badge"
                              style={{
                                marginLeft: "var(--spacing-md)",
                                padding: "4px 12px",
                                backgroundColor: "#ef4444",
                                color: "white",
                                borderRadius: "12px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                              }}
                            >
                              삭제됨
                            </span>
                          )}
                          {commentDeletedStatus === false && (
                            <span
                              className="active-badge"
                              style={{
                                marginLeft: "var(--spacing-md)",
                                padding: "4px 12px",
                                backgroundColor: "#10b981",
                                color: "white",
                                borderRadius: "12px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                              }}
                            >
                              존재함
                            </span>
                          )}
                        </h3>
                        <div className="comment-detail-card">
                          <div className="comment-content">
                            {selectedReport.comment}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 삭제 및 상태 변경 */}
                    <div className="detail-section">
                      <h3 className="section-label">삭제 및 상태 변경</h3>

                      {/* 삭제 버튼 */}
                      <div
                        className="delete-actions"
                        style={{ marginBottom: "var(--spacing-lg)" }}
                      >
                        {selectedReport.postInfo && (
                          <Button
                            variant="outline"
                            onClick={handleDeletePost}
                            disabled={deleting || updatingStatus}
                            style={{
                              flex: 1,
                              borderColor: "#ef4444",
                              color: "#ef4444",
                            }}
                          >
                            {deleting ? "삭제 중..." : "게시글 삭제"}
                          </Button>
                        )}
                        {selectedReport.comment && (
                          <Button
                            variant="outline"
                            onClick={handleDeleteComment}
                            disabled={deleting || updatingStatus}
                            style={{
                              flex: 1,
                              borderColor: "#ef4444",
                              color: "#ef4444",
                            }}
                          >
                            {deleting ? "삭제 중..." : "댓글 삭제"}
                          </Button>
                        )}
                      </div>

                      {/* 상태 변경 버튼 */}
                      <div className="status-actions">
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleStatusChange(selectedReport.reportId, "대기")
                          }
                          disabled={
                            selectedReport.summary?.status === "접수 대기" ||
                            selectedReport.summary?.status === "대기" ||
                            updatingStatus ||
                            deleting
                          }
                        >
                          대기
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleStatusChange(
                              selectedReport.reportId,
                              "처리중"
                            )
                          }
                          disabled={
                            selectedReport.summary?.status === "처리 중" ||
                            selectedReport.summary?.status === "처리중" ||
                            updatingStatus ||
                            deleting
                          }
                        >
                          처리중
                        </Button>
                        <Button
                          variant="primary"
                          onClick={() =>
                            handleStatusChange(selectedReport.reportId, "완료")
                          }
                          disabled={
                            selectedReport.summary?.status === "처리 완료" ||
                            selectedReport.summary?.status === "완료" ||
                            updatingStatus ||
                            deleting
                          }
                        >
                          완료
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleStatusChange(selectedReport.reportId, "반려")
                          }
                          disabled={
                            selectedReport.summary?.status === "반려" ||
                            updatingStatus ||
                            deleting
                          }
                          style={{ borderColor: "#ef4444", color: "#ef4444" }}
                        >
                          반려
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Admin;
