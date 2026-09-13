import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ShieldAlert, FileText } from 'lucide-react';
import { api } from '../../services/api';

// Set up PDF.js worker URL
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const PdfViewer = ({ contentId }) => {
  const canvasRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPdf = async () => {
      try {
        setLoading(true);
        // Fetch arrayBuffer from protected backend endpoint
        const response = await api.get(`/content/${contentId}/pdf`);
        const arrayBuffer = await response.arrayBuffer();

        const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (isMounted) {
          setPdfDoc(loadedPdf);
          setNumPages(loadedPdf.numPages);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load protected PDF document');
          setLoading(false);
        }
      }
    };

    fetchPdf();
    return () => {
      isMounted = false;
    };
  }, [contentId]);

  useEffect(() => {
    if (!pdfDoc) return;

    let renderTask = null;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('PDF page render error:', err);
        }
      }
    };

    renderPage();

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNum, scale]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', marginBottom: '1rem' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Retrieving protected PDF from secure storage...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)' }}>
        <p style={{ color: 'var(--accent-danger)' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* Viewer Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            disabled={pageNum <= 1}
            className="btn btn-secondary btn-sm"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Page {pageNum} of {numPages}
          </span>
          <button
            onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
            disabled={pageNum >= numPages}
            className="btn btn-secondary btn-sm"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
            className="btn btn-secondary btn-sm"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
            className="btn btn-secondary btn-sm"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* PDF Canvas Rendering Container */}
      <div
        onContextMenu={(e) => e.preventDefault()}
        style={{
          display: 'flex',
          justifyContent: 'center',
          overflow: 'auto',
          padding: '1.5rem',
          backgroundColor: '#1E293B',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          maxHeight: '800px',
        }}
      >
        <canvas ref={canvasRef} style={{ boxShadow: 'var(--shadow-lg)', borderRadius: '4px' }} />
      </div>

      <div className="security-alert">
        <ShieldAlert size={20} color="var(--accent-warning)" />
        <span>
          <strong>PDF.js Protected Rendering:</strong> PDF binary rendered strictly via canvas. File download and print options are hidden.
        </span>
      </div>
    </div>
  );
};
