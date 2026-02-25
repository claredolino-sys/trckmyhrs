import React from 'react';
import { ActivityLog } from '../types';
import { Wifi } from 'lucide-react';

interface StudentActivityLogProps {
  logs: ActivityLog[];
}

export const StudentActivityLog: React.FC<StudentActivityLogProps> = ({ logs }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white px-8 py-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-2">My Activity Log</h2>
        <p className="text-gray-500 text-sm">History of your actions within the system.</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                       <tr>
                          <th className="px-6 py-3 text-left font-medium text-gray-500">Timestamp</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500">Action</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500">Network</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-500">Location</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                      {logs.map(log => (
                          <tr key={log.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                  {new Date(log.timestamp).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-gray-700">
                                  {log.action}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                  {log.network ? (
                                      <span className="text-xs text-gray-600 flex items-center">
                                          <Wifi className="w-3 h-3 mr-1 text-brand-500" />
                                          {log.network}
                                      </span>
                                  ) : (
                                      <span className="text-xs text-gray-400 italic">Unknown</span>
                                  )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                  {log.location ? (
                                      <span className="text-xs text-gray-500 flex items-center">
                                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                          Recorded
                                      </span>
                                  ) : (
                                      <span className="text-xs text-gray-400 italic">Not recorded</span>
                                  )}
                              </td>
                          </tr>
                      ))}
                       {logs.length === 0 && (
                          <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No activity logs found.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};