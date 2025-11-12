import React, { useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "./VerificationForm.css";

const CLOUDINARY_CLOUD_NAME = "dzvfekrgb";
const CLOUDINARY_UPLOAD_PRESET = "j_default";

const VerificationForm = ({ isOpen, onClose, sellerId, categoryId }) => {
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [remarks, setRemarks] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [productNameOnBill, setProductNameOnBill] = useState("");
  const [hasWarranty, setHasWarranty] = useState(null);
  const [loanStatus, setLoanStatus] = useState(null); // ✅ New: loan selection
  const [isEV, setIsEV] = useState(null); // ✅ New: EV / Non-EV selection

  // Document requirements
  const categoryDocs = {
    1: ["rcbook", "insurance", "puc", "aadhaar", "noc"], // Cars
    3: ["rcbook", "insurance", "puc", "aadhaar", "noc"], // Bikes
    8: ["registration"], // Pets
    default: ["bill"], // Others → warranty handled separately
  };

  const getRequiredDocs = () => categoryDocs[categoryId] || categoryDocs.default;

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", "SmartCartDocs");

    try {
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
        formData
      );

      let fileUrl = res.data.secure_url;
      if (file.type.includes("pdf")) {
        fileUrl = fileUrl.replace("/upload/", "/upload/fl_attachment/");
      }

      setUploadedFiles((prev) => ({
        ...prev,
        [field]: fileUrl,
      }));

      setStatus(`${field} uploaded successfully`);
    } catch (error) {
      console.error("Upload error:", error);
      setStatus(`Error uploading ${field}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    const finalUploadedFiles = { ...uploadedFiles };
    const requiredDocs = getRequiredDocs();

    // Ensure all required docs exist
    requiredDocs.forEach((field) => {
      if (!finalUploadedFiles[field]) {
        finalUploadedFiles[field] = `No ${field}`;
      }
    });

    // ✅ EV/Non-EV logic for PUC
    if ([1, 3].includes(categoryId)) {
      if (isEV === true) {
        finalUploadedFiles.puc = "User has EV vehicle";
      }
    }

    // ✅ Loan status logic for NOC
    if ([1, 3].includes(categoryId)) {
      if (loanStatus === "noLoan") {
        finalUploadedFiles.noc = "No loan";
      } else if (loanStatus === "pending") {
        finalUploadedFiles.noc = "Loan is pending";
      }
    }

    // ✅ Warranty logic for others
    if (![1, 3, 8].includes(categoryId)) {
      if (hasWarranty === false || hasWarranty === null) {
        finalUploadedFiles.warranty = "No warranty card";
      }
    }

    const payload = {
      sellerId,
      categoryId,
      uploadedFiles: finalUploadedFiles,
      remarks,
      productTitle: productNameOnBill || null,
    };

    try {
      const res = await axios.post("http://localhost:5000/api/verification", payload);
      if (res.status === 201) {
        const verificationId = res.data._id;
        console.log("Verification created with ID:", verificationId);
        setStatus(`Verification submitted (ID: ${verificationId})`);

        // Reset
        setUploadedFiles({});
        setRemarks("");
        setProductNameOnBill("");
        setHasWarranty(null);
        setLoanStatus(null);
        setIsEV(null);

        setTimeout(async () => {
          try {
            const statusRes = await axios.get(
              `http://localhost:5000/api/verification/${verificationId}`
            );
            const latestStatus = statusRes.data.status || "pending";
            setStatus(`Verification Status: ${latestStatus}`);
            if (onClose) onClose(verificationId, latestStatus);
          } catch (err) {
            console.error("Error fetching verification status:", err);
          }
        }, 2500);
      }
    } catch (err) {
      console.error("Submission error:", err);
      setStatus("Error submitting verification");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="verification-overlay">
      <div className="verification-modal container mt-4 mb-5 p-4 shadow-lg rounded bg-white">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="m-0">Document Verification</h4>
          <button className="btn-close" onClick={onClose}></button>
        </div>

        <div>
          {/* Product name input */}
          {![1, 3, 8].includes(categoryId) && (
            <div className="mb-3">
              <label className="form-label">Product Name as per Bill</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter product name as mentioned in bill"
                value={productNameOnBill}
                onChange={(e) => setProductNameOnBill(e.target.value)}
                required
              />
            </div>
          )}

          {/* Upload fields */}
          {getRequiredDocs().map((field) => (
            <div className="mb-3" key={field}>
              {/* ✅ Loan radio before NOC */}
              {([1, 3].includes(categoryId) && field === "noc") && (
                <>
                  <label className="form-label d-block">Loan Status</label>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="loanStatus"
                      id="noLoan"
                      checked={loanStatus === "noLoan"}
                      onChange={() => setLoanStatus("noLoan")}
                    />
                    <label className="form-check-label" htmlFor="noLoan">
                      No Loan
                    </label>
                  </div>

                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="loanStatus"
                      id="loanPending"
                      checked={loanStatus === "pending"}
                      onChange={() => setLoanStatus("pending")}
                    />
                    <label className="form-check-label" htmlFor="loanPending">
                      Loan is Pending
                    </label>
                  </div>

                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="loanStatus"
                      id="loanDone"
                      checked={loanStatus === "done"}
                      onChange={() => setLoanStatus("done")}
                    />
                    <label className="form-check-label" htmlFor="loanDone">
                      Loan is Done
                    </label>
                  </div>
                </>
              )}

              {/* ✅ EV radio before PUC */}
              {([1, 3].includes(categoryId) && field === "puc") && (
                <>
                  <label className="form-label d-block">Vehicle Type</label>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="vehicleType"
                      id="evVehicle"
                      checked={isEV === true}
                      onChange={() => {
                        setIsEV(true);
                        setUploadedFiles((prev) => ({
                          ...prev,
                          puc: "User has EV vehicle",
                        }));
                      }}
                    />
                    <label className="form-check-label" htmlFor="evVehicle">
                      My vehicle is EV
                    </label>
                  </div>

                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="vehicleType"
                      id="nonEVVehicle"
                      checked={isEV === false}
                      onChange={() => {
                        setIsEV(false);
                        setUploadedFiles((prev) => {
                          const newFiles = { ...prev };
                          delete newFiles.puc;
                          return newFiles;
                        });
                      }}
                    />
                    <label className="form-check-label" htmlFor="nonEVVehicle">
                      My vehicle is Non-EV
                    </label>
                  </div>
                </>
              )}

              {/* Upload only when allowed */}
              {!(field === "noc" && loanStatus !== "done") &&
                !(field === "puc" && isEV === true) && (
                  <>
                    <label className="form-label text-capitalize mt-2">{field}</label>
                    <input
                      type="file"
                      className="form-control"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={(e) => handleFileUpload(e, field)}
                    />
                    {uploadedFiles[field] && (
                      <a
                        href={uploadedFiles[field]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-success small d-block mt-1"
                      >
                        View uploaded file
                      </a>
                    )}
                  </>
                )}

              {/* Show “auto text” for skipped fields */}
              {(field === "noc" && loanStatus !== "done") && (
                <p className="text-muted small mt-2">
                  {loanStatus === "noLoan"
                    ? "No loan"
                    : loanStatus === "pending"
                    ? "Loan is pending"
                    : ""}
                </p>
              )}

              {(field === "puc" && isEV === true) && (
                <p className="text-muted small mt-2">User has EV vehicle</p>
              )}
            </div>
          ))}

          {/* Warranty radio for other categories */}
          {![1, 3, 8].includes(categoryId) && (
            <div className="mb-3">
              <label className="form-label d-block">Warranty Card</label>

              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="warrantyOption"
                  id="haveWarranty"
                  checked={hasWarranty === true}
                  onChange={() => setHasWarranty(true)}
                />
                <label className="form-check-label" htmlFor="haveWarranty">
                  I have warranty card
                </label>
              </div>

              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="warrantyOption"
                  id="noWarranty"
                  checked={hasWarranty === false}
                  onChange={() => setHasWarranty(false)}
                />
                <label className="form-check-label" htmlFor="noWarranty">
                  I have no warranty card
                </label>
              </div>

              {hasWarranty === true && (
                <div className="mt-3">
                  <input
                    type="file"
                    className="form-control"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={(e) => handleFileUpload(e, "warranty")}
                  />
                  {uploadedFiles.warranty && (
                    <a
                      href={uploadedFiles.warranty}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-success small d-block mt-1"
                    >
                      View uploaded warranty card
                    </a>
                  )}
                </div>
              )}

              {hasWarranty === false && (
                <div className="border rounded p-2 mt-2 bg-light">
                  <p className="text-danger small mb-0">No warranty card</p>
                </div>
              )}
            </div>
          )}

          {/* Remarks + Submit */}
          <div className="mb-3">
            <label className="form-label">Remarks (optional)</label>
            <textarea
              className="form-control"
              rows="2"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            ></textarea>
          </div>

          <div className="d-flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              className="btn btn-primary w-100"
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Submit Verification"}
            </button>
            <button
              type="button"
              className="btn btn-secondary w-50"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>

        {status && <div className="alert alert-info mt-3">{status}</div>}
      </div>
    </div>
  );
};

export default VerificationForm;
