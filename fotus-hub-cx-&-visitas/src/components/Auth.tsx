import { FormEvent, useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Headphones, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import {
  auth,
  browserLocalPersistence,
  googleProvider,
  getRedirectResult,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from '../lib/firebase';
import { isAuthorizedEmail } from '../lib/auth';

const LOGIN_BACKGROUND = 'https://res.cloudinary.com/dsctpzqvy/image/upload/v1787849943/ChatGPT_Image_27_de_ago._de_2026_14_t1lv54.png';
const LOGIN_LOGO = 'https://res.cloudinary.com/dsctpzqvy/image/upload/v1787849891/ChatGPT_Image_27_de_ago._de_2026_13_58_03_l7q8kp.png';

function getLoginErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code.includes('unauthorized-domain')) return 'Este endereço da Vercel ainda não foi autorizado no Firebase. Adicione o domínio em Authentication > Settings > Authorized domains.';
  if (code.includes('popup-closed-by-user')) return 'A janela do Google foi fechada antes da conclusão.';
  if (code.includes('popup-blocked')) return 'O navegador bloqueou a janela do Google. Libere pop-ups para este site.';
  if (code.includes('cancelled-popup-request')) return 'Já existe uma tentativa de login em andamento.';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'E-mail ou senha incorretos.';
  if (code.includes('user-disabled')) return 'Esta conta foi desativada no Firebase.';
  if (code.includes('too-many-requests')) return 'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.';
  if (code.includes('operation-not-allowed')) return 'O acesso com e-mail e senha precisa ser ativado no Firebase Authentication.';
  return 'Não foi possível entrar. Confira seus dados e tente novamente.';
}

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingMethod, setLoadingMethod] = useState<'email' | 'google' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    getRedirectResult(auth).catch((error) => setErrorMessage(getLoginErrorMessage(error)));
  }, []);

  const validateAuthorizedUser = async (userEmail: string | null) => {
    if (isAuthorizedEmail(userEmail)) return true;
    await auth.signOut();
    setErrorMessage('Acesso não autorizado. Use um e-mail @fotus.com.br ou a conta de desenvolvimento liberada.');
    return false;
  };

  const handleEmailLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoadingMethod('email');
    setErrorMessage('');
    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      await validateAuthorizedUser(result.user.email);
    } catch (error) {
      console.error('Erro ao entrar com e-mail e senha:', error);
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setLoadingMethod(null);
    }
  };

  const handleGoogleLogin = async () => {
    setLoadingMethod('google');
    setErrorMessage('');
    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, googleProvider);
      await validateAuthorizedUser(result.user.email);
    } catch (error) {
      console.error('Erro ao fazer login com Google:', error);
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
      if (code.includes('popup-blocked') || code.includes('cancelled-popup-request')) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setLoadingMethod(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f4f7f4] font-sans text-gray-900 lg:grid lg:grid-cols-[minmax(460px,47%)_1fr]">
      <section className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-md rounded-[32px] border border-white bg-white/80 p-6 shadow-[0_28px_80px_rgba(41,61,48,0.12)] backdrop-blur-xl sm:p-8">
          <div className="text-center">
            <img src={LOGIN_LOGO} alt="Fotus" className="mx-auto h-24 w-auto object-contain" />
            <span className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-[#385041]/10 bg-[#eef5eb] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#385041]"><Headphones className="h-3.5 w-3.5" />CX</span>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-gray-950 sm:text-3xl">Entre para uma nova experiência CX</h1>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-gray-500">Acesse sua rotina, seus controles e os insights do time em um só lugar.</p>
          </div>

          {errorMessage && <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{errorMessage}</p></div>}

          <form onSubmit={handleEmailLogin} className="mt-7 space-y-4">
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-gray-700">E-mail</span><span className="relative block"><Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@fotus.com.br" className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10" /></span></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-gray-700">Senha</span><span className="relative block"><LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-[#385041] focus:ring-2 focus:ring-[#385041]/10" /></span></label>
            <button type="submit" disabled={loadingMethod !== null} className="flex w-full items-center justify-between rounded-2xl bg-[#385041] px-5 py-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(56,80,65,0.22)] transition-all hover:bg-[#2c4033] disabled:cursor-wait disabled:opacity-65"><span className="flex items-center gap-2">{loadingMethod === 'email' && <LoaderCircle className="h-4 w-4 animate-spin" />}{loadingMethod === 'email' ? 'Entrando...' : 'Entrar'}</span><ArrowRight className="h-5 w-5" /></button>
          </form>

          <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-gray-200" /><small className="text-[10px] font-bold uppercase tracking-wider text-gray-400">ou</small><span className="h-px flex-1 bg-gray-200" /></div>

          <button type="button" onClick={handleGoogleLogin} disabled={loadingMethod !== null} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:border-[#385041]/20 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-65">
            {loadingMethod === 'google' ? <LoaderCircle className="h-5 w-5 animate-spin text-[#385041]" /> : <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white"><svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09A6.7 6.7 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg></span>}
            {loadingMethod === 'google' ? 'Conectando...' : 'Continuar com Google'}
          </button>
        </div>
      </section>

      <section className="relative hidden min-h-screen overflow-hidden lg:block">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${LOGIN_BACKGROUND})` }} />
        <div className="absolute inset-0 bg-[#1d2d24]/35" />
      </section>
    </div>
  );
}
