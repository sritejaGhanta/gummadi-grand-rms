import React, { useState, useEffect } from 'react';
import { logsApi } from '../api/endpoints';
import {
  History,
  Shield,
  Clock,
  Search,
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileCode,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

export const ActivityLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const loadLogs = async () => {
    setLoading(true);
    try {
      // Fetch up to 500 audit trail events
      const data = await logsApi.getLogs(500, 0);
      setLogs(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.username?.toLowerCase().includes(search.toLowerCase()) ||
      l.resource?.toLowerCase().includes(search.toLowerCase()) ||
      (l.details && JSON.stringify(l.details).toLowerCase().includes(search.toLowerCase())),
  );

  // Pagination computations
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  // Export to JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `restaurant_audit_logs_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Module', 'Details'];
    const rows = filteredLogs.map((log) => [
      `"${new Date(log.createdAt).toISOString()}"`,
      `"${log.username || 'System'}"`,
      `"${log.roleName || '-'}"`,
      `"${log.action || ''}"`,
      `"${log.resource || ''}"`,
      `"${(log.details ? JSON.stringify(log.details) : '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodedUri);
    downloadAnchor.setAttribute('download', `restaurant_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <History className="w-6 h-6" />
            </span>
            <span>Intranet System Audit & Activity Logs</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-proof audit trails for orders, table status changes, food sold out events, and cashier settlements
          </p>
        </div>

        {/* Action Buttons: Refresh, JSON Export, CSV Export */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-semibold transition"
            title="Export filtered logs as JSON"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition"
            title="Export filtered logs as CSV spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {filteredLogs.length} Total Logs
            </span>
            <span className="text-[11px] text-slate-500">
              (Showing page {validCurrentPage} of {totalPages})
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search action, user, or module..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Module</th>
                <th className="py-2.5 px-3">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No matching activity logs found.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                      {log.username || 'System'}
                    </td>
                    <td className="py-3 px-3 uppercase text-[10px] font-bold text-amber-400">
                      {log.roleName || '-'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-emerald-400">
                      {log.action}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {log.resource}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-400 max-w-xs truncate" title={log.details ? JSON.stringify(log.details) : ''}>
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="text-slate-400">
            Showing <span className="font-bold text-white">{filteredLogs.length > 0 ? startIndex + 1 : 0}</span> to{' '}
            <span className="font-bold text-white">
              {Math.min(startIndex + pageSize, filteredLogs.length)}
            </span>{' '}
            of <span className="font-bold text-white">{filteredLogs.length}</span> entries
          </div>

          <div className="flex items-center gap-1 self-end sm:self-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-bold text-amber-400">
              {validCurrentPage} / {totalPages}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage >= totalPages}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
