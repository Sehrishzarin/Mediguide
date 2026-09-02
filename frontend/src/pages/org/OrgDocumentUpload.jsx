import { useState, useRef } from 'react';
import * as api from '../../services/api';
import styles from './OrgForms.module.css';

function OrgDocumentUpload({ orgId, onNext, onBack }) {
  const [files, setFiles] = useState([]);
  const [uploaded, setUploaded] = useState([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleUploadAll = async () => {
    if (files.length === 0) { onNext({ documents: uploaded }); return; }
    setError('');
    setUploading(true);
    try {
      const results = [];
      for (const file of files) {
        const { document } = await api.uploadOrgDocument(orgId, file);
        results.push(document);
      }
      setUploaded((prev) => [...prev, ...results]);
      setFiles([]);
      onNext({ documents: [...uploaded, ...results] });
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.heading}>Upload documents</h2>
      <p className={styles.subtext}>Upload licenses, certifications, or other required documents. You may skip this step and provide them later.</p>

      <label className={styles.dropzone}>
        <svg className={styles.dropzoneSvg} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
        </svg>
        <span className={styles.dropzoneText}>Click to select files or drag them here</span>
        <input ref={inputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={handleFileSelect} className={styles.hiddenInput} />
      </label>

      {files.length > 0 && (
        <ul className={styles.fileList}>
          {files.map((file, idx) => (
            <li key={`${file.name}-${idx}`} className={styles.fileItem}>
              <span className={styles.fileName}>{file.name}</span>
              <button type="button" onClick={() => removeFile(idx)} className={styles.removeBtn}>Remove</button>
            </li>
          ))}
        </ul>
      )}

      {uploaded.length > 0 && (
        <div className={styles.uploadedList}>
          <p className={styles.uploadedLabel}>Uploaded:</p>
          <ul className={styles.uploadedItems}>
            {uploaded.map((doc) => (
              <li key={doc.id} className={styles.uploadedItem}>{doc.filename}</li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className={styles.errorMsg}>{error}</p>}

      <div className={styles.btnRow}>
        <button type="button" onClick={onBack} className={styles.btnBack}>Back</button>
        <button type="button" onClick={handleUploadAll} disabled={uploading} className={styles.btnPrimary}>
          {uploading ? 'Uploading...' : files.length > 0 ? `Upload ${files.length} file(s)` : 'Skip & Continue'}
        </button>
      </div>
    </div>
  );
}

export default OrgDocumentUpload;
