import React, { useState } from 'react';
import { db, addLog } from '../db';
import { useAuth } from '../AuthContext';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../components/ui';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();
      const users = await db.users.toArray();
      const user = users.find(u => u.username === trimmedUsername);
      if (user && user.password === trimmedPassword) {
        login(user, rememberMe);
        await addLog(user.username, 'Đăng nhập hệ thống');
      } else {
        setError('Tên đăng nhập hoặc mật khẩu không đúng');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi hệ thống');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Đăng nhập AFF Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input 
                id="username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="rememberMe" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                Ghi nhớ đăng nhập
              </Label>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full">Đăng nhập</Button>
            
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
