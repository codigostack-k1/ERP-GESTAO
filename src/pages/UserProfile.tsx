
import React, { useState } from 'react';
import { 
  User as UserIcon, 
  Shield, 
  Key, 
  Smartphone, 
  UserCircle, 
  Save, 
  AlertCircle,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { User, UserRole } from '../types';
import { StorageService } from '../services/storageService';

interface UserProfileProps {
  currentUser: User | null;
  t: (key: string) => string;
}

const UserProfile: React.FC<UserProfileProps> = ({ currentUser }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSecurityQuestions, setShowSecurityQuestions] = useState(false);
  const [securityQuestions, setSecurityQuestions] = useState([
    { question: currentUser?.securityQuestions?.[0]?.question || '', answer: '' },
    { question: currentUser?.securityQuestions?.[1]?.question || '', answer: '' }
  ]);

  if (!currentUser) return null;

  const handleSecurityQuestionsSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (securityQuestions.some(q => !q.question.trim() || !q.answer.trim())) {
      setMessage({ type: 'error', text: 'Preencha todas as perguntas e respostas.' });
      return;
    }
    StorageService.saveSecurityQuestions(currentUser.id, securityQuestions);
    setMessage({ type: 'success', text: 'Perguntas de segurança atualizadas!' });
    setShowSecurityQuestions(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    // Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Por favor, preencha todos os campos de senha.' });
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'A nova senha e a confirmação não coincidem.' });
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      setLoading(false);
      return;
    }

    // Verify current password
    const isCurrentValid = StorageService.checkPassword(currentPassword, currentUser.passwordHash || '');
    if (!isCurrentValid) {
      setMessage({ type: 'error', text: 'A senha atual está incorreta.' });
      setLoading(false);
      return;
    }

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      StorageService.changePassword(currentUser.id, newPassword, false);
      setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setMessage({ type: 'error', text: 'Erro ao alterar a senha. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserCircle className="text-blue-600" size={28} />
            Meu Perfil
          </h1>
          <p className="text-gray-500 dark:text-dark-text-muted">Gerencie suas informações pessoais e segurança da conta.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-6 text-center">
            <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-4 border-4 border-white dark:border-dark-card shadow-lg">
              <UserIcon size={48} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{currentUser.name}</h2>
            <p className="text-sm text-gray-500 dark:text-dark-text-muted font-medium">@{currentUser.username}</p>
            
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-dark-border space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-dark-text">
                <Shield size={16} className="text-blue-500" />
                <span className="font-semibold">Perfil:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  currentUser.role === UserRole.ADMIN 
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {currentUser.role === UserRole.ADMIN ? 'Administrador' : 'Vendedor'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-dark-text">
                <Smartphone size={16} className="text-blue-500" />
                <span className="font-semibold">Contacto:</span>
                <span>{currentUser.contact || 'Não informado'}</span>
              </div>
            </div>
          </div>

          <div className="card p-6 bg-blue-600 text-white">
            <h3 className="font-bold flex items-center gap-2 mb-2">
              <Lock size={18} />
              Segurança
            </h3>
            <p className="text-xs text-blue-100 leading-relaxed">
              Mantenha sua senha segura e não a compartilhe com ninguém. Recomendamos alterar sua senha a cada 90 dias.
            </p>
          </div>
        </div>

        {/* Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Key className="text-blue-600" size={20} />
              Alterar Senha
            </h3>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1">Senha Atual</label>
                  <input 
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input-field"
                    placeholder="Digite sua senha atual"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1">Nova Senha</label>
                  <input 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1">Confirmar Nova Senha</label>
                  <input 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                    placeholder="Repita a nova senha"
                  />
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 ${
                  message.type === 'success' 
                    ? 'bg-green-50 text-green-700 border border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30' 
                    : 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  {message.text}
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-primary flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Salvar Nova Senha
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="text-blue-600" size={20} />
                Recuperação de Conta
              </h3>
              <button 
                onClick={() => setShowSecurityQuestions(!showSecurityQuestions)}
                className="text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                {showSecurityQuestions ? 'Cancelar' : (currentUser.securityQuestions?.length ? 'Alterar Perguntas' : 'Configurar Perguntas')}
              </button>
            </div>

            {showSecurityQuestions ? (
              <form onSubmit={handleSecurityQuestionsSave} className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <p className="text-sm text-gray-500 dark:text-dark-text-muted mb-4 uppercase text-[10px] font-bold tracking-wider">
                  Defina perguntas que só você saiba a resposta para recuperar sua conta caso esqueça a senha.
                </p>
                
                {securityQuestions.map((q, idx) => (
                  <div key={idx} className="space-y-2 p-4 bg-gray-50 dark:bg-dark-bg rounded-xl border border-gray-100 dark:border-dark-border">
                    <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase">Pergunta {idx + 1}</label>
                    <input 
                      type="text"
                      value={q.question}
                      onChange={(e) => {
                        const newQ = [...securityQuestions];
                        newQ[idx].question = e.target.value;
                        setSecurityQuestions(newQ);
                      }}
                      className="input-field mb-2"
                      placeholder="Ex: Qual o nome do seu primeiro animal?"
                    />
                    <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase">Resposta {idx + 1}</label>
                    <input 
                      type="text"
                      value={q.answer}
                      onChange={(e) => {
                        const newQ = [...securityQuestions];
                        newQ[idx].answer = e.target.value;
                        setSecurityQuestions(newQ);
                      }}
                      className="input-field"
                      placeholder="Sua resposta secreta"
                    />
                  </div>
                ))}

                <div className="flex justify-end">
                  <button type="submit" className="btn-primary flex items-center gap-2">
                    <Save size={18} />
                    Salvar Perguntas
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-900 dark:text-blue-300">
                    {currentUser.securityQuestions?.length ? 'Perguntas de Segurança Ativas' : 'Perguntas de Segurança não configuradas'}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    {currentUser.securityQuestions?.length 
                      ? 'Você pode usar estas perguntas para recuperar o acesso à sua conta.' 
                      : 'Configure suas perguntas para permitir a recuperação de conta.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="text-blue-600" size={20} />
              Permissões Ativas
            </h3>
            <div className="flex flex-wrap gap-2">
              {currentUser.role === UserRole.ADMIN ? (
                <span className="px-3 py-1.5 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 rounded-lg text-xs font-bold border border-purple-100 dark:border-purple-900/30">
                  ACESSO TOTAL (ADMINISTRADOR)
                </span>
              ) : (
                currentUser.customPermissions?.map(perm => (
                  <span key={perm} className="px-3 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg text-xs font-bold border border-blue-100 dark:border-blue-900/30">
                    {perm.replace('VIEW_', '').replace('_', ' ')}
                  </span>
                ))
              )}
              {(!currentUser.customPermissions || currentUser.customPermissions.length === 0) && currentUser.role !== UserRole.ADMIN && (
                <p className="text-sm text-gray-500 italic">Nenhuma permissão específica atribuída.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
