import React, { useState, useEffect } from 'react';
import {
  FolderArchive,
  Upload,
  Search,
  Download,
  Trash2,
  FileText,
  FileCode,
  HardDrive,
  FileCheck,
  Plus,
} from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { toast } from 'sonner';

const CATEGORY_COLORS = {
  Contract: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  Proposal: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  Invoice: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
  NDA: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  Report: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  Other: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
};

export const DocumentVault = () => {
  const [documents, setDocuments] = useState([]);
  const [metrics, setMetrics] = useState({ totalDocuments: 0, totalBytes: 0, categoryCounts: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [docCategory, setDocCategory] = useState('Other');
  const [docTitle, setDocTitle] = useState('');

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const [res, metricRes] = await Promise.all([
        api.get('/documents', { params }),
        api.get('/documents/metrics'),
      ]);

      setDocuments(res.data.data || []);
      setMetrics(metricRes.data.data || {});
    } catch (err) {
      toast.error('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [search, categoryFilter]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!fileToUpload) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      const data = new FormData();
      data.append('file', fileToUpload);
      data.append('title', docTitle || fileToUpload.name);
      data.append('category', docCategory);

      await api.post('/documents/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Document uploaded successfully');
      setIsModalOpen(false);
      setFileToUpload(null);
      setDocTitle('');
      setDocCategory('Other');
      fetchDocuments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed.');
    }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await api.get(`/documents/${doc._id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.originalName || doc.title);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Downloaded ${doc.title}`);
    } catch (err) {
      toast.error('Failed to download document.');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete ${title}?`)) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success('Document deleted');
      fetchDocuments();
    } catch (err) {
      toast.error('Failed to delete document');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 KB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <FolderArchive className="w-7 h-7 text-teal-600" />
            Document Vault & Contracts
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Store enterprise proposals, master service agreements (MSAs), NDAs, and customer files.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Documents</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {metrics.totalDocuments || 0}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-teal-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Storage Consumed</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {formatBytes(metrics.totalBytes)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Contracts</p>
              <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {metrics.categoryCounts?.Contract || 0}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search */}
      <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {['all', 'Contract', 'Proposal', 'Invoice', 'NDA', 'Report', 'Other'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors ${
                categoryFilter === cat
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </Card>

      {/* Documents Table */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Document Title</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">File Size</th>
                <th className="px-6 py-3.5">Uploaded By</th>
                <th className="px-6 py-3.5">Upload Date</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading documents...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    No documents found in vault.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                        {doc.title}
                        {doc.eSignature?.status === 'signed' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                            <FileCheck className="w-3 h-3 text-emerald-600" />
                            Signed
                          </span>
                        ) : doc.eSignature?.status === 'pending' ? (
                          <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                            Signature Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Ready for E-Sign
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-xs">{doc.originalName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`text-xs ${CATEGORY_COLORS[doc.category] || ''}`}>
                        {doc.category}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-600 dark:text-slate-300">
                      {formatBytes(doc.fileSize)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {doc.uploadedBy?.name || 'User'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {doc.eSignature?.status !== 'signed' && (
                          <button
                            onClick={async () => {
                              try {
                                await api.post(`/documents/${doc._id}/sign`);
                                toast.success(`Document "${doc.title}" digitally signed with cryptographic audit trail!`);
                                fetchDocuments();
                              } catch (err) {
                                toast.error('Digital signature failed');
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded"
                            title="Sign Digitally"
                          >
                            <FileCheck className="w-4 h-4 text-emerald-500" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 text-slate-400 hover:text-teal-600 rounded"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc._id, doc.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upload Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Upload Document to Vault"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select File *
            </label>
            <input
              type="file"
              required
              onChange={(e) => {
                const f = e.target.files[0];
                setFileToUpload(f);
                if (f && !docTitle) setDocTitle(f.name);
              }}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 dark:file:bg-slate-800 dark:file:text-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Document Display Title
            </label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              placeholder="e.g. Master Services Agreement 2026"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
            >
              <option value="Contract">Contract / MSA</option>
              <option value="Proposal">Sales Proposal</option>
              <option value="Invoice">Invoice / Receipt</option>
              <option value="NDA">Non-Disclosure Agreement (NDA)</option>
              <option value="Report">Report / Presentation</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">
              Upload Document
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DocumentVault;
