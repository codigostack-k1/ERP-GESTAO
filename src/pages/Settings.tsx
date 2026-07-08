
import React, { useState, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  Building2, 
  CreditCard, 
  Globe, 
  Moon, 
  Sun, 
  Type, 
  Save, 
  ShieldCheck, 
  ImageIcon,
} from 'lucide-react';
import { AppConfig, UserRole, ToastType } from '../types';
import { StorageService } from '../services/storageService';
import { useToast } from '../contexts/ToastContext';

interface SettingsProps {
  config: AppConfig;
  userRole: UserRole;
  onConfigChange: (newConfig: AppConfig) => void;
  initialTab?: 'ADMIN' | 'GENERAL' | 'COMPANY' | 'FINANCIAL';
  t: (key: string) => string;
}

const ToggleSwitch = ({ checked, onChange, label, description }: { checked: boolean; onChange: () => void; label: string; description?: string }) => (
  <div className="flex items-center justify-between p-4 bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border">
    <div>
      <span className="block font-medium text-gray-900 dark:text-dark-text">{label}</span>
      {description && <span className="text-sm text-gray-500 dark:text-dark-text-muted">{description}</span>}
    </div>
    <button 
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

const Settings: React.FC<SettingsProps> = ({ config, userRole: _userRole, onConfigChange, initialTab = 'GENERAL', t }) => {
  const { showToast } = useToast();

  // Local Form State (Initialized with config props)
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(config.logo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLocalConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleTogglePaymentMethod = (methodId: string) => {
    const currentMethods = localConfig.paymentMethods || [];
    const newMethods = currentMethods.map(m => 
      m.id === methodId ? { ...m, isActive: !m.isActive } : m
    );
    setLocalConfig(prev => ({ ...prev, paymentMethods: newMethods }));
  };

  const handleToggleDarkMode = () => {
    // Immediate application for preview
    const newMode = !localConfig.darkMode;
    const newConfig = { ...localConfig, darkMode: newMode };
    setLocalConfig(newConfig);
    // Also apply immediately to parent for instant feedback
    onConfigChange(newConfig);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);
        setLocalConfig(prev => ({ ...prev, logo: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    StorageService.saveConfig(localConfig);
    onConfigChange(localConfig);
    showToast(t('settings.saved_success'), ToastType.SUCCESS);
  };

  // --- UI Components ---

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-6 font-sans" id="modulo-definicoes-sistema">
      
      {/* Header */}
      <div className="flex justify-between items-end shrink-0 pb-4 border-b border-gray-100 dark:border-dark-border">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text flex items-center gap-2">
            <SettingsIcon className="text-blue-600 dark:text-blue-400" />
            {t('settings.title')}
          </h1>
          <p className="text-gray-500 dark:text-dark-text-muted text-sm">{t('settings.subtitle')}</p>
        </div>
        <button 
          onClick={handleSave}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-transform active:scale-95"
        >
          <Save size={18} /> {t('settings.save')}
        </button>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        
        {/* Content Area */}
        <div className="flex-1 bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border overflow-y-auto custom-scrollbar p-8">
          
          {/* --- ADMIN: COMPANY DATA --- */}
          {initialTab === 'COMPANY' && (
            <div className="max-w-2xl space-y-6 animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-6 border-b border-gray-100 dark:border-dark-border pb-2 flex items-center gap-2">
                <Building2 size={22} className="text-blue-600 dark:text-blue-400" />
                {t('settings.tab.company')}
              </h2>
              <div className="flex gap-6 items-start">
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-dark-text-muted mb-1 tracking-wider">{t('settings.lbl.company_name')}</label>
                    <input 
                      name="companyName"
                      value={localConfig.companyName}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-dark-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-dark-text-muted mb-1 tracking-wider">Descrição da Empresa</label>
                    <input 
                      name="companyDescription"
                      value={localConfig.companyDescription || ''}
                      onChange={handleInputChange}
                      placeholder="Ex: Desenvolvedora de Software & Website"
                      className="w-full p-3 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-dark-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-dark-text-muted mb-1 tracking-wider">{t('settings.lbl.nif')}</label>
                    <input 
                      name="nif"
                      value={localConfig.nif}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-dark-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-dark-text-muted mb-1 tracking-wider">{t('settings.lbl.address')}</label>
                    <input 
                      name="companyAddress"
                      value={localConfig.companyAddress || ''}
                      onChange={handleInputChange}
                      placeholder="Ex: Av. 25 de Setembro, Maputo"
                      className="w-full p-3 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-dark-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-dark-text-muted mb-1 tracking-wider">{t('settings.lbl.contact')}</label>
                    <input 
                      name="companyContact"
                      value={localConfig.companyContact || ''}
                      onChange={handleInputChange}
                      placeholder="+258 84 ..."
                      className="w-full p-3 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-dark-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-dark-text-muted mb-1 tracking-wider">{t('settings.lbl.company_email')}</label>
                    <input 
                      name="companyEmail"
                      type="email"
                      value={localConfig.companyEmail || ''}
                      onChange={handleInputChange}
                      placeholder="empresa@exemplo.com"
                      className="w-full p-3 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-dark-text"
                    />
                  </div>
                </div>

                {/* Logo Upload */}
                <div className="w-48 flex flex-col items-center gap-3">
                  <label className="block text-sm font-bold text-gray-700 dark:text-dark-text-muted tracking-wider">{t('settings.lbl.logo')}</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-40 h-40 rounded-xl border-2 border-dashed border-gray-300 dark:border-dark-border flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors overflow-hidden relative"
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="text-gray-400 dark:text-dark-text-muted text-center p-2">
                        <ImageIcon size={32} className="mx-auto mb-2" />
                        <span className="text-xs font-bold uppercase tracking-wider">{t('settings.btn.upload')}</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleLogoUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                  <button 
                    onClick={() => { setLogoPreview(undefined); setLocalConfig(prev => ({...prev, logo: undefined})) }}
                    className="text-xs text-red-500 hover:text-red-700 font-bold uppercase tracking-wider"
                  >
                    {t('settings.btn.remove_logo')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- ADMIN: FINANCIAL --- */}
          {initialTab === 'FINANCIAL' && (
            <div className="max-w-2xl space-y-8 animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-6 border-b border-gray-100 dark:border-dark-border pb-2 flex items-center gap-2">
                <CreditCard size={22} className="text-blue-600 dark:text-blue-400" />
                Financeiro
              </h2>
              {/* Currency */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-dark-border pb-2">{t('settings.lbl.currency')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase tracking-wider mb-1">{t('settings.lbl.iso')}</label>
                    <select 
                      name="currency"
                      value={localConfig.currency}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none text-gray-900 dark:text-dark-text"
                    >
                      <option value="MT">MT (Metical)</option>
                      <option value="USD">USD (Dólar)</option>
                      <option value="ZAR">ZAR (Rand)</option>
                      <option value="EUR">EUR (Euro)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase tracking-wider mb-1">{t('settings.lbl.symbol')}</label>
                    <input 
                      name="currencySymbol"
                      value={localConfig.currencySymbol || 'MT'}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none text-gray-900 dark:text-dark-text"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-dark-border pb-2">{t('settings.lbl.payment_methods')}</h3>
                <div className="space-y-3">
                  {(localConfig.paymentMethods || []).map(method => (
                    <ToggleSwitch 
                      key={method.id}
                      label={method.name}
                      checked={method.isActive}
                      onChange={() => handleTogglePaymentMethod(method.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Financial Transaction Data */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-dark-border pb-2">{t('settings.sec.taxes')}</h3>
                <div className="space-y-4">
                  <ToggleSwitch 
                    label={t('settings.lbl.iva_enabled')}
                    description={t('settings.desc.iva_enabled')}
                    checked={!!localConfig.ivaEnabled}
                    onChange={() => setLocalConfig(prev => ({ ...prev, ivaEnabled: !prev.ivaEnabled }))}
                  />
                  {localConfig.ivaEnabled && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase tracking-wider mb-1">{t('settings.lbl.iva_rate')}</label>
                      <input 
                        type="number"
                        name="ivaRate"
                        value={localConfig.ivaRate || 0}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalConfig(prev => ({ ...prev, ivaRate: parseFloat(e.target.value) || 0 }))}
                        className="w-full p-3 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-dark-text"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Restrições do Sistema */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-dark-border pb-2">Restrições de Venda</h3>
                <div className="space-y-4">
                  <ToggleSwitch 
                    label="Restringir Produtos da Lista Negra"
                    description="Se ativado, oculta e restringe produtos da lista negra de serem exibidos e vendidos em todo o sistema."
                    checked={!!localConfig.restrictBlacklistedProducts}
                    onChange={() => setLocalConfig(prev => ({ ...prev, restrictBlacklistedProducts: !prev.restrictBlacklistedProducts }))}
                  />
                </div>
              </div>

              {/* Financial Transaction Data */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-dark-border pb-2">Dados de Transação</h3>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase tracking-wider mb-1">Informações para Transferência (M-pesa, E-mola, Bancos)</label>
                  <textarea 
                    name="financialTransactionData"
                    value={localConfig.financialTransactionData || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalConfig(prev => ({ ...prev, financialTransactionData: e.target.value }))}
                    placeholder="Ex: M-pesa: +258 84... | E-mola: +258 86... | Moza: 4770..."
                    className="w-full p-3 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-dark-text min-h-[100px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* --- GENERAL: PREFERENCES --- */}
          {initialTab === 'GENERAL' && (
            <div className="max-w-2xl space-y-8 animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-6 border-b border-gray-100 dark:border-dark-border pb-2 flex items-center gap-2">
                <SettingsIcon size={22} className="text-blue-600 dark:text-blue-400" />
                Preferências do Utilizador
              </h2>
              {/* Visual Preferences */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-dark-border pb-2">{t('settings.sec.visual')}</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                        {localConfig.darkMode ? <Moon size={20} /> : <Sun size={20} />}
                      </div>
                      <div>
                        <span className="block font-medium text-gray-900 dark:text-dark-text">{t('settings.lbl.dark_mode')}</span>
                        <span className="text-sm text-gray-500 dark:text-dark-text-muted">{t('settings.desc.dark_mode')}</span>
                      </div>
                    </div>
                    <button 
                      onClick={handleToggleDarkMode}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${localConfig.darkMode ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localConfig.darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        <Type size={20} />
                      </div>
                      <div>
                        <span className="block font-medium text-gray-900 dark:text-dark-text">{t('settings.lbl.font_size')}</span>
                        <span className="text-sm text-gray-500 dark:text-dark-text-muted">{t('settings.desc.font_size')}</span>
                      </div>
                    </div>
                    <div className="flex bg-gray-100 dark:bg-dark-bg rounded-lg p-1 border border-gray-200 dark:border-dark-border">
                      {['small', 'medium', 'large'].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setLocalConfig(prev => ({...prev, fontSize: size as 'small' | 'medium' | 'large'}))}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                            (localConfig.fontSize || 'medium') === size 
                            ? 'bg-white dark:bg-dark-card shadow-sm text-blue-600 dark:text-blue-400' 
                            : 'text-gray-500 dark:text-dark-text-muted hover:text-gray-700 dark:hover:text-dark-text'
                          }`}
                        >
                          {size === 'small' ? 'A-' : size === 'medium' ? 'A' : 'A+'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <span className="block font-medium text-gray-900 dark:text-dark-text">Tempo de Inatividade</span>
                        <span className="text-sm text-gray-500 dark:text-dark-text-muted">Minutos antes de bloquear a tela (0 para desativar)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number"
                        value={localConfig.inactivityTimeout ?? 5}
                        onChange={(e) => setLocalConfig(prev => ({...prev, inactivityTimeout: parseInt(e.target.value) || 0}))}
                        className="w-20 p-2 bg-gray-100 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm outline-none text-center font-bold"
                        min="0"
                        max="60"
                      />
                      <span className="text-xs text-gray-400 font-bold uppercase">Min</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Regional Preferences */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-dark-text uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-dark-border pb-2">{t('settings.sec.regional')}</h3>
                
                <div className="flex items-center justify-between p-4 bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                      <Globe size={20} />
                    </div>
                    <div>
                      <span className="block font-medium text-gray-900 dark:text-dark-text">{t('settings.lbl.language')}</span>
                      <span className="text-sm text-gray-500 dark:text-dark-text-muted">{t('settings.desc.language')}</span>
                    </div>
                  </div>
                  <select 
                    className="bg-gray-100 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg p-2 text-sm outline-none text-gray-900 dark:text-dark-text"
                    value={localConfig.language || 'pt'}
                    onChange={(e) => setLocalConfig(prev => ({...prev, language: e.target.value as 'pt' | 'en'}))}
                  >
                    <option value="pt">Português</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
