/**
 * 시스템 설정 관리 유틸리티
 * Biconomy API Key 등 암호화된 설정을 DB에 저장/조회
 */

import { supabase } from './supabase/client';
import { encryptData, decryptData } from './encryption';

export interface BiconomySettings {
  apiKey: string;
  apiUrl: string;
  enabled: boolean;
}

export interface SystemSettings {
  biconomy: BiconomySettings;
  updatedAt?: string;
  updatedBy?: string;
}

const SETTINGS_KEY = 'biconomy_config';

/**
 * Biconomy 설정 저장 (암호화)
 */
export async function saveBiconomySettings(
  settings: BiconomySettings,
  userId: string
): Promise<void> {
  try {
    // API Key 암호화
    const encryptedApiKey = encryptData(settings.apiKey);
    
    const settingsData = {
      key: SETTINGS_KEY,
      value: {
        apiKey: encryptedApiKey,
        apiUrl: settings.apiUrl,
        enabled: settings.enabled,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      },
    };

    // DB에 저장 (upsert)
    const { error } = await supabase
      .from('system_settings')
      .upsert(settingsData, { onConflict: 'key' });

    if (error) throw error;
  } catch (error) {
    console.error('Save Biconomy settings error:', error);
    throw new Error('Biconomy 설정 저장에 실패했습니다');
  }
}

/**
 * Biconomy 설정 조회 (복호화)
 */
export async function getBiconomySettings(): Promise<BiconomySettings | null> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // 데이터가 없으면 null 반환
        return null;
      }
      throw error;
    }

    if (!data || !data.value) return null;

    // API Key 복호화
    const decryptedApiKey = decryptData(data.value.apiKey);

    return {
      apiKey: decryptedApiKey,
      apiUrl: data.value.apiUrl || 'https://supertransaction.biconomy.io/api/v1',
      enabled: data.value.enabled ?? false,
    };
  } catch (error) {
    console.error('Get Biconomy settings error:', error);
    return null;
  }
}

/**
 * Biconomy 설정 삭제
 */
export async function deleteBiconomySettings(): Promise<void> {
  try {
    const { error } = await supabase
      .from('system_settings')
      .delete()
      .eq('key', SETTINGS_KEY);

    if (error) throw error;
  } catch (error) {
    console.error('Delete Biconomy settings error:', error);
    throw new Error('Biconomy 설정 삭제에 실패했습니다');
  }
}

/**
 * Biconomy 설정 테스트 (API 연결 확인)
 */
export async function testBiconomyConnection(apiKey: string, apiUrl: string): Promise<boolean> {
  try {
    const testUrl = `${apiUrl}/health`;
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
      },
    });

    // 200 OK 또는 404 Not Found (health 엔드포인트가 없을 수 있음)
    // API Key가 유효하면 401이 아님
    return response.status !== 401 && response.status !== 403;
  } catch (error) {
    console.error('Biconomy connection test error:', error);
    return false;
  }
}

/**
 * DB에서 시스템 설정 테이블 생성 (마이그레이션)
 * Supabase에서 직접 실행할 SQL
 */
export const SYSTEM_SETTINGS_MIGRATION = `
-- 시스템 설정 테이블
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_system_settings_updated ON system_settings(updated_at DESC);

-- 자동 updated_at 갱신 트리거
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_system_settings_updated_at();
`;
