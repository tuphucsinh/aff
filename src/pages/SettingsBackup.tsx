import React from 'react';
import { db, addLog } from '../db';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { useAuth } from '../AuthContext';

export default function SettingsBackup() {
  const { user } = useAuth();

  const handleBackup = async () => {
    const data = {
      company: await db.company.toArray(),
      distributors: await db.distributors.toArray(),
      customers: await db.customers.toArray(),
      products: await db.products.toArray(),
      purchases: await db.purchases.toArray(),
      sales: await db.sales.toArray(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aff-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (user) await addLog(user.username, 'Tải file sao lưu dữ liệu');
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        await db.transaction('rw', [db.company, db.distributors, db.customers, db.products, db.purchases, db.sales], async () => {
          await db.company.clear();
          await db.distributors.clear();
          await db.customers.clear();
          await db.products.clear();
          await db.purchases.clear();
          await db.sales.clear();

          if (data.company) await db.company.bulkAdd(data.company);
          if (data.distributors) await db.distributors.bulkAdd(data.distributors);
          if (data.customers) await db.customers.bulkAdd(data.customers);
          if (data.products) await db.products.bulkAdd(data.products);
          if (data.purchases) await db.purchases.bulkAdd(data.purchases);
          if (data.sales) await db.sales.bulkAdd(data.sales);
        });

        if (user) await addLog(user.username, 'Phục hồi dữ liệu từ file sao lưu');
        alert('Phục hồi dữ liệu thành công!');
        window.location.reload();
      } catch (error) {
        console.error(error);
        alert('Lỗi phục hồi dữ liệu. Vui lòng kiểm tra file backup.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Sao lưu & Phục hồi dữ liệu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <Button onClick={handleBackup} variant="outline" className="w-full sm:w-auto">Tải file sao lưu (Backup)</Button>
            <div className="w-full sm:w-auto">
              <Input 
                type="file" 
                accept=".json" 
                id="restore-file" 
                className="hidden" 
                onChange={handleRestore}
              />
              <Label 
                htmlFor="restore-file" 
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-red-600 text-white hover:bg-red-700 cursor-pointer w-full sm:w-auto"
              >
                Phục hồi dữ liệu (Restore)
              </Label>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Lưu ý: Phục hồi dữ liệu sẽ ghi đè toàn bộ dữ liệu hiện tại. Hãy sao lưu trước khi phục hồi.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
