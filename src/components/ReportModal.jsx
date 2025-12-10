import { useState } from "react";
import Button from "./Button";
import "./ReportModal.css";

// 신고 사유 목록 (일반적인 사유들)
const REPORT_REASONS = [
  { id: 1, reason: "스팸 또는 광고" },
  { id: 2, reason: "욕설 또는 비방" },
  { id: 3, reason: "부적절한 내용" },
  { id: 4, reason: "저작권 침해" },
  { id: 5, reason: "개인정보 노출" },
  { id: 6, reason: "기타" },
];

const ReportModal = ({ isOpen, onClose, onReport, type = "게시글" }) => {
  const [selectedReason, setSelectedReason] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedReason) {
      alert("신고 사유를 선택해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      await onReport(selectedReason);
      alert("신고가 접수되었습니다.");
      handleClose();
    } catch (error) {
      console.error("신고 실패:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "신고 처리 중 오류가 발생했습니다.";
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    onClose();
  };

  return (
    <div className="report-modal-overlay" onClick={handleClose}>
      <div className="report-modal" onClick={e => e.stopPropagation()}>
        <div className="report-modal-header">
          <h2 className="report-modal-title">{type} 신고</h2>
          <button className="report-modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="report-modal-content">
          <p className="report-modal-description">
            신고 사유를 선택해주세요.
          </p>

          <div className="report-reasons">
            {REPORT_REASONS.map(reason => (
              <label
                key={reason.id}
                className={`report-reason-item ${
                  selectedReason === reason.id ? "selected" : ""
                }`}
              >
                <input
                  type="radio"
                  name="reportReason"
                  value={reason.id}
                  checked={selectedReason === reason.id}
                  onChange={() => setSelectedReason(reason.id)}
                />
                <span className="report-reason-text">{reason.reason}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="report-modal-actions">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            취소
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            disabled={submitting || !selectedReason}
          >
            {submitting ? "신고 중..." : "신고하기"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;

