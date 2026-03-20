import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Company, addLog } from '../db';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { useAuth } from '../AuthContext';

export default function SettingsInfo() {
  const { user } = useAuth();
  const company = useLiveQuery(() => db.company.limit(1).first());
  
  const [formData, setFormData] = useState<Company>({
    name: '',
    address: '',
    phone: '',
    taxId: '',
    logo: ''
  });

  useEffect(() => {
    if (company) {
      setFormData(company);
    }
  }, [company]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (company?.id) {
      await db.company.update(company.id, formData);
      if (user) await addLog(user.username, 'Cập nhật thông tin công ty');
    } else {
      await db.company.add(formData);
      if (user) await addLog(user.username, 'Thêm thông tin công ty');
    }
    alert('Đã lưu thông tin công ty!');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Thông tin công ty</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên công ty</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">Mã số thuế</Label>
              <Input id="taxId" name="taxId" value={formData.taxId} onChange={handleChange} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Địa chỉ</Label>
              <Input id="address" name="address" value={formData.address} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Logo công ty</Label>
              <Input id="logo" type="file" accept="image/*" onChange={handleLogoUpload} />
              {formData.logo && (
                <img src={formData.logo} alt="Logo" className="mt-2 h-20 object-contain border rounded p-1" />
              )}
            </div>
          </div>
          <Button onClick={handleSave} className="w-full sm:w-auto mt-4">Lưu thông tin</Button>
        </CardContent>
      </Card>
    </div>
  );
}
