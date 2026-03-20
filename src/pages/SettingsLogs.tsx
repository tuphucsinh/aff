import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Log } from '../db';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { format } from 'date-fns';

export default function SettingsLogs() {
  const logs = useLiveQuery(() => db.logs.orderBy('timestamp').reverse().limit(100).toArray());

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Nhật ký hoạt động</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3">Thời gian</th>
                  <th className="px-6 py-3">Nhân viên</th>
                  <th className="px-6 py-3">Hoạt động</th>
                </tr>
              </thead>
              <tbody>
                {logs?.map(log => (
                  <tr key={log.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 font-medium">{log.username}</td>
                    <td className="px-6 py-4">{log.action}</td>
                  </tr>
                ))}
                {(!logs || logs.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                      Chưa có nhật ký hoạt động
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
