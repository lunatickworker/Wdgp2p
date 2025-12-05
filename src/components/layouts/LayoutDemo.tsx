import React, { useState } from 'react';
import { LayoutProvider, LayoutSelector } from './LayoutProvider';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

export function LayoutDemo() {
  const [selectedTemplateId, setSelectedTemplateId] = useState('modern');
  const [showSelector, setShowSelector] = useState(false);

  // Mock tenant data
  const mockTenant = {
    id: 'demo-center-id',
    centerName: 'Demo Center',
    logoUrl: null,
    templateId: selectedTemplateId,
  };

  // Demo content
  const demoContent = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Welcome to Layout System</h1>
          <p className="opacity-70 mt-2">
            This is a demo of the multi-tenancy layout system with 5 template variants.
          </p>
        </div>
        <Button onClick={() => setShowSelector(!showSelector)}>
          {showSelector ? '레이아웃 보기' : '템플릿 변경'}
        </Button>
      </div>

      {showSelector ? (
        <LayoutSelector
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={(templateId) => {
            setSelectedTemplateId(templateId);
            setShowSelector(false);
          }}
          tenant={mockTenant}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>총 회원 수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl">1,234</div>
              <p className="text-sm opacity-60 mt-2">전월 대비 +12%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>총 거래액</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl">₩5.6M</div>
              <p className="text-sm opacity-60 mt-2">전월 대비 +8%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>가맹점 수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl">45</div>
              <p className="text-sm opacity-60 mt-2">전월 대비 +3</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>최근 활동</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
                  <div>
                    <div>새 회원 가입</div>
                    <div className="text-sm opacity-60">user123@example.com</div>
                  </div>
                  <div className="text-sm opacity-60">2분 전</div>
                </div>
                <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
                  <div>
                    <div>입금 요청</div>
                    <div className="text-sm opacity-60">₩100,000</div>
                  </div>
                  <div className="text-sm opacity-60">5분 전</div>
                </div>
                <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
                  <div>
                    <div>가맹점 생성</div>
                    <div className="text-sm opacity-60">Store ABC</div>
                  </div>
                  <div className="text-sm opacity-60">1시간 전</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>현재 템플릿</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl capitalize mb-2">{selectedTemplateId}</div>
              <Button 
                onClick={() => setShowSelector(true)}
                variant="outline"
                className="w-full"
              >
                템플릿 변경
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  return (
    <LayoutProvider tenant={mockTenant}>
      {demoContent}
    </LayoutProvider>
  );
}
