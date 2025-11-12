import React, { useEffect, useState } from "react";
import { Modal, Button, Spinner, Table, Badge } from "react-bootstrap";
import "./ViewVerificationData.css";

const ViewVerificationData = ({ isOpen, onClose, product }) => {
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !product?.verificationId) return;

    setLoading(true);
    setError(null);

    fetch(`http://localhost:5000/api/verification/${product.verificationId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch verification data");
        return res.json();
      })
      .then((data) => setVerification(data.data || data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen, product?.verificationId]);

  const renderBadge = (status) => {
  if (!status) return <Badge bg="secondary">Pending</Badge>;
  const s = String(status).toLowerCase();

  if (s.includes("document uploaded"))
    return <Badge bg="info">Document Uploaded</Badge>; // 💡 blue info color
  if (s.includes("verified"))
    return <Badge bg="success">Verified</Badge>;
  if (s.includes("suspect") || s.includes("mismatch"))
    return (
      <Badge bg="warning" text="dark">
        Suspect
      </Badge>
    );
  if (s.includes("rejected"))
    return <Badge bg="danger">Rejected</Badge>;

  return <Badge bg="secondary">Pending</Badge>;
};


  const renderUploadedFiles = (files, categoryIdRaw) => {
    if (!files) return null;
    const categoryId = Number(categoryIdRaw);
    let displayDocs = [];

    if ([2, 4, 5, 6, 7].includes(categoryId)) {
      displayDocs = ["bill", "warranty"];
    } else {
      displayDocs = ["rcbook", "insurance", "puc", "noc", "aadhaar"];
    }

    return (
      <>
        <h5 className="section-title mt-4">Uploaded Documents by Seller</h5>
        <Table bordered hover responsive className="uploaded-table">
          <thead>
            <tr>
              <th>Document Type</th>
              <th>Upload Status</th>
            </tr>
          </thead>
          <tbody>
            {displayDocs.map((doc) => {
              const rawValue = files.hasOwnProperty(doc) ? files[doc] : null;
              const uploaded = typeof rawValue === "string" && rawValue.trim() !== "";

              return (
                <tr key={doc}>
                  <td className="fw-bold text-capitalize">{doc}</td>
                  <td>
                    {!uploaded ? (
                      <span className="text-danger">
                        Seller has not uploaded this document
                      </span>
                    ) : (
                      <>
                        {[2, 4, 5, 6, 7].includes(categoryId) ? (
                          <a
                            href={rawValue}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-success"
                          >
                            View Uploaded {doc}
                          </a>
                        ) : (
                          <span className="text-success">Document uploaded</span>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </>
    );
  };

  return (
    <Modal show={isOpen} onHide={onClose} centered size="lg" className="verification-modal">
      <Modal.Header closeButton className="verification-header">
        <Modal.Title>Verification Details</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {loading && (
          <div className="text-center my-4">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Loading verification data...</p>
          </div>
        )}

        {error && <p className="text-danger text-center">{error}</p>}

        {!loading && verification && (
          <>
            {/* ✅ Skip category 8 completely */}
            {Number(verification.categoryId) === 8 ? (
              <p className="text-center text-muted fs-5">
                Verification is not required for this category.
              </p>
            ) : (
              <div className="verification-content">
                {/*  Use dynamic verification status from backend */}
                <div className="mb-3">
                  <strong>Status:</strong>{" "}
                  {renderBadge(
                    verification.status ||
                    verification.scanResult?.verification_check?.verification_status ||
                    "Pending"
                  )}
                </div>

                {/* === Pending Case === */}
                {!verification.status ||
                verification.status.toLowerCase() === "pending" ? (
                  <p className="text-center text-muted fs-5">
                    Seller has not done verification yet.
                  </p>
                ) : (
                  <>
                    {/* === For category 2,4,5,6,7 === */}
                    {[2, 4, 5, 6, 7].includes(Number(verification.categoryId)) ? (
                      <>
                        {renderUploadedFiles(
                          verification.uploadedFiles || {},
                          verification.categoryId
                        )}

                        {/* ✅ Fixed Result section text */}
                        <div id="verification-status-section" className="mt-4 text-center">
                          <h5>Verification Status Summary</h5>
                          <p className="mt-2">
                            <strong>Result:</strong>{" "}
                            <span className="text-muted">
                              Document uploaded (You can view that documents )
                            </span>
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* === Other categories (full detailed view) === */}
                        {verification.scanResult?.verification_check?.comparison && (
                          <>
                            <h5 className="section-title mt-4">
                              Comparison of Seller Data with Verified Data
                            </h5>
                            <Table
                              bordered
                              hover
                              responsive
                              className="comparison-table"
                            >
                              <thead>
                                <tr>
                                  <th>Field</th>
                                  <th>Result</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(
                                  verification.scanResult.verification_check.comparison
                                ).map(([field, result], index) => (
                                  <tr key={index}>
                                    <td className="fw-bold text-capitalize">{field}</td>
                                    <td>{String(result)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </>
                        )}

                        {renderUploadedFiles(
                          verification.uploadedFiles || {},
                          verification.categoryId
                        )}

                        {verification.scanResult?.verification_check
                          ?.verification_status && (
                          <div className="mt-3">
                            <strong>Final Verification Status:</strong>{" "}
                            {renderBadge(
                              verification.scanResult.verification_check.verification_status
                            )}
                            <p className="mt-2">
                              {verification.scanResult.verification_check.verification_status}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {!loading && !verification && !error && (
          <p className="text-muted text-center">No verification data available.</p>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ViewVerificationData;
