import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../api/admin";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Button from "../components/Button";
import "./Admin.css";

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

      // 첫 페이지로 전체 페이지 수 확인
      const firstResponse = await adminAPI.getReportList(0, 100);
      totalPages = firstResponse.totalPages || 1;
      allData = [...(firstResponse.content || [])];

      // 나머지 페이지들 가져오기
      for (page = 1; page < totalPages && page < 100; page++) {
        // 최대 100페이지 (안전장치)
        const response = await adminAPI.getReportList(page, 100);
        const content = response.content || [];
        allData = [...allData, ...content];
      }

      console.log("통계용 데이터 로드 완료:", allData.length, "개");
      console.log("상태별 분포:", {
        전체: allData.length,
        "접수 대기": allData.filter(r => r.reportStatus === "접수 대기").length,
        "처리 중": allData.filter(r => r.reportStatus === "처리 중").length,
        "처리 완료": allData.filter(r => r.reportStatus === "처리 완료").length,
        반려: allData.filter(r => r.reportStatus === "반려").length,
        기타: allData
          .filter(
            r =>
              !["접수 대기", "처리 중", "처리 완료", "반려"].includes(
                r.reportStatus
              )
          )
          .map(r => r.reportStatus),
      });

      setAllReports(allData);
    } catch (error) {
      console.error("통계용 전체 데이터 조회 실패:", error);
      // 실패해도 계속 진행
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // 통계용 전체 데이터는 항상 별도로 조회 (필터와 무관하게)
      // 병렬로 처리하여 성능 향상
      const statsPromise = fetchAllReportsForStats();

      // 필터에 따라 적절한 API 호출
      let response;
      // UI 필터 값("대기", "처리중", "완료")을 백엔드 statusId로 변환
      const statusId =
        statusFilter !== "ALL" ? getStatusId(statusFilter) : null;

      // 게시글/댓글 필터만 있고 상태 필터가 없는 경우 - 전체 데이터를 가져와서 클라이언트 사이드 필터링
      const needsClientSideFiltering =
        (typeFilter === "게시글" || typeFilter === "댓글") && statusId === null;

      if (needsClientSideFiltering) {
        // 전체 데이터를 가져와서 필터링
        const allResponse = await adminAPI.getReportList(0, 10000);
        const allData = allResponse.content || [];

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
      } else {
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
      }

      // 통계용 데이터 조회 완료 대기
      await statsPromise;
    } catch (error) {
      console.error("신고 목록 조회 실패:", error);
      setError("신고 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleReportClick = async reportId => {
    try {
      const detail = await adminAPI.getReportDetail(reportId);
      setSelectedReport(detail);
    } catch (error) {
      console.error("신고 상세 조회 실패:", error);
      alert("신고 상세 정보를 불러오는데 실패했습니다.");
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
      console.error("신고 상태 변경 실패:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "신고 상태 변경에 실패했습니다.";
      alert(errorMessage);
    } finally {
      setUpdatingStatus(false);
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
          <h1 className="admin-title">관리자 페이지</h1>
          <p className="admin-subtitle">신고된 게시글 및 댓글 관리</p>
        </div>

        {loading ? (
          <div className="admin-loading">로딩 중...</div>
        ) : error ? (
          <div className="admin-error">{error}</div>
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
                    이전
                  </Button>
                  <span className="page-info">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))
                    }
                    disabled={currentPage >= totalPages - 1}
                  >
                    다음
                  </Button>
                </div>
              )}
            </div>

            {/* 신고 상세 모달 */}
            {selectedReport && (
              <div
                className="report-detail-modal-overlay"
                onClick={() => setSelectedReport(null)}
              >
                <div
                  className="report-detail-modal"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="modal-header">
                    <h2>신고 상세 정보</h2>
                    <button
                      className="modal-close"
                      onClick={() => setSelectedReport(null)}
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
                        <h3 className="section-label">게시글 정보</h3>
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
                        <h3 className="section-label">댓글 정보</h3>
                        <div className="comment-detail-card">
                          <div className="comment-content">
                            {selectedReport.comment}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 상태 변경 */}
                    <div className="detail-section">
                      <h3 className="section-label">상태 변경</h3>
                      <div className="status-actions">
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleStatusChange(selectedReport.reportId, "대기")
                          }
                          disabled={
                            selectedReport.summary?.status === "접수 대기" ||
                            selectedReport.summary?.status === "대기" ||
                            updatingStatus
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
                            updatingStatus
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
                            updatingStatus
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
                            updatingStatus
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
