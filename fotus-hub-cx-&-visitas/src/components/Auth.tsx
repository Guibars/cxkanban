import { FormEvent, ReactNode, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, LoaderCircle, LockKeyhole, Mail, Send, UserRound } from 'lucide-react';
import { neonAuth } from '../lib/neonAuth';

const LOGIN_BACKGROUND = 'https://res.cloudinary.com/dsctpzqvy/image/upload/v1787849943/ChatGPT_Image_27_de_ago._de_2026_14_t1lv54.png';
const LOGIN_LOGO = 'https://res.cloudinary.com/dsctpzqvy/image/upload/v1787849891/ChatGPT_Image_27_de_ago._de_2026_13_58_03_l7q8kp.png';
type Mode = 'login' | 'register' | 'reset' | 'new-password';

function authErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
  const text = raw.toLowerCase();
  if (text.includes('invalid') && (text.includes('password') || text.includes('credential'))) return 'E-mail ou senha incorretos.';
  if (text.includes('not found') || text.includes('user_not_found')) return 'Conta não encontrada. Use “Primeiro acesso” para criar sua conta corporativa.';
  if (text.includes('already') || text.includes('exists')) return 'Este e-mail já possui uma conta. Entre normalmente ou redefina a senha.';
  if (text.includes('not allowed') || text.includes('não foi liberado') || text.includes('sign up')) return 'Use seu e-mail corporativo @fotus.com.br ou procure um operador mestre.';
  if (text.includes('origin')) return 'Este endereço ainda não está autorizado no Neon Auth.';
  if (text.includes('request failed') || text.includes('reason:')) return 'O Neon recusou a criação da conta. Confira o e-mail e tente novamente.';
  return raw || 'Não foi possível concluir. Confira os dados e tente novamente.';
}

function clearAccessQuery() {
  window.history.replaceState({}, '', window.location.pathname);
}

export default function Auth() {
  const initial = useMemo(() => new URLSearchParams(window.location.search), []);
  const resetToken = initial.get('token') || '';
  const [mode, setMode] = useState<Mode>(resetToken ? 'new-password' : initial.get('firstAccess') === '1' ? 'register' : initial.get('reset') === '1' ? 'reset' : 'login');
  const [email, setEmail] = useState(initial.get('email') || '');
  const [name, setName] = useState(initial.get('name') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState<'email' | 'google' | 'reset' | 'register' | 'new-password' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const changeMode = (next: Mode) => {
    setMode(next);
    setErrorMessage('');
    setSuccessMessage('');
    setPassword('');
    setConfirmPassword('');
    if (next === 'login') clearAccessQuery();
  };

  const handleEmailLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoading('email');
    setErrorMessage('');
    try {
      const result = await neonAuth.signIn.email({ email: email.trim().toLowerCase(), password, rememberMe: true });
      if (result.error) throw new Error(result.error.message || 'Não foi possível entrar.');
    } catch (error) {
      setErrorMessage(authErrorMessage(error));
    } finally {
      setLoading(null);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading('google');
    setErrorMessage('');
    try {
      const result = await neonAuth.signIn.social({ provider: 'google', callbackURL: window.location.origin });
      if (result.error) throw new Error(result.error.message || 'Não foi possível entrar com Google.');
    } catch (error) {
      setErrorMessage(authErrorMessage(error));
      setLoading(null);
    }
  };

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (password.length < 8) return setErrorMessage('A senha precisa ter pelo menos 8 caracteres.');
    if (password !== confirmPassword) return setErrorMessage('As senhas digitadas não são iguais.');
    setLoading('register');
    setErrorMessage('');
    try {
      const accessResponse = await fetch('/api/registration-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, name: name.trim() }),
      });
      const access = await accessResponse.json().catch(() => ({})) as { allowed?: boolean; error?: string };
      if (!accessResponse.ok) throw new Error(access.error || 'Não foi possível confirmar a liberação deste e-mail.');
      if (!access.allowed) throw new Error(access.error || 'Use seu e-mail corporativo @fotus.com.br.');
      const result = await neonAuth.signUp.email({
        email: normalizedEmail,
        name: name.trim(),
        password,
        callbackURL: window.location.origin,
      });
      if (result.error) throw new Error(result.error.message || 'Não foi possível criar a conta.');
      clearAccessQuery();
      setSuccessMessage('Senha criada com sucesso. Sua conta Neon já está pronta.');
    } catch (error) {
      setErrorMessage(authErrorMessage(error));
    } finally {
      setLoading(null);
    }
  };

  const handlePasswordReset = async (event: FormEvent) => {
    event.preventDefault();
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) return setErrorMessage('Digite seu e-mail para solicitar a redefinição.');
    setLoading('reset');
    setErrorMessage('');
    try {
      const redirectTo = `${window.location.origin}/?newPassword=1`;
      const result = await neonAuth.requestPasswordReset({ email: targetEmail, redirectTo });
      if (result.error) throw new Error(result.error.message || 'Não foi possível enviar o e-mail.');
      setSuccessMessage('Solicitação enviada pelo Neon. Confira a caixa de entrada, o spam e a quarentena.');
    } catch (error) {
      setErrorMessage(authErrorMessage(error));
    } finally {
      setLoading(null);
    }
  };

  const handleNewPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!resetToken) return setErrorMessage('Este link de redefinição está incompleto. Solicite um novo e-mail.');
    if (password.length < 8) return setErrorMessage('A senha precisa ter pelo menos 8 caracteres.');
    if (password !== confirmPassword) return setErrorMessage('As senhas digitadas não são iguais.');
    setLoading('new-password');
    setErrorMessage('');
    try {
      const result = await neonAuth.resetPassword({ newPassword: password, token: resetToken });
      if (result.error) throw new Error(result.error.message || 'Não foi possível redefinir a senha.');
      clearAccessQuery();
      setMode('login');
      setSuccessMessage('Senha alterada. Agora você já pode entrar.');
    } catch (error) {
      setErrorMessage(authErrorMessage(error));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f4f7f4] font-sans text-gray-900 lg:grid lg:grid-cols-[minmax(460px,47%)_1fr]">
      <section className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-md rounded-[32px] border border-white bg-white/80 p-6 shadow-[0_28px_80px_rgba(41,61,48,0.12)] backdrop-blur-xl sm:p-8">
          <img src={LOGIN_LOGO} alt="Fotus" className="mx-auto h-24 w-auto object-contain" />
          {errorMessage && <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{errorMessage}</p></div>}
          {successMessage && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold leading-relaxed text-emerald-800">{successMessage}</div>}

          {mode !== 'login' && <button type="button" onClick={() => changeMode('login')} disabled={loading !== null} className="mt-6 flex items-center gap-2 text-xs font-bold text-[#385041]"><ArrowLeft className="h-4 w-4" />Voltar para o login</button>}

          {mode === 'login' && <>
            <form onSubmit={handleEmailLogin} className="mt-7 space-y-4">
              <Input icon={Mail} label="E-mail"><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@fotus.com.br" className="auth-input" /></Input>
              <Input icon={LockKeyhole} label="Senha"><input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" className="auth-input" /></Input>
              <div className="flex justify-between gap-3"><button type="button" onClick={() => changeMode('register')} className="text-xs font-bold text-[#385041] hover:underline">Primeiro acesso</button><button type="button" onClick={() => changeMode('reset')} className="text-xs font-bold text-[#385041] hover:underline">Esqueci minha senha</button></div>
              <PrimaryButton loading={loading === 'email'} label="Entrar" loadingLabel="Entrando..." />
            </form>
            <Divider />
            <button type="button" onClick={handleGoogleLogin} disabled={loading !== null} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60">
              {loading === 'google' ? <LoaderCircle className="h-5 w-5 animate-spin text-[#385041]" /> : <GoogleIcon />}{loading === 'google' ? 'Conectando...' : 'Continuar com Google'}
            </button>
          </>}

          {mode === 'register' && <form onSubmit={handleRegister} className="mt-5 space-y-4">
            <Intro title="Criar minha senha" text="Disponível para todos os colaboradores com e-mail corporativo @fotus.com.br." />
            <Input icon={UserRound} label="Nome completo"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" className="auth-input" /></Input>
            <Input icon={Mail} label="E-mail corporativo"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@fotus.com.br" className="auth-input" /></Input>
            <PasswordPair password={password} confirmPassword={confirmPassword} setPassword={setPassword} setConfirmPassword={setConfirmPassword} />
            <PrimaryButton loading={loading === 'register'} label="Criar senha e entrar" loadingLabel="Criando conta..." />
          </form>}

          {mode === 'reset' && <form onSubmit={handlePasswordReset} className="mt-5 space-y-4">
            <Intro title="Redefinir minha senha" text="O Neon enviará o link de recuperação para o e-mail informado." />
            <Input icon={Mail} label="E-mail para redefinição"><input autoFocus required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@fotus.com.br" className="auth-input" /></Input>
            <button type="submit" disabled={loading !== null} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#385041] px-5 py-4 text-sm font-bold text-white disabled:opacity-65">{loading === 'reset' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{loading === 'reset' ? 'Enviando...' : 'Enviar link de redefinição'}</button>
          </form>}

          {mode === 'new-password' && <form onSubmit={handleNewPassword} className="mt-5 space-y-4">
            <Intro title="Escolher nova senha" text="Crie uma senha com pelo menos 8 caracteres." />
            <PasswordPair password={password} confirmPassword={confirmPassword} setPassword={setPassword} setConfirmPassword={setConfirmPassword} />
            <PrimaryButton loading={loading === 'new-password'} label="Salvar nova senha" loadingLabel="Salvando..." />
          </form>}
        </div>
      </section>
      <section className="relative hidden min-h-screen overflow-hidden lg:block"><div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${LOGIN_BACKGROUND})` }} /><div className="absolute inset-0 bg-[#1d2d24]/35" /></section>
    </div>
  );
}

function Input({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-gray-700">{label}</span><span className="relative block"><Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />{children}</span></label>;
}

function PasswordPair({ password, confirmPassword, setPassword, setConfirmPassword }: { password: string; confirmPassword: string; setPassword: (value: string) => void; setConfirmPassword: (value: string) => void }) {
  return <><Input icon={LockKeyhole} label="Senha"><input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" className="auth-input" /></Input><Input icon={LockKeyhole} label="Confirmar senha"><input required minLength={8} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Digite novamente" className="auth-input" /></Input></>;
}

function Intro({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl bg-[#f2f6ef] p-4"><h1 className="text-base font-extrabold text-[#26382d]">{title}</h1><p className="mt-1 text-xs leading-relaxed text-gray-600">{text}</p></div>;
}

function PrimaryButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return <button type="submit" disabled={loading} className="flex w-full items-center justify-between rounded-2xl bg-[#385041] px-5 py-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(56,80,65,0.22)] disabled:opacity-65"><span className="flex items-center gap-2">{loading && <LoaderCircle className="h-4 w-4 animate-spin" />}{loading ? loadingLabel : label}</span><ArrowRight className="h-5 w-5" /></button>;
}

function Divider() { return <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-gray-200" /><small className="text-[10px] font-bold uppercase tracking-wider text-gray-400">ou</small><span className="h-px flex-1 bg-gray-200" /></div>; }
function GoogleIcon() { return <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white"><svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09A6.7 6.7 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg></span>; }
