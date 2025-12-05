import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { uploadCenterLogo, deleteCenterLogo } from '@/utils/api/upload-logo';
import { toast } from 'sonner@2.0.3';

interface LogoUploaderProps {
  centerId: string;
  currentLogoUrl?: string | null;
  onUploadSuccess?: (logoUrl: string) => void;
  onDeleteSuccess?: () => void;
}

export function LogoUploader({
  centerId,
  currentLogoUrl,
  onUploadSuccess,
  onDeleteSuccess
}: LogoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 유효성 검사
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('이미지 파일만 업로드 가능합니다 (PNG, JPG, WEBP)');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('파일 크기는 5MB 이하여야 합니다');
      return;
    }

    // 미리보기 생성
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // 업로드 시작
    setIsUploading(true);
    try {
      const result = await uploadCenterLogo({
        centerId,
        file
      });

      if (result.success && result.logoUrl) {
        toast.success('로고가 업로드되었습니다');
        setPreviewUrl(result.logoUrl);
        onUploadSuccess?.(result.logoUrl);
      } else {
        toast.error(result.error || '업로드 실패');
        setPreviewUrl(currentLogoUrl || null);
      }
    } catch (error: any) {
      toast.error(error.message || '업로드 중 오류 발생');
      setPreviewUrl(currentLogoUrl || null);
    } finally {
      setIsUploading(false);
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('로고를 삭제하시겠습니까?')) return;

    setIsDeleting(true);
    try {
      const result = await deleteCenterLogo(centerId);

      if (result.success) {
        toast.success('로고가 삭제되었습니다');
        setPreviewUrl(null);
        onDeleteSuccess?.();
      } else {
        toast.error(result.error || '삭제 실패');
      }
    } catch (error: any) {
      toast.error(error.message || '삭제 중 오류 발생');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>센터 로고</Label>
        <p className="text-sm text-gray-500 mt-1">
          PNG, JPG, WEBP 파일 (최대 5MB)
        </p>
      </div>

      {/* 미리보기 */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        {previewUrl ? (
          <div className="space-y-4">
            <div className="relative inline-block">
              <img
                src={previewUrl}
                alt="로고 미리보기"
                className="max-h-40 max-w-full object-contain rounded"
              />
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isDeleting}
              >
                <Upload className="w-4 h-4 mr-2" />
                변경
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isUploading || isDeleting}
              >
                <X className="w-4 h-4 mr-2" />
                삭제
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <ImageIcon className="w-16 h-16 text-gray-400" />
            </div>
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? '업로드 중...' : '로고 업로드'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {isUploading && (
        <div className="text-sm text-center text-gray-500">
          업로드 중입니다...
        </div>
      )}
    </div>
  );
}
