export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: Record<string, unknown>;
  updated_at: string;
}

export interface DemoMode {
  enabled: boolean;
  label: string;
}

