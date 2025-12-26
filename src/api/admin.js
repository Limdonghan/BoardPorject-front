import apiClient from "./axios";

export const adminAPI = {
  // 신고 목록 조회 (페이징)
  getReportList: async (page = 0, size = 10) => {
    const response = await apiClient.get("/api/admin", {
      params: { page, size },
    });
    return response.data;
  },

  // 게시글 신고 목록 조회 (상태별 필터링 + 페이징)
  getPostReportList: async (page = 0, size = 10, statusId = null) => {
    if (statusId === null) {
      // 상태 필터 없이 게시글만 조회하려면 기본 API 사용
      const response = await apiClient.get("/api/admin", {
        params: { page, size },
      });
      const data = response.data;
      // 클라이언트 사이드에서 게시글만 필터링
      const filteredContent = (data.content || []).filter(
        report => report.title !== null && report.title !== undefined
      );
      return {
        ...data,
        content: filteredContent,
        totalElements: filteredContent.length,
      };
    }
    const response = await apiClient.get(`/api/admin/post/${statusId}`, {
      params: { page, size },
    });
    return response.data;
  },

  // 댓글 신고 목록 조회 (상태별 필터링 + 페이징)
  getCommentReportList: async (page = 0, size = 10, statusId = null) => {
    if (statusId === null) {
      // 상태 필터 없이 댓글만 조회하려면 기본 API 사용
      const response = await apiClient.get("/api/admin", {
        params: { page, size },
      });
      const data = response.data;
      // 클라이언트 사이드에서 댓글만 필터링
      const filteredContent = (data.content || []).filter(
        report => report.comment !== null && report.comment !== undefined
      );
      return {
        ...data,
        content: filteredContent,
        totalElements: filteredContent.length,
      };
    }
    const response = await apiClient.get(`/api/admin/comment/${statusId}`, {
      params: { page, size },
    });
    return response.data;
  },

  // 상태별 신고 목록 조회 (게시글/댓글 구분 없이)
  getReportListByStatus: async (page = 0, size = 10, statusId) => {
    const response = await apiClient.get(`/api/admin/${statusId}`, {
      params: { page, size },
    });
    return response.data;
  },

  // 신고 상세 조회
  getReportDetail: async reportId => {
    const response = await apiClient.get(`/api/admin/detail/${reportId}`);
    return response.data;
  },

  // 신고 상태 변경
  updateReportStatus: async (reportId, status) => {
    const response = await apiClient.post(`/api/report/${reportId}`, {
      status,
    });
    return response.data;
  },

  // 관리자 삭제 전용 API (게시글 또는 댓글 삭제)
  adminDelete: async id => {
    const response = await apiClient.delete(`/api/admin/${id}`);
    return response.data;
  },

  // Typesense 데이터 동기화
  syncTypesense: async () => {
    const response = await apiClient.get("/api/admin/sync-typesense");
    return response.data;
  },
};
